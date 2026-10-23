package sheets

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"sync"
	"testing"
	"time"

	"lfps/server/internal/livesync"
)

func newLive() *livesync.Store {
	t := time.Date(2026, 10, 21, 9, 0, 0, 0, time.UTC)
	return livesync.NewStoreWithClock(func() time.Time { return t })
}

func TestAllowlist(t *testing.T) {
	for _, ok := range []string{"Subs", "App_Meta", "App_Log"} {
		if !Writable(ok) {
			t.Errorf("%s should be writable", ok)
		}
	}
	for _, no := range []string{"", "subs", "Staff Directory", "OVERVIEW", "Daily_Ledger", "Baseline_Updates",
		"Subs!A1", "'Subs'", "App_Meta ", "KG A"} {
		if Writable(no) {
			t.Errorf("%q must not be writable", no)
		}
	}
	for tab := range LegacyTabs {
		if Writable(tab) {
			t.Errorf("legacy tab %s must stay read-only", tab)
		}
	}
}

func TestGuardBlocksOwnerTabs(t *testing.T) {
	f := newFake()
	g := guard{f}
	ctx := context.Background()
	for _, tab := range []string{"Staff Directory", "Daily_Ledger", "Owner Notes", "Subs'!A1"} {
		if err := g.Write(ctx, tab, [][]string{{"x"}}); !errors.Is(err, ErrForbiddenTab) {
			t.Errorf("Write %q: %v", tab, err)
		}
		if err := g.Append(ctx, tab, [][]string{{"x"}}); !errors.Is(err, ErrForbiddenTab) {
			t.Errorf("Append %q: %v", tab, err)
		}
		if err := g.CreateTab(ctx, tab); !errors.Is(err, ErrForbiddenTab) {
			t.Errorf("CreateTab %q: %v", tab, err)
		}
	}
	if len(f.touched()) != 0 {
		t.Fatalf("guard let writes through: %v", f.touched())
	}
	if _, err := g.Read(ctx, "Staff Directory"); err != nil {
		t.Fatalf("reads must pass: %v", err)
	}
}

func TestA1RangeQuotes(t *testing.T) {
	if got := A1Range("Staff Directory", "A1"); got != "'Staff Directory'!A1" {
		t.Fatal(got)
	}
	if got := A1Range("It's", ""); got != "'It''s'" {
		t.Fatal(got)
	}
}

