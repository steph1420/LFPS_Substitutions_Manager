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
	}, func() string {
		if rl.Hydrating() {
			return "hydrating"
		}
		return "ready"
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
	// FakeFile is a local JSON spreadsheet for end-to-end tests (SHEETS_FAKE_FILE). Used
	// only when SHEETS_SPREADSHEET_ID is unset; never set it on Render.
	FakeFile string
	// HydrateTimeout: how long devices are held at start while Subs is reloaded.
	HydrateTimeout time.Duration
}

// readSheetsEnv returns the config, or a reason the bridge is off (relay-only mode).
// The spreadsheet ID comes from SHEETS_SPREADSHEET_ID only; it is never compiled in.
func readSheetsEnv(getenv func(string) string, exists func(string) bool) (sheetsEnv, string) {
	cfg := sheetsEnv{
		SpreadsheetID:   strings.TrimSpace(getenv("SHEETS_SPREADSHEET_ID")),
		CredentialsFile: strings.TrimSpace(getenv("GOOGLE_APPLICATION_CREDENTIALS")),
		PullInterval:    5 * time.Minute,
		Log:             getenv("SHEETS_LOG") == "1",
		FakeFile:        strings.TrimSpace(getenv("SHEETS_FAKE_FILE")),
		HydrateTimeout:  20 * time.Second,
	}
	if v := strings.TrimSpace(getenv("SHEETS_HYDRATE_TIMEOUT")); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d > 0 && d <= 5*time.Minute {
			cfg.HydrateTimeout = d
		} else {
			log.Printf("[Sheets] SHEETS_HYDRATE_TIMEOUT %q ignored (needs a duration up to 5m); using 20s", v)
		}
	}
	if v := strings.TrimSpace(getenv("SHEETS_PULL_INTERVAL")); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d >= time.Minute {
			cfg.PullInterval = d
		} else {
			log.Printf("[Sheets] SHEETS_PULL_INTERVAL %q ignored (needs a duration ≥ 1m); using 5m", v)
		}
	}
	switch {
	case cfg.SpreadsheetID == "" && cfg.FakeFile != "":
		return cfg, ""
	case cfg.SpreadsheetID == "":
		cfg.FakeFile = ""
		return cfg, "SHEETS_SPREADSHEET_ID is not set"
	case cfg.CredentialsFile == "":
		return cfg, "GOOGLE_APPLICATION_CREDENTIALS is not set"
	case !exists(cfg.CredentialsFile):
		return cfg, "the credentials file named by GOOGLE_APPLICATION_CREDENTIALS does not exist"
	}
	cfg.FakeFile = "" // a real spreadsheet always wins
	return cfg, ""
}

// startSheets turns the bridge on: devices are held ("hydrating") until the week is
// reloaded from Subs, or until cfg.HydrateTimeout, whichever comes first.
func startSheets(cfg sheetsEnv, store *livesync.Store, rl *relay.Relay) error {
	var api sheets.API
	backend := ""
	if cfg.FakeFile != "" {
		f, err := sheets.NewFileAPI(cfg.FakeFile)
		if err != nil {
			return err
		}
		api, backend = f, "fake-file"
		log.Printf("[Sheets] *** FAKE SHEET: using the local file %s (SHEETS_FAKE_FILE). Tests only. ***", cfg.FakeFile)
	} else {
		g, err := sheets.NewGoogleAPI(context.Background(), cfg.SpreadsheetID, cfg.CredentialsFile)
		if err != nil {
			return err
		}
		api = g
	}
	bridge := sheets.New(api, store, sheets.Config{
		AppVersion:   version.Version,
		PullInterval: cfg.PullInterval,
		Log:          cfg.Log,
		Backend:      backend,
		OnSnapshot:   rl.PublishSnapshot,
		OnRehydrate:  func(res sheets.RehydrateResult) { rl.ApplyRehydrate(res.Entities) },
	})
	rl.SetBridge(bridge)
	rl.BeginHydrating()
	time.AfterFunc(cfg.HydrateTimeout, func() {
		if rl.Hydrating() {
			log.Printf("[Sheets] Subs not reloaded after %s: opening for devices anyway; Sheets writes wait for the reload", cfg.HydrateTimeout)
			rl.Open()
		}
	})
	go bridge.Run(context.Background())
	log.Printf("[Sheets] Bridge on: pulling read-only tabs every %s; writing only %s, %s%s",
		cfg.PullInterval, sheets.TabSubs, sheets.TabMeta, map[bool]string{true: ", " + sheets.TabLog, false: ""}[cfg.Log])
	return nil
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
	} else if err := startSheets(cfg, store, rl); err != nil {
		log.Printf("[Sheets] Relay-only mode: %v", err)
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
