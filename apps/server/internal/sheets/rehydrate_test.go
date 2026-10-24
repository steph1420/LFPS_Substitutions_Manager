package sheets

import (
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"
	"time"

	"lfps/server/internal/livesync"
)

func subValue(id, status string) json.RawMessage {
	return json.RawMessage(`{"id":"` + id + `","period":"1st","originalTeacher":"T1","substituteTeacher":"T2","className":"KG A","subject":"EVS","status":"` + status + `"}`)
}

// boot is one relay start: a fresh store and bridge on the same spreadsheet.
func boot(t *testing.T, f API) (*livesync.Store, *Bridge, RehydrateResult) {
	t.Helper()
	live := newLive()
	b := New(f, live, Config{AppVersion: "2.0.0-test"})
	ctx := context.Background()
	if err := b.EnsureTabs(ctx); err != nil {
		t.Fatal(err)
	}
	res, err := b.Rehydrate(ctx)
	if err != nil {
		t.Fatal(err)
	}
	live.Merge(res.Entities)
	return live, b, res
}

func value(t *testing.T, s *livesync.Store, key string) (livesync.Entity, bool) {
	t.Helper()
	for _, e := range s.Snapshot().Entities {
		if e.Key == key {
			return e, true
		}
	}
	return livesync.Entity{}, false
}

func TestRestartRehydratesAndDeletionsStick(t *testing.T) {
	f := newFake()
	ctx := context.Background()
	live, b, _ := boot(t, f)
	live.Merge([]livesync.Entity{
		{Key: "sub|2026-10-21|keep", Value: subValue("keep", "PENDING"), TS: 1000, By: "devA"},
		{Key: "sub|2026-10-21|gone", Value: subValue("gone", "PENDING"), TS: 1000, By: "devA"},
		{Key: "sub|2026-10-13|old", Value: subValue("old", "COVERED"), TS: 500, By: "devA"}, // last week: refused by the store
	})
	if err := b.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	live.Merge([]livesync.Entity{{Key: "sub|2026-10-21|gone", Value: json.RawMessage("null"), TS: 2000, By: "devB"}})
	if err := b.Flush(ctx); err != nil {
		t.Fatal(err)
	}

	// Restart: an empty store reloads both the substitution and the deletion.
	live2, _, res := boot(t, f)
	if res.Loaded != 1 || res.Tombstones != 1 || res.Skipped != 0 {
		t.Fatalf("rehydrate: %+v", res)
	}
	if e, ok := value(t, live2, "sub|2026-10-21|keep"); !ok || e.TS != 1000 || e.By != "devA" {
		t.Fatalf("keep: %+v %v", e, ok)
	}
	var got map[string]any
	e, _ := value(t, live2, "sub|2026-10-21|keep")
	if err := json.Unmarshal(e.Value, &got); err != nil || got["substituteTeacher"] != "T2" {
		t.Fatalf("payload not round-tripped: %s", e.Value)
	}
	tomb, ok := value(t, live2, "sub|2026-10-21|gone")
	if !ok || !tomb.Deleted() || tomb.TS != 2000 {
		t.Fatalf("tombstone not reloaded: %+v", tomb)
	}
	// A device that missed the deletion re-publishes its older copy: LWW keeps it deleted.
	r := live2.Merge([]livesync.Entity{{Key: "sub|2026-10-21|gone", Value: subValue("gone", "PENDING"), TS: 1500, By: "devA"}})
	if len(r.Accepted) != 0 {
		t.Fatalf("stale copy resurrected a deleted substitution: %+v", r)
	}
	if tomb, _ := value(t, live2, "sub|2026-10-21|gone"); !tomb.Deleted() {
		t.Fatal("deleted item came back")
	}
	// A genuinely newer edit (after the deletion) may restore it: plain LWW.
	r = live2.Merge([]livesync.Entity{{Key: "sub|2026-10-21|gone", Value: subValue("gone", "PENDING"), TS: 2500, By: "devA"}})
	if len(r.Accepted) != 1 {
		t.Fatalf("newer edit refused: %+v", r)
	}
}