func TestPullSkipsHiddenAndAppTabs(t *testing.T) {
	f := newFake()
	f.add("Subs", false, [][]string{SubsHeader})
	var got []Snapshot
	b := New(f, newLive(), Config{AppVersion: "t", OnSnapshot: func(s Snapshot) { got = append(got, s) }})
	snap, err := b.Pull(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	names := []string{}
	for _, tab := range snap.Tabs {
		names = append(names, tab.Name)
	}
	if strings.Join(names, ",") != "Staff Directory,OVERVIEW,Daily_Ledger" || snap.HiddenTabs != 1 {
		t.Fatalf("pulled %v hidden %d", names, snap.HiddenTabs)
	}
	// Unchanged sheet: no second broadcast.
	if _, err := b.Pull(context.Background()); err != nil || len(got) != 1 {
		t.Fatalf("broadcast on no change: %d", len(got))
	}
	f.data["OVERVIEW"][0][0] = "y"
	if _, _ = b.Pull(context.Background()); len(got) != 2 {
		t.Fatal("change not broadcast")
	}
	if len(f.touched()) != 0 {
		t.Fatalf("pull wrote: %v", f.touched())
	}
}

func onlyAppOwned(t *testing.T, f *fakeAPI) {
	t.Helper()
	for _, w := range f.touched() {
		tab := w[strings.Index(w, ":")+1:]
		if !Writable(tab) {
			t.Fatalf("wrote to a non-app tab: %s", w)
		}
	}
}

func TestEnsureTabsAndFlush(t *testing.T) {
	f := newFake()
	live := newLive()
	b := New(f, live, Config{AppVersion: "2.0.0-test", Log: true})
	ctx := context.Background()
	before := map[string]string{}
	for _, n := range []string{"Staff Directory", "OVERVIEW", "Daily_Ledger", "Owner Notes"} {
		raw, _ := json.Marshal(f.data[n])
		before[n] = string(raw)
	}

	if err := b.EnsureTabs(ctx); err != nil {
		t.Fatal(err)
	}
	if f.data["Subs"][0][0] != "Key" || f.data["App_Meta"][0][0] != "Key" || f.data["App_Log"][0][0] != "Time" {
		t.Fatalf("headers: %v", f.data)
	}
	live.Merge([]livesync.Entity{
		{Key: "sub|2026-10-21|s1", Value: json.RawMessage(`{"id":"s1","period":"1st","originalTeacher":"Mrs. A","substituteTeacher":"Mr. B","className":"VI A","subject":"Maths","status":"PENDING","assignedBy":"Mrs. R. Pahwa"}`), TS: 1000, By: "dev"},
		{Key: "sub|2026-10-20|s0", Value: json.RawMessage(`{"id":"s0","period":"2nd","status":"COVERED","disputeRemark":"clash"}`), TS: 900, By: "dev"},
		{Key: "abs|2026-10-21|Mrs.%20A", Value: json.RawMessage(`{"teacherName":"Mrs. A"}`), TS: 900, By: "dev"},
	})
	if err := b.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	subs := f.data["Subs"]
	if len(subs) != 3 || subs[1][0] != "sub|2026-10-20|s0" || subs[2][5] != "Mr. B" || subs[2][11] != "Mrs. R. Pahwa" || subs[2][12] != "2.0.0-test" {
		t.Fatalf("subs rows: %v", subs)
	}
	if !strings.Contains(subs[1][9], "Dispute: clash") {
		t.Fatalf("note: %v", subs[1])
	}
	// Delete s1 and edit s0: rows are updated in place, never removed.
	live.Merge([]livesync.Entity{
		{Key: "sub|2026-10-21|s1", Value: json.RawMessage(`null`), TS: 2000, By: "dev"},
		{Key: "sub|2026-10-20|s0", Value: json.RawMessage(`{"id":"s0","period":"2nd","status":"ACCEPTED"}`), TS: 2000, By: "dev"},
	})
	if err := b.Flush(ctx); err != nil {
		t.Fatal(err)
	}
	subs = f.data["Subs"]
	if len(subs) != 3 || subs[2][8] != "REMOVED" || subs[2][5] != "" || subs[1][8] != "ACCEPTED" {
		t.Fatalf("upsert: %v", subs)
	}
	meta := map[string]string{}
	for _, r := range f.data["App_Meta"][1:] {
		meta[r[0]] = r[1]
	}
	if meta["app_version"] != "2.0.0-test" || meta["schema_version"] != SchemaVersion || meta["last_updated"] == "" {
		t.Fatalf("meta: %v", meta)
	}
	if len(f.data["App_Log"]) != 3 {
		t.Fatalf("log rows: %v", f.data["App_Log"])
	}
	onlyAppOwned(t, f)
	for n, want := range before {
		raw, _ := json.Marshal(f.data[n])
		if string(raw) != want {
			t.Fatalf("owner tab %s changed", n)
		}
	}
}

func TestRefusesForeignTabWithAppName(t *testing.T) {
	f := newFake()
	f.add("Subs", false, [][]string{{"Owner's own list"}, {"keep me"}})
	b := New(f, newLive(), Config{})
	if err := b.EnsureTabs(context.Background()); !errors.Is(err, ErrNotAppOwned) {
		t.Fatalf("want ErrNotAppOwned, got %v", err)
	}
	if err := b.Flush(context.Background()); !errors.Is(err, ErrNotAppOwned) {
		t.Fatalf("flush: %v", err)
	}
	if f.data["Subs"][1][0] != "keep me" {
		t.Fatal("foreign Subs tab was overwritten")
	}
}

func TestWriteLoopDebouncesAndRetries(t *testing.T) {
	f := newFake()
	live := newLive()
	b := New(f, live, Config{Debounce: 20 * time.Millisecond, MaxDelay: 200 * time.Millisecond, MaxBackoff: 40 * time.Millisecond})
	if err := b.EnsureTabs(context.Background()); err != nil {
		t.Fatal(err)
	}
	f.mu.Lock()
	f.writes, f.fail = nil, 2 // the first two write calls fail: backoff, then succeed
	f.mu.Unlock()

	ctx, cancel := context.WithCancel(context.Background())
	var wg sync.WaitGroup
	wg.Add(1)
	go func() { defer wg.Done(); b.writeLoop(ctx) }()
	for i := 0; i < 5; i++ { // a burst of edits becomes one flush
		live.Merge([]livesync.Entity{{Key: "sub|2026-10-21|s1", Value: json.RawMessage(`{"id":"s1","status":"PENDING"}`), TS: int64(10 + i), By: "d"}})
		b.NotifyChanged()
		time.Sleep(5 * time.Millisecond)
	}
	deadline := time.Now().Add(3 * time.Second)
	for b.Status().State != "ok" && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	cancel()
	wg.Wait()
	if b.Status().State != "ok" || len(f.data["Subs"]) != 2 {
		t.Fatalf("status %+v rows %v writes %v", b.Status(), f.data["Subs"], f.touched())
	}
	subsWrites := 0
	for _, w := range f.touched() {
		if w == "write:Subs" {
			subsWrites++
		}
	}
	// 2 failed attempts + 1 success; without debouncing there would be 5+.
	if subsWrites > 3 {
		t.Fatalf("not debounced: %v", f.touched())
	}
	onlyAppOwned(t, f)
}

func TestNextBackoff(t *testing.T) {
	d := time.Duration(0)
	seq := []time.Duration{}
	for i := 0; i < 12; i++ {
		d = nextBackoff(d, 5*time.Minute)
		seq = append(seq, d)
	}
	if seq[0] != time.Second || seq[1] != 2*time.Second || seq[len(seq)-1] != 5*time.Minute {
		t.Fatalf("backoff %v", seq)
	}
}
