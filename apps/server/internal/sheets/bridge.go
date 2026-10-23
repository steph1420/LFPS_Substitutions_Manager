package sheets

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sort"
	"strconv"
	"sync"
	"time"

	"lfps/server/internal/livesync"
)

// SubsHeader is the app-owned Subs tab's header row. The first column is the entity key,
// so rows are upserted in place and nothing is ever deleted (a removed substitution keeps
// its row with Status REMOVED).
var SubsHeader = []string{"Key", "Date", "Day", "Period", "Absent Teacher", "Substitute", "Class", "Subject",
	"Status", "Note", "Updated At", "Updated By", "App Version", "Revision"}

// MetaHeader is the App_Meta header row (key/value pairs follow).
var MetaHeader = []string{"Key", "Value"}

// LogHeader is the optional App_Log header row.
var LogHeader = []string{"Time", "Event", "Rows", "App Version"}

// SchemaVersion of the app-owned tabs.
const SchemaVersion = "1"

// Tab is one pulled read-only tab.
type Tab struct {
	Name string     `json:"name"`
	Rows [][]string `json:"rows"`
}

// Snapshot is the read-only part of the Sheet, streamed to devices.
type Snapshot struct {
	FetchedAt  int64  `json:"fetchedAt"`
	Hash       string `json:"hash"`
	Tabs       []Tab  `json:"tabs"`
	HiddenTabs int    `json:"hiddenTabs"` // count only; hidden tabs are not pulled
}

// Source is what the bridge needs from the live store.
type Source interface {
	Substitutions() []livesync.SubRecord
	Location() *time.Location
}

// Config for the bridge.
type Config struct {
	AppVersion   string
	PullInterval time.Duration // default 5 min
	Debounce     time.Duration // quiet time before a flush, default 2 s
	MaxDelay     time.Duration // longest a change waits while edits keep coming, default 15 s
	MaxBackoff   time.Duration // default 5 min
	Log          bool          // also append a row to App_Log per flush
	Now          func() time.Time
	// OnSnapshot is called (from the bridge goroutine) when the read-only tabs change.
	OnSnapshot func(Snapshot)
}

// Status is the bridge's state for /health and devices.
type Status struct {
	State     string `json:"state"` // starting | ok | error
	LastPull  int64  `json:"lastPull,omitempty"`
	LastWrite int64  `json:"lastWrite,omitempty"`
	Error     string `json:"error,omitempty"`
}

// Bridge pulls the read-only tabs and writes the app-owned tabs.
type Bridge struct {
	api    guard
	src    Source
	cfg    Config
	notify chan struct{}

	mu       sync.Mutex
	status   Status
	snapshot *Snapshot
	ready    bool // app-owned tabs exist and are verified
}

