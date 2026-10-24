package storage

import (
	"testing"
	"time"
)

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