func TestFlushIsIdempotentUpsert(t *testing.T) {
	f := newFake()
	ctx := context.Background()
	live, b, _ := boot(t, f)
	live.Merge([]livesync.Entity{
		{Key: "sub|2026-10-21|a", Value: subValue("a", "PENDING"), TS: 1000, By: "d"},
		{Key: "sub|2026-10-22|b", Value: subValue("b", "PENDING"), TS: 1000, By: "d"},
	})
	n, err := b.flush(ctx)
	if err != nil || n != 2 {
		t.Fatalf("first flush %d %v", n, err)
	}
	f.mu.Lock()
	f.writes = nil
	f.mu.Unlock()
	// Same state again, and again after a restart: no writes, no duplicate rows.
	if n, err := b.flush(ctx); err != nil || n != 0 {
		t.Fatalf("second flush %d %v", n, err)
	}
	_, b2, _ := boot(t, f)
	if n, err := b2.flush(ctx); err != nil || n != 0 {
		t.Fatalf("flush after restart %d %v", n, err)
	}
	for _, w := range f.touched() {
		if w == "update:Subs" {
			t.Fatalf("unchanged state rewrote Subs: %v", f.touched())
		}
	}
	if len(f.data["Subs"]) != 3 {
		t.Fatalf("rows: %d", len(f.data["Subs"]))
	}
	// One change → exactly one row rewritten, in place.
	live.Merge([]livesync.Entity{{Key: "sub|2026-10-22|b", Value: subValue("b", "ACCEPTED"), TS: 2000, By: "d"}})
	if n, err := b.flush(ctx); err != nil || n != 1 || len(f.data["Subs"]) != 3 || f.data["Subs"][2][colStatus] != "ACCEPTED" {
		t.Fatalf("upsert %d %v %v", n, err, f.data["Subs"])
	}
	// A new app version alone doesn't rewrite rows.
	b.cfg.AppVersion = "2.0.0-next"
	if n, _ := b.flush(ctx); n != 0 {
		t.Fatalf("version bump rewrote %d rows", n)
	}
}

func TestOtherWeeksAndBadRowsAreLeftAlone(t *testing.T) {
	f := newFake()
	f.add("Subs", false, [][]string{
		SubsHeader,
		{"sub|2026-10-14|lastweek", "2026-10-14", "", "", "", "", "", "", "PENDING", "", "", "", "", "", "100", "d", `{"id":"lastweek"}`},
		{"sub|2026-10-21|nover", "2026-10-21", "", "", "", "", "", "", "PENDING"},                                        // no version (schema 1 row)
		{"sub|2026-10-21|badjson", "2026-10-21", "", "", "", "", "", "", "PENDING", "", "", "", "", "", "100", "d", "{"}, // corrupt payload
		{"abs|2026-10-21|x", "2026-10-21", "", "", "", "", "", "", "", "", "", "", "", "", "100", "d", `{}`},             // not a substitution
		{"sub|2026-10-21|ok", "2026-10-21", "", "", "", "", "", "", "PENDING", "", "", "", "", "", "100", "d", `{"id":"ok"}`},
	})
	live, b, res := boot(t, f)
	if res.Rows != 5 || res.Loaded != 1 || res.OtherWeeks != 1 || res.Skipped != 3 {
		t.Fatalf("%+v", res)
	}
	if _, ok := value(t, live, "sub|2026-10-21|ok"); !ok {
		t.Fatal("valid row not loaded")
	}
	before, _ := json.Marshal(f.data["Subs"][1])
	if _, err := b.flush(context.Background()); err != nil {
		t.Fatal(err)
	}
	after, _ := json.Marshal(f.data["Subs"][1])
	if string(before) != string(after) {
		t.Fatal("a flush touched last week's row")
	}
}

func TestUpgradesSchema1Subs(t *testing.T) {
	f := newFake()
	f.add("Subs", false, [][]string{
		SubsHeaderV1,
		{"sub|2026-10-21|s1", "2026-10-21", "WED", "1st", "T1", "T2", "KG A", "EVS", "PENDING", "", "2026-10-21 09:00:00", "x", "2.0.0-alpha.2", "3"},
	})
	live, b, res := boot(t, f)
	if f.data["Subs"][0][colPayload] != "Payload" || len(f.data["Subs"][1]) != len(SubsHeader) || f.data["Subs"][1][colDeletedAt] != "" {
		t.Fatalf("not upgraded: %v", f.data["Subs"])
	}
	if res.Skipped != 1 || res.Loaded != 0 {
		t.Fatalf("schema-1 row has no version and must be skipped: %+v", res)
	}
	// Devices re-publish it; the next flush fills in the same row.
	live.Merge([]livesync.Entity{{Key: "sub|2026-10-21|s1", Value: subValue("s1", "PENDING"), TS: 1000, By: "d"}})
	if err := b.Flush(context.Background()); err != nil {
		t.Fatal(err)
	}
	if len(f.data["Subs"]) != 2 || f.data["Subs"][1][colTS] != "1000" {
		t.Fatalf("%v", f.data["Subs"])
	}
}

