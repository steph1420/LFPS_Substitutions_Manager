package relay

import (
	"encoding/json"
	"os"
	"testing"

	"lfps/server/internal/livesync"
	"lfps/server/internal/ws"
)

func TestFilterAdminPrivilegedDefaultOff(t *testing.T) {
	os.Unsetenv("LFPS_REQUIRE_ADMIN_TOKEN")
	c := &ws.Client{}
	changes := []livesync.Entity{
		{Key: "sched|2026-10-21|1st|T", Value: json.RawMessage(`"X"`), TS: 1, By: "a"},
		{Key: "sub|2026-10-21|s1", Value: json.RawMessage(`{}`), TS: 1, By: "a"},
	}
	allowed, rejected := filterAdminPrivileged(c, changes)
	if len(allowed) != 2 || len(rejected) != 0 {
		t.Fatalf("default off: got allowed=%d rejected=%d", len(allowed), len(rejected))
	}
}

func TestFilterAdminPrivilegedEnforcement(t *testing.T) {
	t.Setenv("LFPS_REQUIRE_ADMIN_TOKEN", "1")
	c := &ws.Client{}
	changes := []livesync.Entity{
		{Key: "sched|2026-10-21|1st|T", Value: json.RawMessage(`"X"`), TS: 1, By: "a"},
		{Key: "limbo|2026-10-21", Value: json.RawMessage(`[]`), TS: 1, By: "a"},
		{Key: "sub|2026-10-21|s1", Value: json.RawMessage(`{}`), TS: 1, By: "a"},
		{Key: "abs|2026-10-21|T", Value: json.RawMessage(`{}`), TS: 1, By: "a"},
	}
	allowed, rejected := filterAdminPrivileged(c, changes)
	if len(allowed) != 2 || len(rejected) != 2 {
		t.Fatalf("enforcement: got allowed=%d rejected=%d", len(allowed), len(rejected))
	}
	for _, r := range rejected {
		if r.Reason != "admin required" {
			t.Fatalf("reason=%q", r.Reason)
		}
	}
	c.SetAdminToken("stub")
	allowed, rejected = filterAdminPrivileged(c, changes)
	if len(allowed) != 4 || len(rejected) != 0 {
		t.Fatalf("with token: got allowed=%d rejected=%d", len(allowed), len(rejected))
	}
}
