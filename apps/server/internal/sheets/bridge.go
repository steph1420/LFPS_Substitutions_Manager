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

// SubsHeader is the app-owned Subs tab's header row (schema 2, Bundle 35a).
//
//   - Key (column A) is the stable entity key "sub|<date>|<id>". Rows are upserted in place
//     by Key, so writing the same state twice changes nothing (idempotent), and rows are
//     never deleted.
//   - Date … App Version are for people.
//   - Deleted At, Version TS, Version By and Payload make the row a lossless copy of the
//     synced entity, so the relay can reload the week after a restart (Rehydrate).
//     Version TS/By are the entity's LWW version (device clock in Unix ms, device id).
//   - A deleted substitution is a tombstone: Status REMOVED, Deleted At set, Payload empty.
//     It is reloaded as a deletion, so a device's older copy can't bring it back.
var SubsHeader = []string{"Key", "Date", "Day", "Period", "Absent Teacher", "Substitute", "Class", "Subject",
	"Status", "Note", "Updated At", "Updated By", "App Version", "Deleted At", "Version TS", "Version By", "Payload"}

// SubsHeaderV1 is the schema-1 header (Bundle 35). EnsureTabs upgrades it in place.
var SubsHeaderV1 = []string{"Key", "Date", "Day", "Period", "Absent Teacher", "Substitute", "Class", "Subject",
	"Status", "Note", "Updated At", "Updated By", "App Version", "Revision"}

// Subs column indexes (0-based).
const (
	colDate       = 1
	colStatus     = 8
	colUpdatedBy  = 11
	colAppVersion = 12
	colDeletedAt  = 13
	colTS         = 14
	colBy         = 15
	colPayload    = 16
	v1DataCols    = 13 // v1 columns kept by the upgrade (Revision is dropped)
)

// StatusRemoved marks a tombstone row.
const StatusRemoved = "REMOVED"

// MaxPayloadCell keeps a Payload cell under the Sheets limit of 50,000 characters.
const MaxPayloadCell = 45000

// MetaHeader is the App_Meta header row (key/value pairs follow).
var MetaHeader = []string{"Key", "Value"}

// LogHeader is the optional App_Log header row.
var LogHeader = []string{"Time", "Event", "Rows", "App Version"}

// SchemaVersion of the app-owned tabs.
const SchemaVersion = "2"

// Tab is one pulled read-only tab.
type Tab struct {
	Name string     `json:"name"`
	Rows [][]string `json:"rows"`
}

// Snapshot is the read-only part of the Sheet, streamed to devices.
//
// Hash is the data version: a digest of the pulled tabs. Devices keep the hash and
// FetchedAt of the data they applied, and the relay records it in App_Meta (data_version).
type Snapshot struct {
	FetchedAt  int64  `json:"fetchedAt"`
	Hash       string `json:"hash"`
	AppVersion string `json:"appVersion,omitempty"` // the relay's version
	Tabs       []Tab  `json:"tabs"`
	HiddenTabs int    `json:"hiddenTabs"` // count only; hidden tabs are not pulled
}

// Source is what the bridge needs from the live store.
type Source interface {
	Substitutions() []livesync.SubRecord
	Location() *time.Location
	// Accepts reports whether the store would take key now (the active school week).
	Accepts(key string) bool
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
	// OnRehydrate receives the week's substitutions reloaded from Subs (tombstones
	// included) once, before the bridge writes anything. The relay merges them (LWW) and
	// opens for devices.
	OnRehydrate func(RehydrateResult)
	// Backend names a non-Google backend in Status ("fake-file" for local tests).
	Backend string
}

