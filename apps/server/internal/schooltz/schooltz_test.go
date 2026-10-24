package schooltz

import (
	"testing"
	"time"
)

func env(m map[string]string) func(string) string { return func(k string) string { return m[k] } }

func TestDefaultsToKolkata(t *testing.T) {
	r := Resolve(env(nil))
	if r.Location.String() != "Asia/Kolkata" || r.Source != "default" || r.Warning != "" {
		t.Fatalf("got %s / %s / %q", r.Location, r.Source, r.Warning)
	}
	// 18:30 UTC is midnight IST: the calendar date must already be the next day.
	instant := time.Date(2026, 10, 24, 18, 30, 0, 0, time.UTC)
	if got := instant.In(r.Location).Format("2006-01-02 15:04"); got != "2026-10-25 00:00" {
		t.Fatalf("IST conversion: %s", got)
	}
}

func TestOverrideOrder(t *testing.T) {
	cases := []struct {
		name   string
		env    map[string]string
		zone   string
		source string
		warn   bool
	}{
		{"TZ only", map[string]string{"TZ": "Europe/London"}, "Europe/London", "TZ", false},
		{"APP_TZ wins over TZ", map[string]string{"APP_TZ": "Asia/Dubai", "TZ": "UTC"}, "Asia/Dubai", "APP_TZ", false},
		{"POSIX colon prefix", map[string]string{"TZ": ":Asia/Kolkata"}, "Asia/Kolkata", "TZ", false},
		{"bad APP_TZ falls through to TZ", map[string]string{"APP_TZ": "Mars/Olympus", "TZ": "UTC"}, "UTC", "TZ", true},
		{"bad values fall back to default", map[string]string{"APP_TZ": "nope", "TZ": "Local"}, "Asia/Kolkata", "default", true},
		{"blank values ignored", map[string]string{"APP_TZ": "  ", "TZ": ""}, "Asia/Kolkata", "default", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			r := Resolve(env(c.env))
			if r.Location.String() != c.zone || r.Source != c.source || (r.Warning != "") != c.warn {
				t.Fatalf("got %s / %s / %q", r.Location, r.Source, r.Warning)
			}
		})
	}
}
