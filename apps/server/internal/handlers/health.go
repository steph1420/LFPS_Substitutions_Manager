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
}

var startTime = time.Now()

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	resp := HealthResponse{
		Status:    "healthy",
		Version:   version.Version,
		Timestamp: time.Now(),
		UptimeSec: time.Since(startTime).Seconds(),
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}