// Status is the bridge's state for /health and devices.
type Status struct {
	State     string `json:"state"` // starting | hydrating | ok | error
	Hydrated  bool   `json:"hydrated"`
	LastPull  int64  `json:"lastPull,omitempty"`
	LastWrite int64  `json:"lastWrite,omitempty"`
	DataHash  string `json:"dataVersion,omitempty"`
	Backend   string `json:"backend,omitempty"`
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
	hydrated bool // Subs has been read back; only then may the bridge write it
	loadedAt int64
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
	return &Bridge{api: guard{api}, src: src, cfg: cfg, notify: make(chan struct{}, 1),
		status: Status{State: "starting", Backend: cfg.Backend}}
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
	b.status.Error = ""
	if b.hydrated {
		b.status.State = "ok"
	} else if b.status.State == "error" {
		b.status.State = "hydrating"
	}
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
	var names []string
	for _, t := range tabs {
		if Writable(t.Title) {
			continue
		}
		if t.Hidden {
			snap.HiddenTabs++
			continue
		}
		names = append(names, t.Title)
	}
	data, err := ReadMany(ctx, b.api, names)
	if err != nil {
		return Snapshot{}, err
	}
	for _, n := range names {
		snap.Tabs = append(snap.Tabs, Tab{Name: n, Rows: data[n]})
	}
	raw, _ := json.Marshal(snap.Tabs)
	sum := sha256.Sum256(raw)
	snap.Hash = hex.EncodeToString(sum[:8])
	snap.AppVersion = b.cfg.AppVersion

	b.mu.Lock()
	changed := b.snapshot == nil || b.snapshot.Hash != snap.Hash
	if !changed {
		snap.FetchedAt = b.snapshot.FetchedAt // same data: keep the time it first appeared
	}
	b.snapshot = &snap
	b.status.DataHash = snap.Hash
	writeMeta := changed && b.ready && b.hydrated
	b.mu.Unlock()
	b.setOK(true, false)
	if changed && b.cfg.OnSnapshot != nil {
		b.cfg.OnSnapshot(snap)
	}
	if writeMeta {
		if err := b.WriteMeta(ctx); err != nil {
			log.Printf("[Sheets] %v", err)
		}
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
// An existing tab is used only when it is empty or carries our header. A schema-1 Subs tab
// (Bundle 35) is upgraded in place to schema 2.
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
				if sameHeader(rows[0], w.header) {
					continue
				}
				if w.name == TabSubs && isV1Header(rows[0]) {
					if err := b.upgradeSubs(ctx, rows); err != nil {
						return err
					}
					continue
				}
				return fmt.Errorf("%w: %s", ErrNotAppOwned, w.name)
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

func isV1Header(row []string) bool {
	if len(row) != len(SubsHeaderV1) {
		return false
	}
	return sameHeader(row, SubsHeaderV1)
}

// upgradeSubs rewrites a schema-1 Subs tab as schema 2: the new header, and each data row's
// first 13 columns (Revision is dropped). Schema-1 rows carry no version, so Rehydrate
// skips them; the next flush rewrites the rows of the active week in full.
func (b *Bridge) upgradeSubs(ctx context.Context, rows [][]string) error {
	out := make([][]string, len(rows))
	out[0] = SubsHeader
	for i, r := range rows[1:] {
		if len(r) > v1DataCols {
			r = r[:v1DataCols]
		}
		out[i+1] = r
	}
	if err := b.api.Write(ctx, TabSubs, padRows(out, len(SubsHeader))); err != nil {
		return fmt.Errorf("upgrade Subs: %w", err)
	}
	log.Printf("[Sheets] Upgraded Subs to schema %s (%d data rows)", SchemaVersion, len(rows)-1)
	return nil
}

func (b *Bridge) stamp(ms int64) string {
	if ms <= 0 {
		return ""
	}
	return time.UnixMilli(ms).In(b.src.Location()).Format("2006-01-02 15:04:05")
}

// subRow renders one substitution. prev is its current row in Subs (nil if none): a
// tombstone has no value, so it keeps the human columns of the row it replaces.
func (b *Bridge) subRow(r livesync.SubRecord, prev []string) []string {
	if r.Deleted {
		row := make([]string, len(SubsHeader))
		copy(row, prev)
		if len(prev) > colDeletedAt {
			copy(row[colDeletedAt:], make([]string, len(SubsHeader)-colDeletedAt))
		}
		row[0], row[colDate] = r.Key, r.Date
		if prev == nil {
			row[2], row[3] = r.Sub.Day, r.Sub.Period
		}
		row[colStatus] = StatusRemoved
		row[10] = b.stamp(r.TS)
		row[colAppVersion] = b.cfg.AppVersion
		row[colDeletedAt] = b.stamp(r.TS)
		row[colTS] = strconv.FormatInt(r.TS, 10)
		row[colBy] = r.By
		return row
	}
	note := r.Sub.Remark
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
	payload := string(r.Value)
	if len(payload) > MaxPayloadCell {
		log.Printf("[Sheets] %s: value too large for one cell (%d bytes); it won't survive a restart", r.Key, len(payload))
		payload = ""
	}
	return []string{r.Key, r.Date, r.Sub.Day, r.Sub.Period, r.Sub.OriginalTeacher, r.Sub.SubstituteTeacher,
		r.Sub.ClassName, r.Sub.Subject, r.Sub.Status, note, b.stamp(r.TS), by, b.cfg.AppVersion,
		"", strconv.FormatInt(r.TS, 10), r.By, payload}
}

// sameRecord compares two Subs rows, ignoring App Version, so an upgrade alone doesn't
// rewrite every row.
func sameRecord(a, b []string) bool {
	a, b = padRow(a, len(SubsHeader)), padRow(b, len(SubsHeader))
	a[colAppVersion], b[colAppVersion] = "", ""
	return equalRows(a, b)
}

func padRow(r []string, n int) []string {
	p := make([]string, max(n, len(r)))
	copy(p, r)
	return p
}

// errNotHydrated: Subs must be read back before the bridge may write it, or a restart
// would overwrite the tombstones it hasn't loaded yet.
var errNotHydrated = errors.New("sheets: Subs not reloaded yet")

// Flush upserts the Subs rows of the active week by Key, writing only rows that changed
// (one batch), then App_Meta and, optionally, App_Log. Rows of earlier weeks are left alone.
// It returns the number of rows written.
func (b *Bridge) Flush(ctx context.Context) error {
	_, err := b.flush(ctx)
	return err
}

func (b *Bridge) flush(ctx context.Context) (int, error) {
	b.mu.Lock()
	ready, hydrated := b.ready, b.hydrated
	b.mu.Unlock()
	if !hydrated {
		return 0, errNotHydrated
	}
	if !ready {
		if err := b.EnsureTabs(ctx); err != nil {
			return 0, err
		}
	}
	existing, err := b.api.Read(ctx, TabSubs)
	if err != nil {
		return 0, fmt.Errorf("read Subs: %w", err)
	}
	updates := map[int][]string{}
	if len(existing) == 0 {
		existing = [][]string{SubsHeader}
		updates[1] = SubsHeader
	} else if !sameHeader(existing[0], SubsHeader) {
		return 0, fmt.Errorf("%w: %s", ErrNotAppOwned, TabSubs)
	}
	index := map[string]int{}
	for i, row := range existing {
		if i > 0 && len(row) > 0 && row[0] != "" {
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
		i, ok := index[r.Key]
		var prev []string
		if ok {
			prev = existing[i]
		}
		row := b.subRow(r, prev)
		if ok && sameRecord(prev, row) {
			continue
		}
		if !ok {
			existing = append(existing, row)
			i = len(existing) - 1
			index[r.Key] = i
		}
		existing[i] = row
		updates[i+1] = row
		changed++
	}
	if len(updates) > 0 {
		if err := b.api.UpdateRows(ctx, TabSubs, updates); err != nil {
			return 0, fmt.Errorf("write Subs: %w", err)
		}
	}
	if changed > 0 {
		b.mu.Lock()
		b.status.LastWrite = b.cfg.Now().UnixMilli()
		b.mu.Unlock()
		if err := b.WriteMeta(ctx); err != nil {
			return changed, err
		}
		if b.cfg.Log {
			row := []string{b.stamp(b.cfg.Now().UnixMilli()), "flush", strconv.Itoa(changed), b.cfg.AppVersion}
			if err := b.api.Append(ctx, TabLog, [][]string{row}); err != nil {
				return changed, fmt.Errorf("append App_Log: %w", err)
			}
		}
	}
	b.setOK(false, changed > 0)
	return changed, nil
}

// RehydrateResult is what Rehydrate read back from Subs.
type RehydrateResult struct {
	Entities   []livesync.Entity // the active week's substitutions, tombstones as null values
	Rows       int               // data rows in Subs
	Loaded     int               // live substitutions in Entities
	Tombstones int               // deletions in Entities
	OtherWeeks int               // rows outside the active week (left alone)
	Skipped    int               // rows without a version or with a bad payload
}

// Rehydrate reads Subs back and returns the active week's entities. Until it has
// succeeded once the bridge refuses to write Subs.
func (b *Bridge) Rehydrate(ctx context.Context) (RehydrateResult, error) {
	var res RehydrateResult
	b.mu.Lock()
	if !b.hydrated {
		b.status.State = "hydrating"
	}
	b.mu.Unlock()
	rows, err := b.api.Read(ctx, TabSubs)
	if err != nil {
		return res, fmt.Errorf("read Subs: %w", err)
	}
	if len(rows) > 0 && !sameHeader(rows[0], SubsHeader) {
		return res, fmt.Errorf("%w: %s", ErrNotAppOwned, TabSubs)
	}
	for i, row := range rows {
		if i == 0 || len(row) == 0 || row[0] == "" {
			continue
		}
		res.Rows++
		e, ok := parseSubRow(row)
		if !ok {
			res.Skipped++
			continue
		}
		if !b.src.Accepts(e.Key) {
			res.OtherWeeks++
			continue
		}
		if e.Deleted() {
			res.Tombstones++
		} else {
			res.Loaded++
		}
		res.Entities = append(res.Entities, e)
	}
	b.mu.Lock()
	b.hydrated = true
	b.loadedAt = b.cfg.Now().UnixMilli()
	b.status.Hydrated = true
	b.mu.Unlock()
	b.setOK(false, false)
	return res, nil
}

func parseSubRow(row []string) (livesync.Entity, bool) {
	row = padRow(row, len(SubsHeader))
	kind, _, ok := livesync.ParseKey(row[0])
	if !ok || kind != "sub" {
		return livesync.Entity{}, false
	}
	ts, err := strconv.ParseInt(row[colTS], 10, 64)
	if err != nil || ts <= 0 || row[colBy] == "" {
		return livesync.Entity{}, false
	}
	e := livesync.Entity{Key: row[0], TS: ts, By: row[colBy]}
	if row[colDeletedAt] != "" || row[colStatus] == StatusRemoved {
		e.Value = json.RawMessage("null")
		return e, true
	}
	if !json.Valid([]byte(row[colPayload])) {
		return livesync.Entity{}, false
	}
	e.Value = json.RawMessage(row[colPayload])
	return e, true
}

// WriteMeta rewrites App_Meta: schema and app version, the last Subs write, the last pull,
// the data version (hash of the read-only tabs devices were sent) and the last reload of Subs.
func (b *Bridge) WriteMeta(ctx context.Context) error {
	st := b.Status()
	b.mu.Lock()
	loadedAt := b.loadedAt
	b.mu.Unlock()
	rows := [][]string{
		MetaHeader,
		{"schema_version", SchemaVersion},
		{"app_version", b.cfg.AppVersion},
		{"last_updated", b.stamp(st.LastWrite)},
		{"last_pull", b.stamp(st.LastPull)},
		{"data_version", st.DataHash},
		{"subs_reloaded_at", b.stamp(loadedAt)},
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

// Run pulls the read-only tabs, prepares the app-owned tabs, reloads Subs (retrying with
// backoff until it succeeds), hands the reloaded week to OnRehydrate, and then runs the
// pull and write loops. Nothing is written to Subs before the reload. It returns when ctx
// is done.
func (b *Bridge) Run(ctx context.Context) {
	if _, err := b.Pull(ctx); err != nil {
		log.Printf("[Sheets] Initial pull failed: %v", err)
		b.setErr(err)
	}
	go b.pullLoop(ctx)
	backoff := time.Duration(0)
	for {
		res, err := b.prepare(ctx)
		if err == nil {
			log.Printf("[Sheets] Reloaded Subs: %d rows, %d active, %d deleted this week (%d other weeks, %d skipped)",
				res.Rows, res.Loaded, res.Tombstones, res.OtherWeeks, res.Skipped)
			if b.cfg.OnRehydrate != nil {
				b.cfg.OnRehydrate(res)
			}
			break
		}
		b.setErr(err)
		backoff = nextBackoff(backoff, b.cfg.MaxBackoff)
		log.Printf("[Sheets] Could not reload Subs, retrying in %s: %v", backoff, err)
		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
		}
	}
	if err := b.WriteMeta(ctx); err != nil {
		log.Printf("[Sheets] %v", err)
		b.setErr(err)
	}
	b.writeLoop(ctx)
}

func (b *Bridge) prepare(ctx context.Context) (RehydrateResult, error) {
	if err := b.EnsureTabs(ctx); err != nil {
		return RehydrateResult{}, err
	}
	return b.Rehydrate(ctx)
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