func TestNoSubsWriteBeforeRehydrate(t *testing.T) {
	f := newFake()
	f.add("Subs", false, [][]string{SubsHeader,
		{"sub|2026-10-21|gone", "2026-10-21", "", "", "", "", "", "", StatusRemoved, "", "", "", "", "x", "2000", "d", ""}})
	live := newLive()
	b := New(f, live, Config{AppVersion: "t"})
	// A device publishes an old copy before Subs was read back: the bridge must not write it.
	live.Merge([]livesync.Entity{{Key: "sub|2026-10-21|gone", Value: subValue("gone", "PENDING"), TS: 1000, By: "d"}})
	if err := b.Flush(context.Background()); !errors.Is(err, errNotHydrated) {
		t.Fatalf("flush before rehydrate: %v", err)
	}
	if len(f.touched()) != 0 {
		t.Fatalf("wrote before rehydrate: %v", f.touched())
	}
	if b.Status().Hydrated {
		t.Fatal("hydrated too early")
	}
}

func TestRunRehydratesBeforeWriting(t *testing.T) {
	f := newFake()
	f.add("Subs", false, [][]string{SubsHeader,
		{"sub|2026-10-21|k", "2026-10-21", "", "", "", "", "", "", "PENDING", "", "", "", "", "", "1000", "d", `{"id":"k"}`}})
	f.mu.Lock()
	f.fail = 1 // the first write fails (App_Meta), Run must carry on
	f.mu.Unlock()
	live := newLive()
	var mu sync.Mutex
	var got *RehydrateResult
	var writesAtRehydrate int
	b := New(f, live, Config{AppVersion: "t", PullInterval: time.Hour, Debounce: 10 * time.Millisecond, MaxBackoff: 20 * time.Millisecond,
		OnRehydrate: func(r RehydrateResult) {
			mu.Lock()
			defer mu.Unlock()
			got = &r
			for _, w := range f.touched() {
				if w == "write:Subs" || w == "update:Subs" || w == "append:Subs" {
					writesAtRehydrate++
				}
			}
			live.Merge(r.Entities)
		}})
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() { b.Run(ctx); close(done) }()
	deadline := time.Now().Add(2 * time.Second)
	for {
		mu.Lock()
		ok := got != nil
		mu.Unlock()
		if ok || time.Now().After(deadline) {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	cancel()
	<-done
	mu.Lock()
	defer mu.Unlock()
	if got == nil || got.Loaded != 1 {
		t.Fatalf("OnRehydrate: %+v", got)
	}
	if writesAtRehydrate != 0 {
		t.Fatalf("wrote Subs before the reload: %v", f.touched())
	}
	if _, ok := value(t, live, "sub|2026-10-21|k"); !ok {
		t.Fatal("not merged")
	}
}

func TestFileAPISurvivesReopen(t *testing.T) {
	path := t.TempDir() + "/sheet.json"
	f, err := NewFileAPI(path)
	if err != nil {
		t.Fatal(err)
	}
	live, b, _ := boot(t, f)
	live.Merge([]livesync.Entity{{Key: "sub|2026-10-21|a", Value: subValue("a", "PENDING"), TS: 1000, By: "d"}})
	if err := b.Flush(context.Background()); err != nil {
		t.Fatal(err)
	}
	f2, err := NewFileAPI(path)
	if err != nil {
		t.Fatal(err)
	}
	_, _, res := boot(t, f2)
	if res.Loaded != 1 {
		t.Fatalf("%+v", res)
	}
	if err := f2.ClearRows(context.Background(), TabSubs, 2); err != nil {
		t.Fatal(err)
	}
	if rows, _ := f2.Read(context.Background(), TabSubs); len(rows) != 1 {
		t.Fatalf("clear: %v", rows)
	}
}

func TestSelfTestCleansUp(t *testing.T) {
	f := newFake()
	keepRow := []string{"sub|2026-10-20|real", "2026-10-20", "TUE", "1st", "T1", "T2", "KG A", "EVS", "PENDING", "", "", "", "", "", "100", "d", `{"id":"real"}`}
	f.add("Subs", false, [][]string{SubsHeader, keepRow})
	before := map[string]string{}
	for _, n := range []string{"Staff Directory", "OVERVIEW", "Daily_Ledger", "Owner Notes"} {
		raw, _ := json.Marshal(f.data[n])
		before[n] = string(raw)
	}
	rep, err := SelfTest(context.Background(), f, "t", time.UTC)
	if err != nil {
		t.Fatalf("%v\n%v", err, rep.Steps)
	}
	if len(rep.Steps) != 6 {
		t.Fatalf("steps: %v", rep.Steps)
	}
	subs := trimRows(f.data["Subs"])
	if len(subs) != 2 || subs[1][0] != "sub|2026-10-20|real" {
		t.Fatalf("Subs not tidy: %v", subs)
	}
	onlyAppOwned(t, f)
	for n, want := range before {
		raw, _ := json.Marshal(f.data[n])
		if string(raw) != want {
			t.Fatalf("owner tab %s changed", n)
		}
	}
}
