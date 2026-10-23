package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"lfps/server/internal/handlers"
	"lfps/server/internal/livesync"
	"lfps/server/internal/relay"
	"lfps/server/internal/schooltz"
	"lfps/server/internal/sheets"
	"lfps/server/internal/version"
	"lfps/server/internal/ws"
)

// newRouter wires the live relay. Exposed for tests.
func newRouter(store *livesync.Store, hub *ws.Hub, rl *relay.Relay, origins *handlers.OriginPolicy) http.Handler {
	api := handlers.NewAPIHandler(store)
	mux := http.NewServeMux()

	// System & Metadata. GET patterns also answer HEAD (uptime pingers, BUG-31).
	mux.HandleFunc("GET /api/v1/health", handlers.HealthHandler(store.Location(), func() (string, string) {
		if st := rl.SheetsStatus(); st != nil {
			return rl.Mode(), st.State
		}
		return rl.Mode(), ""
	}))
	mux.HandleFunc("GET /api/v1/meta", handlers.MetaHandler)

	// Read-only view of the live week. Edits travel over the WebSocket (Bundle 35).
	mux.HandleFunc("GET /api/v1/state", api.GetState)

	// Excel export (FEAT-25), streamed only; the server keeps no files (BUG-27).
	mux.HandleFunc("GET /api/v1/export/excel", api.ExportExcel)

	// Real-time WebSocket endpoint (live sync).
	mux.HandleFunc("GET /api/v1/ws", hub.ServeWS)

	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "LFPS Substitutions live relay v%s - operational", version.Version)
	})

	return handlers.CORS(origins, mux)
}

// sheetsEnv is the Sheets bridge configuration read from the environment.
type sheetsEnv struct {
	SpreadsheetID   string
	CredentialsFile string
	PullInterval    time.Duration
	Log             bool
}

// readSheetsEnv returns the config, or a reason the bridge is off (relay-only mode).
// The spreadsheet ID comes from SHEETS_SPREADSHEET_ID only; it is never compiled in.
func readSheetsEnv(getenv func(string) string, exists func(string) bool) (sheetsEnv, string) {
	cfg := sheetsEnv{
		SpreadsheetID:   strings.TrimSpace(getenv("SHEETS_SPREADSHEET_ID")),
		CredentialsFile: strings.TrimSpace(getenv("GOOGLE_APPLICATION_CREDENTIALS")),
		PullInterval:    5 * time.Minute,
		Log:             getenv("SHEETS_LOG") == "1",
	}
	if v := strings.TrimSpace(getenv("SHEETS_PULL_INTERVAL")); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d >= time.Minute {
			cfg.PullInterval = d
		} else {
			log.Printf("[Sheets] SHEETS_PULL_INTERVAL %q ignored (needs a duration ≥ 1m); using 5m", v)
		}
	}
	switch {
	case cfg.SpreadsheetID == "":
		return cfg, "SHEETS_SPREADSHEET_ID is not set"
	case cfg.CredentialsFile == "":
		return cfg, "GOOGLE_APPLICATION_CREDENTIALS is not set"
	case !exists(cfg.CredentialsFile):
		return cfg, "the credentials file named by GOOGLE_APPLICATION_CREDENTIALS does not exist"
	}
	return cfg, ""
}

func fileExists(p string) bool {
	st, err := os.Stat(p)
	return err == nil && !st.IsDir()
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	if os.Getenv("DATA_DIR") != "" {
		log.Println("[Server] DATA_DIR is ignored: the relay is stateless (Google Sheets is the source of truth)")
	}

	zone := schooltz.Resolve(os.Getenv)
	if zone.Warning != "" {
		log.Printf("[Server] Time zone override ignored (%s); using %s", zone.Warning, zone.Location)
	}

	origins := handlers.ParseOriginPolicy(os.Getenv("ALLOWED_ORIGINS"))
	store := livesync.NewStore(zone.Location)
	hub := ws.NewHub(origins.Allowed)
	rl := relay.New(store, hub)
	go hub.Run()

	cfg, off := readSheetsEnv(os.Getenv, fileExists)
	if off != "" {
		log.Printf("[Sheets] Relay-only mode: %s. Devices still sync live; nothing is read from or written to Google Sheets.", off)
	} else if api, err := sheets.NewGoogleAPI(context.Background(), cfg.SpreadsheetID, cfg.CredentialsFile); err != nil {
		log.Printf("[Sheets] Relay-only mode: %v", err)
	} else {
		bridge := sheets.New(api, store, sheets.Config{
			AppVersion:   version.Version,
			PullInterval: cfg.PullInterval,
			Log:          cfg.Log,
			OnSnapshot:   rl.PublishSnapshot,
		})
		rl.SetBridge(bridge)
		go bridge.Run(context.Background())
		log.Printf("[Sheets] Bridge on: pulling read-only tabs every %s; writing only %s, %s%s",
			cfg.PullInterval, sheets.TabSubs, sheets.TabMeta, map[bool]string{true: ", " + sheets.TabLog, false: ""}[cfg.Log])
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           newRouter(store, hub, rl, origins),
		ReadHeaderTimeout: 10 * time.Second,
	}
	log.Printf("[Server] LFPS relay v%s on :%s (school time zone %s from %s, mode %s), allowed origins: %v",
		version.Version, port, zone.Location, zone.Source, rl.Mode(), origins.Origins())
	if err := srv.ListenAndServe(); err != nil {
		log.Fatalf("[Server Fatal] %v", err)
	}
}
