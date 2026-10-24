package sheets

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"lfps/server/internal/livesync"
)

// SelfTestPrefix marks the substitution ids the self-test writes. Cleanup removes every
// Subs row whose key contains it, so it must never occur in real data.
const SelfTestPrefix = "zz-itest-"

// SelfTestReport is what SelfTest proved, as counts and test keys only (no sheet data).
type SelfTestReport struct {
	Steps []string
}

func (r *SelfTestReport) ok(format string, a ...any) {
	r.Steps = append(r.Steps, fmt.Sprintf(format, a...))
}

// SelfTest runs the restart/tombstone cycle against a spreadsheet, as three relay starts:
//
//  1. start: write three test substitutions to Subs;
//  2. restart (fresh store): reload them, delete one, flush, flush again (no writes);
//  3. restart: the deletion is reloaded as a tombstone and beats a stale copy;
//
// then removes every test row from Subs, leaving the other rows as they were. It writes
// only Subs and App_Meta (through the same guard as the relay). Cleanup runs even when a
// step fails.
func SelfTest(ctx context.Context, api API, appVersion string, loc *time.Location) (rep SelfTestReport, err error) {
	run := make([]byte, 3)
	_, _ = rand.Read(run)
	prefix := SelfTestPrefix + hex.EncodeToString(run) + "-"
	defer func() {
		removed, cerr := CleanSelfTestRows(ctx, api, appVersion, loc)
		if cerr != nil && err == nil {
			err = fmt.Errorf("cleanup: %w", cerr)
		}
		if cerr == nil {
			rep.ok("cleanup: removed %d test row(s); no test rows left in Subs", removed)
		}
	}()

	start := func() (*livesync.Store, *Bridge, RehydrateResult, error) {
		st := livesync.NewStore(loc)
		b := New(api, st, Config{AppVersion: appVersion})
		if err := b.EnsureTabs(ctx); err != nil {
			return nil, nil, RehydrateResult{}, err
		}
		res, err := b.Rehydrate(ctx)
		if err != nil {
			return nil, nil, res, err
		}
		st.Merge(res.Entities)
		return st, b, res, nil
	}

	st, b, res, err := start()
	if err != nil {
		return rep, err
	}
	rep.ok("start 1: Subs schema %s ready; reloaded %d row(s) (%d this week, %d deleted)", SchemaVersion, res.Rows, res.Loaded, res.Tombstones)
	date := st.Snapshot().WeekStart
	now := time.Now().UnixMilli()
	keys := []string{}
	var ents []livesync.Entity
	for i, period := range []string{"1st", "2nd", "3rd"} {
		id := fmt.Sprintf("%s%d", prefix, i+1)
		v, _ := json.Marshal(map[string]string{"id": id, "period": period, "originalTeacher": "Test Absent",
			"substituteTeacher": "Test Cover", "className": "TEST", "subject": "TEST", "status": "PENDING",
			"remark": "integration self-test, removed automatically"})
		key := "sub|" + date + "|" + id
		keys = append(keys, key)
		ents = append(ents, livesync.Entity{Key: key, Value: v, TS: now, By: "selftest"})
	}
	if r := st.Merge(ents); len(r.Accepted) != 3 {
		return rep, fmt.Errorf("store refused the test rows: %+v", r.Rejected)
	}
	n, err := b.flush(ctx)
	if err != nil {
		return rep, err
	}
	rep.ok("start 1: wrote %d test row(s) (%s…)", n, prefix)

	st, b, res, err = start()
	if err != nil {
		return rep, err
	}
	live := map[string]livesync.Entity{}
	for _, e := range st.Snapshot().Entities {
		live[e.Key] = e
	}
	for _, k := range keys {
		e, ok := live[k]
		if !ok || e.Deleted() || e.TS != now || e.By != "selftest" {
			return rep, fmt.Errorf("restart: %s not reloaded", k)
		}
		if want := ents[indexOf(keys, k)].Value; !sameJSON(e.Value, want) {
			return rep, fmt.Errorf("restart: %s payload differs", k)
		}
	}
	rep.ok("start 2 (restart): all 3 test rows reloaded with their versions and payloads")

	del := livesync.Entity{Key: keys[1], Value: json.RawMessage("null"), TS: now + 1000, By: "selftest"}
	if r := st.Merge([]livesync.Entity{del}); len(r.Accepted) != 1 {
		return rep, fmt.Errorf("delete refused")
	}
	if n, err = b.flush(ctx); err != nil || n != 1 {
		return rep, fmt.Errorf("tombstone flush wrote %d row(s): %v", n, err)
	}
	if n, err = b.flush(ctx); err != nil || n != 0 {
		return rep, fmt.Errorf("repeat flush wrote %d row(s): %v", n, err)
	}
	rows, err := api.Read(ctx, TabSubs)
	if err != nil {
		return rep, err
	}
	count := 0
	for _, r := range rows {
		r = padRow(r, len(SubsHeader))
		if !strings.Contains(r[0], prefix) {
			continue
		}
		count++
		if r[0] == keys[1] && (r[colStatus] != StatusRemoved || r[colDeletedAt] == "" || r[colPayload] != "") {
			return rep, fmt.Errorf("tombstone row not written as REMOVED with Deleted At")
		}
	}
	if count != 3 {
		return rep, fmt.Errorf("found %d test rows, want 3 (upsert must not duplicate)", count)
	}
	rep.ok("start 2: deleted 1 → row kept as tombstone (REMOVED, Deleted At); repeat flush wrote 0 rows; still 3 rows")

	st, _, res, err = start()
	if err != nil {
		return rep, err
	}
	stale := livesync.Entity{Key: keys[1], Value: ents[1].Value, TS: now + 500, By: "old-device"}
	if r := st.Merge([]livesync.Entity{stale}); len(r.Accepted) != 0 {
		return rep, fmt.Errorf("stale copy resurrected the deleted test row")
	}
	gone := false
	for _, e := range st.Snapshot().Entities {
		if e.Key == keys[1] {
			gone = e.Deleted()
		}
	}
	if !gone {
		return rep, fmt.Errorf("tombstone not reloaded")
	}
	rep.ok("start 3 (restart): tombstone reloaded (%d deleted this week); a stale copy from another device was refused", res.Tombstones)
	return rep, nil
}

