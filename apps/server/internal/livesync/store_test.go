package livesync

import (
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"
)

type clock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *clock) Now() time.Time  { c.mu.Lock(); defer c.mu.Unlock(); return c.t }
func (c *clock) Set(t time.Time) { c.mu.Lock(); c.t = t; c.mu.Unlock() }

// Wed 21 Oct 2026, 09:00 UTC; the active week starts Mon 19 Oct.
func newTestStore() (*Store, *clock) {
	c := &clock{t: time.Date(2026, 10, 21, 9, 0, 0, 0, time.UTC)}
	return NewStoreWithClock(c.Now), c
}

func ent(k, v string, ts int64, by string) Entity {
	var raw json.RawMessage
	if v != "" {
		raw = json.RawMessage(v)
	}
	return Entity{Key: k, Value: raw, TS: ts, By: by}
}

func TestParseKey(t *testing.T) {
	good := []string{"abs|2026-10-19|Mrs.%20A", "sub|2026-10-20|x1", "avail|2026-10-19|T", "oac|2026-10-21",
		"oct|2026-10-21|VI%20A", "sched|2026-10-22|1st|T", "limbo|2026-10-23"}
	for _, k := range good {
		if _, _, ok := ParseKey(k); !ok {
			t.Errorf("rejected %q", k)
		}
	}
	bad := []string{"", "abs", "nope|2026-10-19|x", "abs|2026-13-40|x", "abs|2026-10-19", "oac|2026-10-19|x", "sub|2026-10-19|", "sched|2026-10-19|1st"}
	for _, k := range bad {
		if _, _, ok := ParseKey(k); ok {
			t.Errorf("accepted %q", k)
		}
	}
}

func TestLastWriterWinsWithTieBreak(t *testing.T) {
	s, _ := newTestStore()
	k := "oac|2026-10-21"
	r := s.Merge([]Entity{ent(k, `"A"`, 100, "dev-a")})
	if len(r.Accepted) != 1 || r.Accepted[0].Rev != 1 {
		t.Fatalf("first write: %+v", r)
	}
	// Older write loses; the sender is told the current value.
	r = s.Merge([]Entity{ent(k, `"B"`, 99, "dev-b")})
	if len(r.Accepted) != 0 || len(r.Stored) != 1 || string(r.Stored[0].Value) != `"A"` {
		t.Fatalf("older write should lose: %+v", r)
	}
	// Same ts: the higher device id wins, deterministically on every node.
	r = s.Merge([]Entity{ent(k, `"B"`, 100, "dev-b")})
	if len(r.Accepted) != 1 {
		t.Fatalf("tie-break: %+v", r)
	}
	r = s.Merge([]Entity{ent(k, `"A2"`, 100, "dev-a")})
	if len(r.Accepted) != 0 {
		t.Fatalf("tie-break must be stable: %+v", r)
	}
	// Re-sending the identical write is a no-op (idempotent retries from an outbox).
	r = s.Merge([]Entity{ent(k, `"B"`, 100, "dev-b")})
	if len(r.Accepted) != 0 || s.Rev() != 2 {
		t.Fatalf("idempotent: %+v rev %d", r, s.Rev())
	}
}

func TestTombstonesBeatOlderWrites(t *testing.T) {
	s, _ := newTestStore()
	k := "sub|2026-10-21|s1"
	s.Merge([]Entity{ent(k, `{"id":"s1"}`, 100, "a")})
	r := s.Merge([]Entity{ent(k, "null", 200, "b")})
	if len(r.Accepted) != 1 || !r.Accepted[0].Deleted() {
		t.Fatalf("delete: %+v", r)
	}
	r = s.Merge([]Entity{ent(k, `{"id":"s1"}`, 150, "a")})
	if len(r.Accepted) != 0 {
		t.Fatal("an older write must not resurrect a deleted entity")
	}
	if snap := s.Snapshot(); len(snap.Entities) != 1 || !snap.Entities[0].Deleted() {
		t.Fatalf("tombstone kept: %+v", snap)
	}
	if subs := s.Substitutions(); len(subs) != 1 || !subs[0].Deleted || subs[0].Sub.ID != "s1" {
		t.Fatalf("subs view: %+v", subs)
	}
	if st := s.DailyState(); len(st.Substitutions) != 0 {
		t.Fatalf("deleted sub in DailyState: %+v", st.Substitutions)
	}
}

func TestValidation(t *testing.T) {
	s, c := newTestStore()
	now := c.Now().UnixMilli()
	big := `"` + string(make([]byte, MaxValueSize)) + `"`
	cases := []Entity{
		ent("abs|2026-10-12|T", `{}`, now, "a"),   // last week
		ent("abs|2026-10-25|T", `{}`, now, "a"),   // Sunday
		ent("avail|2026-10-20|T", `{}`, now, "a"), // availability is keyed by week start
		ent("abs|2026-10-19|T", `{`, now, "a"),    // not JSON
		ent("abs|2026-10-19|T", `{}`, 0, "a"),     // no ts
		ent("abs|2026-10-19|T", `{}`, now, ""),    // no device
		ent("evil|2026-10-19|T", `{}`, now, "a"),
		ent("abs|2026-10-19|T", big, now, "a"),
	}
	r := s.Merge(cases)
	if len(r.Rejected) != len(cases) || len(r.Accepted) != 0 {
		t.Fatalf("want all rejected, got %+v", r.Rejected)
	}
	if r := s.Merge([]Entity{ent("avail|2026-10-19|T", `{"teacherName":"T"}`, now, "a"), ent("limbo|2026-10-24", `[]`, now, "a")}); len(r.Accepted) != 2 {
		t.Fatalf("valid: %+v", r)
	}
}