// New wraps api with the write allowlist.
func New(api API, src Source, cfg Config) *Bridge {
	if cfg.PullInterval <= 0 {
		cfg.PullInterval = 5 * time.Minute
	}
	if cfg.Debounce <= 0 {
		cfg.Debounce = 2 * time.Second
	}
	if cfg.MaxDelay <= 0 {
		cfg.MaxDelay = 15 * time.Second
	}
	if cfg.MaxBackoff <= 0 {
		cfg.MaxBackoff = 5 * time.Minute
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	return &Bridge{api: guard{api}, src: src, cfg: cfg, notify: make(chan struct{}, 1), status: Status{State: "starting"}}
}

// Status returns a copy of the bridge state.
func (b *Bridge) Status() Status {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.status
}

// Snapshot returns the last pulled read-only tabs (nil before the first pull).
func (b *Bridge) Snapshot() *Snapshot {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.snapshot
}

// NotifyChanged schedules a debounced write. Never blocks.
func (b *Bridge) NotifyChanged() {
	select {
	case b.notify <- struct{}{}:
	default:
	}
}

func (b *Bridge) setErr(err error) {
	b.mu.Lock()
	b.status.State, b.status.Error = "error", err.Error()
	b.mu.Unlock()
}

func (b *Bridge) setOK(pull, write bool) {
	b.mu.Lock()
	b.status.State, b.status.Error = "ok", ""
	now := b.cfg.Now().UnixMilli()
	if pull {
		b.status.LastPull = now
	}
	if write {
		b.status.LastWrite = now
	}
	b.mu.Unlock()
}

// Pull reads every visible tab the app does not own (the owner's tabs and the legacy
// tabs) and publishes a snapshot when anything changed.
func (b *Bridge) Pull(ctx context.Context) (Snapshot, error) {
	tabs, err := b.api.Tabs(ctx)
	if err != nil {
		return Snapshot{}, err
	}
	snap := Snapshot{FetchedAt: b.cfg.Now().UnixMilli()}
	for _, t := range tabs {
		if Writable(t.Title) {
			continue
		}
		if t.Hidden {
			snap.HiddenTabs++
			continue
		}
		rows, err := b.api.Read(ctx, t.Title)
		if err != nil {
			return Snapshot{}, fmt.Errorf("read %q: %w", t.Title, err)
		}
		snap.Tabs = append(snap.Tabs, Tab{Name: t.Title, Rows: rows})
	}
	raw, _ := json.Marshal(snap.Tabs)
	sum := sha256.Sum256(raw)
	snap.Hash = hex.EncodeToString(sum[:8])

	b.mu.Lock()
	changed := b.snapshot == nil || b.snapshot.Hash != snap.Hash
	b.snapshot = &snap
	b.mu.Unlock()
	b.setOK(true, false)
	if changed && b.cfg.OnSnapshot != nil {
		b.cfg.OnSnapshot(snap)
	}
	return snap, nil
}

// ErrNotAppOwned means a tab with an app-owned name exists but doesn't look like ours
// (for example the owner made a "Subs" tab by hand). The bridge then refuses to write it.
var ErrNotAppOwned = errors.New("sheets: tab exists but is not app-owned (unexpected header)")

func sameHeader(row, header []string) bool {
	if len(row) < len(header) {
		return false
	}
	for i, h := range header {
		if row[i] != h {
			return false
		}
	}
	return true
}

// EnsureTabs creates the app-owned tabs that are missing and writes their header rows.
// An existing tab is used only when it is empty or carries our header.
func (b *Bridge) EnsureTabs(ctx context.Context) error {
	tabs, err := b.api.Tabs(ctx)
	if err != nil {
		return err
	}
	have := map[string]bool{}
	for _, t := range tabs {
		have[t.Title] = true
	}
	want := []struct {
		name   string
		header []string
	}{{TabSubs, SubsHeader}, {TabMeta, MetaHeader}}
	if b.cfg.Log {
		want = append(want, struct {
			name   string
			header []string
		}{TabLog, LogHeader})
	}
	for _, w := range want {
		if !have[w.name] {
			if err := b.api.CreateTab(ctx, w.name); err != nil {
				return fmt.Errorf("create %s: %w", w.name, err)
			}
			log.Printf("[Sheets] Created app-owned tab %q", w.name)
		} else {
			rows, err := b.api.Read(ctx, w.name)
			if err != nil {
				return fmt.Errorf("read %s: %w", w.name, err)
			}
			if len(rows) > 0 {
				if !sameHeader(rows[0], w.header) {
					return fmt.Errorf("%w: %s", ErrNotAppOwned, w.name)
				}
				continue
			}
		}
		if err := b.api.Write(ctx, w.name, [][]string{w.header}); err != nil {
			return fmt.Errorf("header %s: %w", w.name, err)
		}
	}
	b.mu.Lock()
	b.ready = true
	b.mu.Unlock()
	return nil
}

func (b *Bridge) stamp(ms int64) string {
	if ms <= 0 {
		return ""
	}
	return time.UnixMilli(ms).In(b.src.Location()).Format("2006-01-02 15:04:05")
}

func subRow(r livesync.SubRecord, b *Bridge) []string {
	status, note := r.Sub.Status, r.Sub.Remark
	if r.Deleted {
		status = "REMOVED"
	}
	if r.Sub.DisputeRemark != "" {
		if note != "" {
			note += " · "
		}
		note += "Dispute: " + r.Sub.DisputeRemark
	}
	by := r.Sub.AssignedBy
	if by == "" {
		by = r.By
	}
	return []string{r.Key, r.Date, r.Sub.Day, r.Sub.Period, r.Sub.OriginalTeacher, r.Sub.SubstituteTeacher,
		r.Sub.ClassName, r.Sub.Subject, status, note, b.stamp(r.TS), by, b.cfg.AppVersion, strconv.FormatInt(r.Rev, 10)}
}

// Flush upserts the Subs tab, rewrites App_Meta and optionally logs. Rows are matched on
// Key; rows of earlier weeks stay as they are.
func (b *Bridge) Flush(ctx context.Context) error {
	b.mu.Lock()
	ready := b.ready
	b.mu.Unlock()
	if !ready {
		if err := b.EnsureTabs(ctx); err != nil {
			return err
		}
	}
	existing, err := b.api.Read(ctx, TabSubs)
	if err != nil {
		return fmt.Errorf("read Subs: %w", err)
	}
	if len(existing) == 0 {
		existing = [][]string{SubsHeader}
	} else if !sameHeader(existing[0], SubsHeader) {
		return fmt.Errorf("%w: %s", ErrNotAppOwned, TabSubs)
	}
	index := map[string]int{}
	for i, row := range existing {
		if i > 0 && len(row) > 0 {
			index[row[0]] = i
		}
	}
	subs := b.src.Substitutions()
	sort.Slice(subs, func(i, j int) bool {
		if subs[i].Date != subs[j].Date {
			return subs[i].Date < subs[j].Date
		}
		return subs[i].Key < subs[j].Key
	})
	changed := 0
	for _, r := range subs {
		row := subRow(r, b)
		if i, ok := index[r.Key]; ok {
			if equalRows(existing[i], row) {
				continue
			}
			existing[i] = row
		} else {
			existing = append(existing, row)
			index[r.Key] = len(existing) - 1
		}
		changed++
	}
	if changed > 0 {
		if err := b.api.Write(ctx, TabSubs, padRows(existing, len(SubsHeader))); err != nil {
			return fmt.Errorf("write Subs: %w", err)
		}
	}
	if err := b.WriteMeta(ctx); err != nil {
		return err
	}
	if b.cfg.Log && changed > 0 {
		row := []string{b.stamp(b.cfg.Now().UnixMilli()), "flush", strconv.Itoa(changed), b.cfg.AppVersion}
		if err := b.api.Append(ctx, TabLog, [][]string{row}); err != nil {
			return fmt.Errorf("append App_Log: %w", err)
		}
	}
	b.setOK(false, true)
	return nil
}

// WriteMeta rewrites App_Meta: schema version, app version, last write time.
func (b *Bridge) WriteMeta(ctx context.Context) error {
	st := b.Status()
	now := b.cfg.Now().UnixMilli()
	rows := [][]string{
		MetaHeader,
		{"schema_version", SchemaVersion},
		{"app_version", b.cfg.AppVersion},
		{"last_updated", b.stamp(now)},
		{"last_pull", b.stamp(st.LastPull)},
		{"writer", "LFPS relay (service account)"},
	}
	if err := b.api.Write(ctx, TabMeta, rows); err != nil {
		return fmt.Errorf("write App_Meta: %w", err)
	}
	return nil
}

func equalRows(a, b []string) bool {
	if len(a) > len(b) {
		a, b = b, a
	}
	for i := range b {
		x := ""
		if i < len(a) {
			x = a[i]
		}
		if x != b[i] {
			return false
		}
	}
	return true
}

func padRows(rows [][]string, n int) [][]string {
	out := make([][]string, len(rows))
	for i, r := range rows {
		p := make([]string, n)
		copy(p, r)
		out[i] = p
	}
	return out
}

// Run starts the pull loop and the write loop. It returns when ctx is done.
func (b *Bridge) Run(ctx context.Context) {
	if _, err := b.Pull(ctx); err != nil {
		log.Printf("[Sheets] Initial pull failed: %v", err)
		b.setErr(err)
	}
	if err := b.EnsureTabs(ctx); err != nil {
		log.Printf("[Sheets] Could not prepare app-owned tabs: %v", err)
		b.setErr(err)
	} else if err := b.WriteMeta(ctx); err != nil {
		log.Printf("[Sheets] %v", err)
		b.setErr(err)
	}
	go b.pullLoop(ctx)
	b.writeLoop(ctx)
}

func (b *Bridge) pullLoop(ctx context.Context) {
	t := time.NewTicker(b.cfg.PullInterval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if _, err := b.Pull(ctx); err != nil {
				log.Printf("[Sheets] Pull failed: %v", err)
				b.setErr(err)
			}
		}
	}
}