// CleanSelfTestRows removes every Subs row whose key contains SelfTestPrefix: it rewrites
// the tab without them (other rows keep their order and values) and clears what is left
// below. It then refreshes App_Meta. Returns the number of rows removed.
func CleanSelfTestRows(ctx context.Context, api API, appVersion string, loc *time.Location) (int, error) {
	g := guard{api}
	rows, err := g.Read(ctx, TabSubs)
	if err != nil {
		return 0, err
	}
	if len(rows) > 0 && !sameHeader(rows[0], SubsHeader) {
		return 0, fmt.Errorf("%w: %s", ErrNotAppOwned, TabSubs)
	}
	width := len(SubsHeader)
	var keep [][]string
	for i, r := range rows {
		width = max(width, len(r))
		if i > 0 && len(r) > 0 && strings.Contains(r[0], SelfTestPrefix) {
			continue
		}
		keep = append(keep, r)
	}
	removed := len(rows) - len(keep)
	if removed == 0 {
		return 0, nil
	}
	if err := g.Write(ctx, TabSubs, padRows(keep, width)); err != nil {
		return 0, err
	}
	if err := g.ClearRows(ctx, TabSubs, len(keep)+1); err != nil {
		return 0, err
	}
	b := New(api, livesync.NewStore(loc), Config{AppVersion: appVersion})
	if _, err := b.Pull(ctx); err != nil { // so App_Meta keeps last_pull and data_version
		return removed, err
	}
	b.status.LastWrite = time.Now().UnixMilli()
	if err := b.WriteMeta(ctx); err != nil {
		return removed, err
	}
	return removed, nil
}

func indexOf(xs []string, x string) int {
	for i, v := range xs {
		if v == x {
			return i
		}
	}
	return -1
}

func sameJSON(a, b json.RawMessage) bool {
	var x, y any
	if json.Unmarshal(a, &x) != nil || json.Unmarshal(b, &y) != nil {
		return false
	}
	ra, _ := json.Marshal(x)
	rb, _ := json.Marshal(y)
	return string(ra) == string(rb)
}
