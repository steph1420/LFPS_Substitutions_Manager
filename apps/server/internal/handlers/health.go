package handlers

import (
	"encoding/json"
	"net/http"
	"time"
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
	w.Header().Set("Access-Control-Allow-Origin", "*")
	
	resp := HealthResponse{
		Status:    "healthy",
		Version:   "2.0.0-alpha.1",
		Timestamp: time.Now(),
		UptimeSec: time.Since(startTime).Seconds(),
	}

	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

