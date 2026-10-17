package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"lfps/server/internal/handlers"
	"lfps/server/internal/storage"
	"lfps/server/internal/ws"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = "data"
	}

	store, err := storage.NewStore(dataDir)
	if err != nil {
		log.Fatalf("[Store Error] Failed to initialize storage: %v\n", err)
	}

	backupDir := filepath.Join(dataDir, "backups")

	hub := ws.NewHub()
	go hub.Run()

	api := handlers.NewAPIHandler(store, hub, backupDir)

	mux := http.NewServeMux()

	// System & Metadata
	mux.HandleFunc("GET /api/v1/health", handlers.HealthHandler)
	mux.HandleFunc("GET /api/v1/meta", handlers.MetaHandler)

	// State & Mutations
	mux.HandleFunc("GET /api/v1/state", api.GetState)
	mux.HandleFunc("POST /api/v1/absence/toggle", api.ToggleAbsence)
	mux.HandleFunc("OPTIONS /api/v1/absence/toggle", api.ToggleAbsence)
	mux.HandleFunc("POST /api/v1/availability", api.SetAvailability)
	mux.HandleFunc("OPTIONS /api/v1/availability", api.SetAvailability)
	mux.HandleFunc("POST /api/v1/substitutions/assign", api.AssignSubstitution)
	mux.HandleFunc("OPTIONS /api/v1/substitutions/assign", api.AssignSubstitution)
	mux.HandleFunc("DELETE /api/v1/substitutions", api.RemoveSubstitution)
	mux.HandleFunc("OPTIONS /api/v1/substitutions", api.RemoveSubstitution)

	// Excel Exports & Backups (FEAT-25)
	mux.HandleFunc("GET /api/v1/export/excel", api.ExportExcel)
	mux.HandleFunc("GET /api/v1/backups", api.ListBackups)

	// Real-Time WebSocket Endpoint
	mux.HandleFunc("GET /api/v1/ws", hub.ServeWS)

	// Root Status Handler
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "LFPS Substitutions & Routine Suite API (Go 1.23 Engine) - Operational")
	})

	serverAddr := fmt.Sprintf(":%s", port)
	log.Printf("[Server] LFPS Core API listening on http://localhost%s (WebSocket active at /api/v1/ws)\n", serverAddr)
	if err := http.ListenAndServe(serverAddr, mux); err != nil {
		log.Fatalf("[Server Fatal] %v\n", err)
	}
}
