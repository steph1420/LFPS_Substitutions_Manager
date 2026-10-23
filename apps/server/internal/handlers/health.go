package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"lfps/server/internal/version"
)

type HealthResponse struct {
	Status    string    `json:"status"`
	Version   string    `json:"version"`
	Timestamp time.Time `json:"timestamp"`
	UptimeSec float64   `json:"uptimeSec"`
	// TimeZone is the school calendar zone ("today" / week rollover), e.g. Asia/Kolkata.
	TimeZone string `json:"timeZone"`
}

var startTime = time.Now()

// HealthHandler reports liveness, version and the school time zone. Timestamp is given in
// that zone so a quick look at /health shows the server's idea of "now" at school.
func HealthHandler(loc *time.Location) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		resp := HealthResponse{
			Status:    "healthy",
			Version:   version.Version,
			Timestamp: time.Now().In(loc),
			UptimeSec: time.Since(startTime).Seconds(),
			TimeZone:  loc.String(),
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(resp)
	}
}
