package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"lfps/server/internal/handlers"
	"lfps/server/internal/storage"
	"lfps/server/internal/version"
	"lfps/server/internal/ws"
)

// newRouter wires the stateless relay. Exposed for tests.
func newRouter(store *storage.Store, hub *ws.Hub, origins *handlers.OriginPolicy) http.Handler {
	api := handlers.NewAPIHandler(store, hub)
	mux := http.NewServeMux()

	// System & Metadata
	mux.HandleFunc("GET /api/v1/health", handlers.HealthHandler)
	mux.HandleFunc("GET /api/v1/meta", handlers.MetaHandler)

	// Live week state (in-memory relay cache) & mutations. Preflights are answered by CORS.
	mux.HandleFunc("GET /api/v1/state", api.GetState)
	mux.HandleFunc("POST /api/v1/absence/toggle", api.ToggleAbsence)
	mux.HandleFunc("POST /api/v1/availability", api.SetAvailability)
	mux.HandleFunc("POST /api/v1/substitutions/assign", api.AssignSubstitution)
	mux.HandleFunc("DELETE /api/v1/substitutions", api.RemoveSubstitution)

	// Excel export (FEAT-25), streamed only. The old GET /api/v1/backups route was removed
	// under the relay model (BUG-27): the server keeps no files; Google Sheets is the archive.
	mux.HandleFunc("GET /api/v1/export/excel", api.ExportExcel)

	// Real-time WebSocket endpoint
	mux.HandleFunc("GET /api/v1/ws", hub.ServeWS)

	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "LFPS Substitutions live relay v%s - operational", version.Version)
	})

	return handlers.CORS(origins, mux)
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if os.Getenv("DATA_DIR") != "" {
		log.Println("[Server] DATA_DIR is ignored: the relay is stateless (Google Sheets is the source of truth)")
	}

	origins := handlers.ParseOriginPolicy(os.Getenv("ALLOWED_ORIGINS"))
	store := storage.NewStore()
	hub := ws.NewHub(origins.Allowed)
	go hub.Run()

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           newRouter(store, hub, origins),
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Printf("[Server] LFPS relay v%s on :%s (TZ %s), allowed origins: %v", version.Version, port, time.Local, origins.Origins())
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("[Server Fatal] %v", err)
	}
}
