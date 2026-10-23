package relay

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"lfps/server/internal/livesync"
	"lfps/server/internal/sheets"
	"lfps/server/internal/ws"
)

type packet struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type peer struct {
	t *testing.T
	c *websocket.Conn
}

func (p peer) send(typ string, payload any) {
	p.t.Helper()
	if err := p.c.WriteJSON(map[string]any{"type": typ, "payload": payload}); err != nil {
		p.t.Fatal(err)
	}
}

// next returns the next packet of type typ, skipping others (PRESENCE etc.).
func (p peer) next(typ string) json.RawMessage {
	p.t.Helper()
	_ = p.c.SetReadDeadline(time.Now().Add(3 * time.Second))
	for {
		var pk packet
		if err := p.c.ReadJSON(&pk); err != nil {
			p.t.Fatalf("waiting for %s: %v", typ, err)
		}
		if pk.Type == typ {
			return pk.Payload
		}
	}
}

type fakeBridge struct{ notified atomic.Int32 }

func (f *fakeBridge) NotifyChanged() { f.notified.Add(1) }
func (f *fakeBridge) Snapshot() *sheets.Snapshot {
	return &sheets.Snapshot{FetchedAt: 1, Hash: "h", Tabs: []sheets.Tab{{Name: "Staff Directory", Rows: [][]string{{"Name"}}}}}
}
func (f *fakeBridge) Status() sheets.Status { return sheets.Status{State: "ok"} }

func setup(t *testing.T) (*Relay, string, func()) {
	store := livesync.NewStore(time.UTC)
	hub := ws.NewHub(nil)
	r := New(store, hub)
	go hub.Run()
	srv := httptest.NewServer(http.HandlerFunc(hub.ServeWS))
	return r, "ws" + strings.TrimPrefix(srv.URL, "http"), srv.Close
}

func dial(t *testing.T, url string) peer {
	c, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { c.Close() })
	return peer{t, c}
}

func TestHydrateMutateBroadcast(t *testing.T) {
	r, url, stop := setup(t)
	defer stop()
	week := r.Store.Snapshot().WeekStart
	key := "oac|" + week

	a := dial(t, url)
	var ack struct {
		Clients int
		Mode    string
	}
	_ = json.Unmarshal(a.next("CONNECT_ACK"), &ack)
	if ack.Clients != 1 {
		t.Fatalf("ack %+v", ack)
	}
	a.send("HELLO", map[string]string{"deviceId": "dev-a", "appVersion": "t"})
	var hyd struct {
		WeekStart string
		Mode      string
		Entities  []livesync.Entity
	}
	_ = json.Unmarshal(a.next("HYDRATE"), &hyd)
	if hyd.WeekStart != week || hyd.Mode != ModeRelayOnly || len(hyd.Entities) != 0 {
		t.Fatalf("hydrate %+v", hyd)
	}

	b := dial(t, url)
	b.next("CONNECT_ACK")
	b.send("HELLO", map[string]string{"deviceId": "dev-b"})
	b.next("HYDRATE")
	var pres struct{ Clients int }
	_ = json.Unmarshal(a.next("PRESENCE"), &pres)
	if pres.Clients != 2 {
		t.Fatalf("presence %+v", pres)
	}

	now := time.Now().UnixMilli()
	a.send("STATE_MUTATION", map[string]any{"batchId": "b1", "changes": []livesync.Entity{{Key: key, Value: json.RawMessage(`"Mrs. X"`), TS: now, By: "dev-a"}}})
	var mack struct {
		BatchID  string
		Entities []livesync.Entity
	}
	_ = json.Unmarshal(a.next("MUTATION_ACK"), &mack)
	if mack.BatchID != "b1" || len(mack.Entities) != 1 || mack.Entities[0].Rev != 1 {
		t.Fatalf("mutation ack %+v", mack)
	}
	var bc struct {
		Changes []livesync.Entity
		From    string
	}
	_ = json.Unmarshal(b.next("STATE_MUTATION"), &bc)
	if len(bc.Changes) != 1 || string(bc.Changes[0].Value) != `"Mrs. X"` || bc.From != "dev-a" {
		t.Fatalf("broadcast %+v", bc)
	}

	// A late, older write from B loses: B's ACK carries the winner; A gets nothing.
	b.send("STATE_MUTATION", map[string]any{"batchId": "b2", "changes": []livesync.Entity{{Key: key, Value: json.RawMessage(`"old"`), TS: now - 10, By: "dev-b"}}})
	_ = json.Unmarshal(b.next("MUTATION_ACK"), &mack)
	if string(mack.Entities[0].Value) != `"Mrs. X"` {
		t.Fatalf("loser ack %+v", mack)
	}

	// A third device joining later hydrates with the current state.
	c := dial(t, url)
	c.send("HELLO", map[string]string{"deviceId": "dev-c"})
	_ = json.Unmarshal(c.next("HYDRATE"), &hyd)
	if len(hyd.Entities) != 1 || string(hyd.Entities[0].Value) != `"Mrs. X"` {
		t.Fatalf("late hydrate %+v", hyd)
	}
}

func TestSheetsModeSendsSnapshotAndNotifies(t *testing.T) {
	r, url, stop := setup(t)
	defer stop()
	fb := &fakeBridge{}
	r.SetBridge(fb)
	a := dial(t, url)
	a.send("HELLO", map[string]string{"deviceId": "dev-a"})
	var hyd struct{ Mode string }
	_ = json.Unmarshal(a.next("HYDRATE"), &hyd)
	if hyd.Mode != ModeSheets {
		t.Fatalf("mode %q", hyd.Mode)
	}
	var snap sheets.Snapshot
	_ = json.Unmarshal(a.next("SHEETS_SNAPSHOT"), &snap)
	if len(snap.Tabs) != 1 || snap.Tabs[0].Name != "Staff Directory" {
		t.Fatalf("snapshot %+v", snap)
	}
	key := "sub|" + r.Store.Snapshot().WeekStart + "|s1"
	a.send("STATE_MUTATION", map[string]any{"batchId": "x", "changes": []livesync.Entity{{Key: key, Value: json.RawMessage(`{"id":"s1"}`), TS: 5, By: "dev-a"}}})
	a.next("MUTATION_ACK")
	if fb.notified.Load() != 1 {
		t.Fatalf("bridge not notified: %d", fb.notified.Load())
	}
}

func TestBadPackets(t *testing.T) {
	_, url, stop := setup(t)
	defer stop()
	a := dial(t, url)
	_ = a.c.WriteMessage(websocket.TextMessage, []byte("not json"))
	a.next("ERROR")
	a.send("STATE_MUTATION", "nope")
	a.next("ERROR")
	a.send("WHAT", nil)
	a.next("ERROR")
	a.send("PING", nil)
	a.next("PONG")
	var rej struct{ Rejected []livesync.Rejection }
	a.send("STATE_MUTATION", map[string]any{"batchId": "z", "changes": []livesync.Entity{{Key: "evil|x", TS: 1, By: "a"}}})
	_ = json.Unmarshal(a.next("MUTATION_ACK"), &rej)
	if len(rej.Rejected) != 1 {
		t.Fatalf("rejected %+v", rej)
	}
}
