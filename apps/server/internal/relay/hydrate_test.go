package relay

import (
	"encoding/json"
	"testing"
	"time"

	"lfps/server/internal/livesync"
)

func TestHoldsDevicesUntilRehydrated(t *testing.T) {
	r, url, stop := setup(t)
	defer stop()
	fb := &fakeBridge{}
	r.SetBridge(fb)
	r.BeginHydrating()
	date := r.Store.Snapshot().WeekStart

	a := dial(t, url)
	a.next("CONNECT_ACK")
	a.send("HELLO", map[string]string{"deviceId": "devA"})
	a.send("HELLO", map[string]string{"deviceId": "devA"}) // a repeat is held once
	// An early write (an old copy of a deleted item) is refused, not merged.
	a.send("STATE_MUTATION", map[string]any{"batchId": "b1", "changes": []map[string]any{
		{"k": "sub|" + date + "|gone", "v": map[string]string{"id": "gone"}, "ts": 1000, "by": "devA"}}})
	var e struct{ Reason, BatchID string }
	if err := json.Unmarshal(a.next("ERROR"), &e); err != nil || e.Reason != "hydrating" || e.BatchID != "b1" {
		t.Fatalf("error %+v %v", e, err)
	}
	if !r.Hydrating() || len(r.Store.Snapshot().Entities) != 0 {
		t.Fatal("merged while hydrating")
	}

	r.ApplyRehydrate([]livesync.Entity{
		{Key: "sub|" + date + "|keep", Value: json.RawMessage(`{"id":"keep"}`), TS: 500, By: "devB"},
		{Key: "sub|" + date + "|gone", Value: json.RawMessage(`null`), TS: 2000, By: "devB"},
	})
	if r.Hydrating() {
		t.Fatal("still hydrating")
	}
	var h struct {
		Entities []livesync.Entity `json:"entities"`
	}
	if err := json.Unmarshal(a.next("HYDRATE"), &h); err != nil || len(h.Entities) != 2 {
		t.Fatalf("hydrate %+v %v", h, err)
	}
	// Only one HYDRATE for the repeated HELLO.
	_ = a.c.SetReadDeadline(time.Now().Add(300 * time.Millisecond))
	for {
		var pk packet
		if err := a.c.ReadJSON(&pk); err != nil {
			break
		}
		if pk.Type == "HYDRATE" {
			t.Fatal("second HYDRATE")
		}
	}
	if fb.notified.Load() == 0 {
		t.Fatal("bridge not woken after the reload")
	}
	// After the reload the stale copy loses to the tombstone.
	b := dial(t, url)
	b.send("HELLO", map[string]string{"deviceId": "devC"})
	b.next("HYDRATE")
	b.send("STATE_MUTATION", map[string]any{"batchId": "b2", "changes": []map[string]any{
		{"k": "sub|" + date + "|gone", "v": map[string]string{"id": "gone"}, "ts": 1000, "by": "devC"}}})
	var ack struct {
		Entities []livesync.Entity `json:"entities"`
	}
	if err := json.Unmarshal(b.next("MUTATION_ACK"), &ack); err != nil || len(ack.Entities) != 1 || !ack.Entities[0].Deleted() {
		t.Fatalf("ack %+v %v", ack, err)
	}
}

func TestLateRehydrateIsBroadcast(t *testing.T) {
	r, url, stop := setup(t)
	defer stop()
	r.SetBridge(&fakeBridge{})
	r.BeginHydrating()
	r.Open() // the start timeout fired: degraded, devices connect
	date := r.Store.Snapshot().WeekStart
	a := dial(t, url)
	a.send("HELLO", map[string]string{"deviceId": "devA"})
	a.next("HYDRATE")
	r.ApplyRehydrate([]livesync.Entity{{Key: "sub|" + date + "|x", Value: json.RawMessage(`{"id":"x"}`), TS: 5, By: "d"}})
	var m struct {
		Changes []livesync.Entity `json:"changes"`
		From    string            `json:"from"`
	}
	if err := json.Unmarshal(a.next("STATE_MUTATION"), &m); err != nil || m.From != "sheets" || len(m.Changes) != 1 {
		t.Fatalf("%+v %v", m, err)
	}
}
