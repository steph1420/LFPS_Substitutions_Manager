package handlers

import (
	"net/http"
	"strings"
)

// DefaultAllowedOrigins: GitHub Pages (production) and local Vite dev/preview servers.
var DefaultAllowedOrigins = []string{
	"https://steph1420.github.io",
	"http://localhost:5173",
	"http://127.0.0.1:5173",
	"http://localhost:4173",
	"http://127.0.0.1:4173",
}

// OriginPolicy decides which browser origins may call the relay (HTTP and WebSocket).
type OriginPolicy struct {
	allowAll bool
	allowed  map[string]bool
}

// ParseOriginPolicy reads a comma-separated ALLOWED_ORIGINS value. Empty → defaults.
// "*" allows any origin (escape hatch; not recommended).
func ParseOriginPolicy(raw string) *OriginPolicy {
	p := &OriginPolicy{allowed: map[string]bool{}}
	list := DefaultAllowedOrigins
	if strings.TrimSpace(raw) != "" {
		list = strings.Split(raw, ",")
	}
	for _, o := range list {
		o = strings.TrimRight(strings.TrimSpace(o), "/")
		if o == "*" {
			p.allowAll = true
		} else if o != "" {
			p.allowed[strings.ToLower(o)] = true
		}
	}
	return p
}

// Allowed reports whether a request Origin may proceed. Requests without an Origin header
// (curl, Render health checks, same-origin navigations) are allowed: CORS only constrains browsers.
func (p *OriginPolicy) Allowed(origin string) bool {
	if origin == "" || p.allowAll {
		return true
	}
	return p.allowed[strings.ToLower(strings.TrimRight(origin, "/"))]
}

// Origins lists the configured origins (for start-up logging).
func (p *OriginPolicy) Origins() []string {
	if p.allowAll {
		return []string{"*"}
	}
	out := make([]string, 0, len(p.allowed))
	for o := range p.allowed {
		out = append(out, o)
	}
	return out
}

// CORS answers preflights centrally and rejects disallowed browser origins with 403.
func CORS(p *OriginPolicy, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		w.Header().Add("Vary", "Origin")
		if !p.Allowed(origin) {
			http.Error(w, "origin not allowed", http.StatusForbidden)
			return
		}
		if origin != "" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Max-Age", "600")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
