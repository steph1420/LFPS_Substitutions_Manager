package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lfps/server/internal/handlers"
	"lfps/server/internal/livesync"
	"lfps/server/internal/relay"
	"lfps/server/internal/schooltz"
	"lfps/server/internal/ws"
)

func testRouter(loc *time.Location) http.Handler {
	hub := ws.NewHub(nil)
	store := livesync.NewStore(loc)
	rl := relay.New(store, hub)
	go hub.Run()
	return newRouter(store, hub, rl, handlers.ParseOriginPolicy(""))
}

func TestRouter(t *testing.T) {
	r := testRouter(time.UTC)

	cases := []struct {
		method, path, origin string
		want                 int
	}{
		{"GET", "/api/v1/health", "", 200},
		{"GET", "/api/v1/state", "https://steph1420.github.io", 200},
		{"OPTIONS", "/api/v1/substitutions/assign", "https://steph1420.github.io", 204},
		{"GET", "/api/v1/state", "https://evil.example", 403},
		{"HEAD", "/api/v1/health", "", 200}, // uptime pingers (BUG-31)
		{"GET", "/api/v1/backups", "", 404}, // removed under the relay model (BUG-27)
		// REST mutations were removed in Bundle 35 (edits travel over the WebSocket).
		{"POST", "/api/v1/absence/toggle", "", 404},
		{"POST", "/api/v1/availability", "", 404},
		{"POST", "/api/v1/substitutions/assign", "", 404},
		{"DELETE", "/api/v1/substitutions", "", 404},
	}
	for _, c := range cases {
		req := httptest.NewRequest(c.method, c.path, nil)
		if c.origin != "" {
			req.Header.Set("Origin", c.origin)
		}
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != c.want {
			t.Errorf("%s %s (%s): got %d want %d", c.method, c.path, c.origin, rec.Code, c.want)
		}
	}
	_ = http.StatusOK
}

func TestHealthReportsSchoolTimeZone(t *testing.T) {
	zone := schooltz.Resolve(func(string) string { return "" }) // no env: default
	r := testRouter(zone.Location)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest("GET", "/api/v1/health", nil))
	var body handlers.HealthResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body.TimeZone != "Asia/Kolkata" {
		t.Fatalf("timeZone = %q", body.TimeZone)
	}
	if _, offset := body.Timestamp.Zone(); offset != 5*3600+30*60 {
		t.Fatalf("timestamp offset = %d, want +05:30", offset)
	}
	if body.Mode != relay.ModeRelayOnly {
		t.Fatalf("mode = %q", body.Mode)
	}
}

func TestReadSheetsEnv(t *testing.T) {
	env := func(m map[string]string) func(string) string { return func(k string) string { return m[k] } }
	yes := func(string) bool { return true }
	no := func(string) bool { return false }

	if _, off := readSheetsEnv(env(nil), yes); off == "" {
		t.Fatal("no env should be relay-only")
	}
	if _, off := readSheetsEnv(env(map[string]string{"SHEETS_SPREADSHEET_ID": "abc"}), yes); off == "" {
		t.Fatal("missing credentials should be relay-only")
	}
	full := map[string]string{"SHEETS_SPREADSHEET_ID": "abc", "GOOGLE_APPLICATION_CREDENTIALS": "/etc/secrets/sa.json"}
	if _, off := readSheetsEnv(env(full), no); off == "" {
		t.Fatal("missing credentials file should be relay-only")
	}
	cfg, off := readSheetsEnv(env(full), yes)
	if off != "" || cfg.SpreadsheetID != "abc" || cfg.PullInterval != 5*time.Minute || cfg.Log {
		t.Fatalf("cfg %+v off %q", cfg, off)
	}
	full["SHEETS_PULL_INTERVAL"], full["SHEETS_LOG"] = "10m", "1"
	if cfg, _ = readSheetsEnv(env(full), yes); cfg.PullInterval != 10*time.Minute || !cfg.Log {
		t.Fatalf("overrides: %+v", cfg)
	}
	full["SHEETS_PULL_INTERVAL"] = "5s" // too fast for the Sheets quota: ignored
	if cfg, _ = readSheetsEnv(env(full), yes); cfg.PullInterval != 5*time.Minute {
		t.Fatalf("floor: %+v", cfg)
	}
	if cfg.HydrateTimeout != 20*time.Second || cfg.FakeFile != "" {
		t.Fatalf("hydrate defaults: %+v", cfg)
	}
	// The fake Sheet is for local tests only: a real spreadsheet ID always wins.
	full["SHEETS_FAKE_FILE"] = "/tmp/fake.json"
	if cfg, off = readSheetsEnv(env(full), yes); off != "" || cfg.FakeFile != "" {
		t.Fatalf("fake must yield to a real sheet: %+v", cfg)
	}
	fake := map[string]string{"SHEETS_FAKE_FILE": "/tmp/fake.json", "SHEETS_HYDRATE_TIMEOUT": "3s"}
	if cfg, off = readSheetsEnv(env(fake), no); off != "" || cfg.FakeFile != "/tmp/fake.json" || cfg.HydrateTimeout != 3*time.Second {
		t.Fatalf("fake: %+v %q", cfg, off)
	}
}
