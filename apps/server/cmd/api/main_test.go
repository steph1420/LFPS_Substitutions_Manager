package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"lfps/server/internal/handlers"
	"lfps/server/internal/storage"
	"lfps/server/internal/ws"
)

func TestRouter(t *testing.T) {
	hub := ws.NewHub(nil)
	go hub.Run()
	r := newRouter(storage.NewStore(), hub, handlers.ParseOriginPolicy(""))

	cases := []struct {
		method, path, origin string
		want                 int
	}{
		{"GET", "/api/v1/health", "", 200},
		{"GET", "/api/v1/state", "https://steph1420.github.io", 200},
		{"OPTIONS", "/api/v1/substitutions/assign", "https://steph1420.github.io", 204},
		{"GET", "/api/v1/state", "https://evil.example", 403},
		{"GET", "/api/v1/backups", "", 404}, // removed under the relay model (BUG-27)
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
