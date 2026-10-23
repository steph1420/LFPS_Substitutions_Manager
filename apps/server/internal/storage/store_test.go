package storage

import (
	"errors"
	"sync"
	"testing"
	"time"
)

type clock struct {
	mu sync.Mutex
	t  time.Time
}

func (c *clock) Now() time.Time                  { c.mu.Lock(); defer c.mu.Unlock(); return c.t }
func (c *clock) Set(t time.Time)                 { c.mu.Lock(); c.t = t; c.mu.Unlock() }
func at(y int, m time.Month, d, h int) time.Time { return time.Date(y, m, d, h, 0, 0, 0, time.Local) }

func TestActiveWeekStartAndSchoolDay(t *testing.T) {
	cases := []struct {
		t         time.Time
		week, day string
	}{
		{at(2026, 10, 19, 9), "2026-10-19", "MON"},
		{at(2026, 10, 21, 9), "2026-10-19", "WED"},
		{at(2026, 10, 24, 23), "2026-10-19", "SAT"},
		{at(2026, 10, 25, 9), "2026-10-26", "MON"}, // Sunday rolls forward
	}
	for _, c := range cases {
		if got := ActiveWeekStart(c.t); got != c.week {
			t.Errorf("ActiveWeekStart(%v)=%s want %s", c.t, got, c.week)
		}
		if got := SchoolDay(c.t); got != c.day {
			t.Errorf("SchoolDay(%v)=%s want %s", c.t, got, c.day)
		}
	}
}

func TestDateComputedPerRequestAndWeekReset(t *testing.T) {
	c := &clock{t: at(2026, 10, 21, 9)}
	s := NewStoreWithClock(c.Now)
	if _, err := s.ToggleAbsence(AbsenceRecord{TeacherName: "AB", Day: "WED"}); err != nil {
		t.Fatal(err)
	}
	c.Set(at(2026, 10, 22, 9))
	st := s.GetState()
	if st.Date != "2026-10-22" || st.SelectedDay != "THU" {
		t.Fatalf("date not per request: %s %s", st.Date, st.SelectedDay)
	}
	if len(st.Absences) != 1 {
		t.Fatalf("same week should keep absences")
	}
	c.Set(at(2026, 10, 26, 8)) // next Monday
	st = s.GetState()
	if st.WeekStart != "2026-10-26" || len(st.Absences) != 0 {
		t.Fatalf("week change should reset cache, got %+v", st)
	}
}

func TestGetStateIsDeepCopy(t *testing.T) {
	s := NewStoreWithClock(func() time.Time { return at(2026, 10, 21, 9) })
	_, _ = s.ToggleAbsence(AbsenceRecord{TeacherName: "AB", Day: "WED", Periods: []string{"1st"}})
	_, _ = s.AssignSubstitution(SubstitutionAssignment{Day: "WED", Period: "1st", OriginalTeacher: "AB", Status: "COVERED"})
	s.mu.Lock()
	s.state.OfficiatingCT["WED"] = map[string]string{"IV": "CD"}
	s.mu.Unlock()

	snap := s.GetState()
	snap.Absences[0].Periods[0] = "MUTATED"
	snap.Substitutions[0].Status = "MUTATED"
	snap.OfficiatingCT["WED"]["IV"] = "MUTATED"
	snap.Availability["X"] = StaffAvailability{}

	again := s.GetState()
	if again.Absences[0].Periods[0] != "1st" || again.Substitutions[0].Status != "COVERED" ||
		again.OfficiatingCT["WED"]["IV"] != "CD" || len(again.Availability) != 0 {
		t.Fatalf("store state leaked through GetState copy: %+v", again)
	}
}

func TestSubstitutionStatusParityAndValidation(t *testing.T) {
	s := NewStoreWithClock(func() time.Time { return at(2026, 10, 21, 9) })
	for status := range ValidSubstitutionStatuses {
		if _, err := s.AssignSubstitution(SubstitutionAssignment{Day: "wed", Period: "2nd", OriginalTeacher: "AB", Status: status}); err != nil {
			t.Errorf("status %s rejected: %v", status, err)
		}
	}
	_, err := s.AssignSubstitution(SubstitutionAssignment{Day: "WED", Period: "2nd", OriginalTeacher: "AB", Status: "BOGUS"})
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("want ErrValidation, got %v", err)
	}
	st, _ := s.AssignSubstitution(SubstitutionAssignment{Day: "WED", Period: "3rd", OriginalTeacher: "AB"})
	for _, sub := range st.Substitutions {
		if sub.Period == "3rd" && sub.Status != "PENDING" {
			t.Fatalf("empty status should default to PENDING")
		}
	}
	if _, err := s.ToggleAbsence(AbsenceRecord{TeacherName: "AB", Day: "SUN"}); !errors.Is(err, ErrValidation) {
		t.Fatalf("SUN must be rejected")
	}
}

func TestConcurrentMutations(t *testing.T) {
	s := NewStore(time.UTC)
	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_, _ = s.SetAvailability(StaffAvailability{TeacherName: "T", Status: "AVAILABLE"})
			_, _ = s.ToggleAbsence(AbsenceRecord{TeacherName: "T", Day: "MON"})
			_ = s.GetState()
		}(i)
	}
	wg.Wait()
}

// The week must roll over at midnight in the school's zone, not the host's (UTC on Render).
func TestWeekRollsOverAtSchoolMidnight(t *testing.T) {
	ist, err := time.LoadLocation("Asia/Kolkata")
	if err != nil {
		t.Fatal(err)
	}
	satLate := time.Date(2026, 10, 24, 18, 29, 0, 0, time.UTC)  // Sat 23:59 IST
	sunEarly := time.Date(2026, 10, 24, 18, 30, 0, 0, time.UTC) // Sun 00:00 IST
	if got := NewStoreWithClock(func() time.Time { return satLate.In(ist) }).GetState().WeekStart; got != "2026-10-19" {
		t.Fatalf("Sat 23:59 IST: week %s", got)
	}
	if got := NewStoreWithClock(func() time.Time { return sunEarly.In(ist) }).GetState().WeekStart; got != "2026-10-26" {
		t.Fatalf("Sun 00:00 IST: week %s", got)
	}
	// The same instant read in UTC is still Saturday: this is the bug a UTC host would have.
	if got := NewStoreWithClock(func() time.Time { return sunEarly }).GetState().WeekStart; got != "2026-10-19" {
		t.Fatalf("UTC control: week %s", got)
	}
	if NewStore(ist).Location() != ist {
		t.Fatal("NewStore must keep its zone")
	}
}