func TestFutureTimestampsAreClamped(t *testing.T) {
	s, c := newTestStore()
	now := c.Now().UnixMilli()
	k := "oac|2026-10-21"
	r := s.Merge([]Entity{ent(k, `"fast clock"`, now+int64(24*time.Hour/time.Millisecond), "a")})
	if r.Accepted[0].TS != now {
		t.Fatalf("not clamped: %d", r.Accepted[0].TS)
	}
	// A device with a correct clock can still overwrite it a moment later.
	if r := s.Merge([]Entity{ent(k, `"fixed"`, now+1, "b")}); len(r.Accepted) != 1 {
		t.Fatal("clamped write should not block later edits")
	}
	// Small skew (under MaxClockSkew) is kept as is.
	if r := s.Merge([]Entity{ent(k, `"ok"`, now+60_000, "c")}); r.Accepted[0].TS != now+60_000 {
		t.Fatal("small skew should not be clamped")
	}
}

func TestWeekRolloverResets(t *testing.T) {
	s, c := newTestStore()
	s.Merge([]Entity{ent("oac|2026-10-21", `"A"`, 1, "a")})
	c.Set(time.Date(2026, 10, 25, 9, 0, 0, 0, time.UTC)) // Sunday: next week is active
	snap := s.Snapshot()
	if snap.WeekStart != "2026-10-26" || len(snap.Entities) != 0 {
		t.Fatalf("rollover: %+v", snap)
	}
}

func TestWeekRollsOverAtSchoolMidnight(t *testing.T) {
	ist, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		t.Fatal(err)
	}
	satLate := time.Date(2026, 10, 24, 18, 29, 0, 0, time.UTC)  // Sat 23:59 IST
	sunEarly := time.Date(2026, 10, 24, 18, 30, 0, 0, time.UTC) // Sun 00:00 IST
	if got := NewStoreWithClock(func() time.Time { return satLate.In(ist) }).Snapshot().WeekStart; got != "2026-10-19" {
		t.Fatalf("Sat 23:59 IST: week %s", got)
	}
	if got := NewStoreWithClock(func() time.Time { return sunEarly.In(ist) }).Snapshot().WeekStart; got != "2026-10-26" {
		t.Fatalf("Sun 00:00 IST: week %s", got)
	}
	if NewStore(ist).Location() != ist {
		t.Fatal("NewStore must keep its zone")
	}
}

func TestDailyStateMapsDatesToDays(t *testing.T) {
	s, _ := newTestStore()
	s.Merge([]Entity{
		ent("abs|2026-10-23|Mrs.%20A", `{"teacherName":"Mrs. A","type":"FULL_DAY"}`, 5, "a"),
		ent("oct|2026-10-22|VI%20A", `"Mr. B"`, 6, "a"),
		ent("avail|2026-10-19|Mr.%20C", `{"teacherName":"Mr. C","isAvailable":false}`, 7, "a"),
		ent("sub|2026-10-24|s9", `{"id":"s9","period":"2nd","status":"PENDING"}`, 8, "a"),
	})
	st := s.DailyState()
	if st.Date != "2026-10-21" || st.SelectedDay != "WED" || st.WeekStart != "2026-10-19" || st.UpdatedAt != 8 {
		t.Fatalf("header: %+v", st)
	}
	if st.Absences[0].Day != "FRI" || st.OfficiatingCT["THU"]["VI A"] != "Mr. B" || st.Substitutions[0].Day != "SAT" {
		t.Fatalf("days: %+v", st)
	}
	if _, ok := st.Availability["Mr. C"]; !ok {
		t.Fatalf("availability: %+v", st.Availability)
	}
}

func TestSnapshotIsSortedAndIndependent(t *testing.T) {
	s, _ := newTestStore()
	s.Merge([]Entity{ent("oac|2026-10-22", `"B"`, 1, "a"), ent("oac|2026-10-21", `"A"`, 1, "a")})
	snap := s.Snapshot()
	if snap.Entities[0].Key != "oac|2026-10-21" {
		t.Fatal("not sorted")
	}
	snap.Entities[0].Value[1] = 'Z'
	if string(s.Snapshot().Entities[0].Value) != `"A"` {
		t.Fatal("snapshot aliases the store")
	}
}

func TestEntityCap(t *testing.T) {
	s, _ := newTestStore()
	batch := make([]Entity, 0, MaxEntities+5)
	for i := 0; i < MaxEntities+5; i++ {
		batch = append(batch, ent(fmt.Sprintf("sub|2026-10-21|%d", i), `{}`, 1, "a"))
	}
	r := s.Merge(batch)
	if len(r.Accepted) != MaxEntities || len(r.Rejected) != 5 {
		t.Fatalf("cap: %d accepted %d rejected", len(r.Accepted), len(r.Rejected))
	}
	// Updating an existing entity still works when full.
	if r := s.Merge([]Entity{ent("sub|2026-10-21|1", `{"x":1}`, 2, "a")}); len(r.Accepted) != 1 {
		t.Fatal("update at cap")
	}
}

func TestConcurrentMerges(t *testing.T) {
	s, _ := newTestStore()
	var wg sync.WaitGroup
	for i := 0; i < 16; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			for j := 0; j < 200; j++ {
				s.Merge([]Entity{ent("oac|2026-10-21", fmt.Sprintf(`"%d"`, j), int64(j+1), fmt.Sprintf("d%02d", i))})
				_ = s.Snapshot()
				_ = s.DailyState()
			}
		}(i)
	}
	wg.Wait()
	// Every node converges on the same winner: highest ts, then highest device id.
	got := s.Snapshot().Entities[0]
	if got.TS != 200 || got.By != "d15" {
		t.Fatalf("winner %+v", got)
	}
}