func (b *Bridge) writeLoop(ctx context.Context) {
	backoff := time.Duration(0)
	for {
		// Wait for a change (or a retry).
		if backoff == 0 {
			select {
			case <-ctx.Done():
				return
			case <-b.notify:
			}
		} else {
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}
		}
		// Debounce: wait for a quiet spell, but never longer than MaxDelay.
		deadline := time.NewTimer(b.cfg.MaxDelay)
	debounce:
		for {
			quiet := time.NewTimer(b.cfg.Debounce)
			select {
			case <-ctx.Done():
				quiet.Stop()
				deadline.Stop()
				return
			case <-b.notify:
				quiet.Stop()
				continue
			case <-quiet.C:
				break debounce
			case <-deadline.C:
				quiet.Stop()
				break debounce
			}
		}
		deadline.Stop()
		if err := b.Flush(ctx); err != nil {
			if errors.Is(err, ErrNotAppOwned) {
				// Retrying won't help until the owner fixes the tab; stay in error until the next change.
				log.Printf("[Sheets] Write refused: %v", err)
				b.setErr(err)
				backoff = 0
				continue
			}
			backoff = nextBackoff(backoff, b.cfg.MaxBackoff)
			log.Printf("[Sheets] Write failed, retrying in %s: %v", backoff, err)
			b.setErr(err)
			continue
		}
		backoff = 0
	}
}

func nextBackoff(cur, max time.Duration) time.Duration {
	if cur <= 0 {
		return time.Second
	}
	cur *= 2
	if cur > max {
		return max
	}
	return cur
}
