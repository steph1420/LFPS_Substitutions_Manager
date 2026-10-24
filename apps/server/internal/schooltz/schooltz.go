// Package schooltz resolves the school's time zone, which decides what "today" and the
// active school week are for the relay. It defaults to Asia/Kolkata so the server rolls
// over at midnight IST without any host configuration (Render's containers run in UTC).
//
// Override order: APP_TZ, then TZ, then the default. The IANA database is embedded in the
// binary (time/tzdata), so lookups work even in images without /usr/share/zoneinfo.
package schooltz

import (
	"fmt"
	"strings"
	"time"
	_ "time/tzdata" // embed the zone database (~450 KB) so LoadLocation never depends on the image
)

// Default is the school's IANA time zone. The web client uses the same value
// (packages/core SCHOOL_TIME_ZONE).
const Default = "Asia/Kolkata"

// Resolution describes which zone was chosen and why.
type Resolution struct {
	Location *time.Location
	// Source is "APP_TZ", "TZ" or "default".
	Source string
	// Warning is set when an override was present but unusable (the default is used instead).
	Warning string
}

// Resolve picks the zone from the environment. An invalid override never stops the server:
// it falls back to Default and reports a warning for the log.
func Resolve(getenv func(string) string) Resolution {
	var warnings []string
	for _, key := range []string{"APP_TZ", "TZ"} {
		raw := strings.TrimSpace(getenv(key))
		name := strings.TrimPrefix(raw, ":") // POSIX allows TZ=":Area/City"
		if name == "" {
			continue
		}
		if name == "Local" {
			warnings = append(warnings, fmt.Sprintf("%s=%q is not an IANA zone name", key, raw))
			continue
		}
		loc, err := time.LoadLocation(name)
		if err != nil {
			warnings = append(warnings, fmt.Sprintf("%s=%q is not a known time zone", key, raw))
			continue
		}
		return Resolution{Location: loc, Source: key, Warning: strings.Join(warnings, "; ")}
	}
	loc, err := time.LoadLocation(Default)
	if err != nil { // unreachable with time/tzdata embedded; keep the server up regardless
		return Resolution{Location: time.FixedZone("IST", 5*3600+30*60), Source: "default", Warning: err.Error()}
	}
	return Resolution{Location: loc, Source: "default", Warning: strings.Join(warnings, "; ")}
}
