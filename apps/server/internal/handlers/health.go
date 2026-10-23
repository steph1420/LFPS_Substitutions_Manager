package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"lfps/server/internal/version"
)

// HealthResponse is deliberately small: uptime pingers fetch it every few minutes, and
// HEAD requests get the headers only (Go's GET pattern also serves HEAD, BUG-31).
type HealthResponse struct {
	Status    string    `json:"status"`
	Version   string    `json:"version"`
	Timestamp time.Time `json:"timestamp"`
	UptimeSec float64   `json:"uptimeSec"`
	// TimeZone is the school calendar zone ("today" / week rollover), e.g. Asia/Kolkata.
	TimeZone string `json:"timeZone"`
	// Mode is "sheets" (Google Sheets bridge on) or "relay-only" (no credentials).
	Mode string `json:"mode"`
	// Sheets is the bridge state in sheets mode: starting | ok | error.
	Sheets string `json:"sheets,omitempty"`
}

// ModeFunc reports the relay mode and, in sheets mode, the bridge state.
type ModeFunc func() (mode, sheets string)

var startTime = time.Now()

// HealthHandler reports liveness, version, the school time zone and the relay mode.
// Timestamp is given in the school zone so /health shows the server's idea of "now".
func HealthHandler(loc *time.Location, mode ModeFunc) http.HandlerFunc {
	if mode == nil {
		mode = func() (string, string) { return "relay-only", "" }
	}
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		m, s := mode()
		resp := HealthResponse{
			Status:    "healthy",
			Version:   version.Version,
			Timestamp: time.Now().In(loc),
			UptimeSec: time.Since(startTime).Seconds(),
			TimeZone:  loc.String(),
			Mode:      m,
			Sheets:    s,
		}
		w.WriteHeader(http.StatusOK)
		if r.Method == http.MethodHead {
			return
		}
		_ = json.NewEncoder(w).Encode(resp)
	}
}
