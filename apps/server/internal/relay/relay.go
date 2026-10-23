// Package relay wires the WebSocket hub to the live entity store and the Sheets bridge
// (Bundle 35). Protocol, all packets {type, payload, timestamp}:
//
//	server → device  CONNECT_ACK      {clients, mode}
//	device → server  HELLO            {deviceId, appVersion}
//	server → device  HYDRATE          {weekStart, rev, entities, mode, sheets}
//	server → device  SHEETS_SNAPSHOT  {fetchedAt, hash, tabs:[{name, rows}]}  (after HYDRATE and on change)
//	device → server  STATE_MUTATION   {batchId, changes:[entity]}
//	server → device  MUTATION_ACK     {batchId, entities, rejected}  (to the sender)
//	server → others  STATE_MUTATION   {changes, rev, from}
//	server → all     PRESENCE         {clients}
//
// See docs/SAS.md §6.3.
package relay

import (
	"encoding/json"
	"log"
	"sync"

	"lfps/server/internal/livesync"
	"lfps/server/internal/sheets"
	"lfps/server/internal/ws"
)

// Modes reported in CONNECT_ACK, HYDRATE and /health.
const (
	ModeRelayOnly = "relay-only"
	ModeSheets    = "sheets"
)

// MaxBatch is the most changes accepted in one STATE_MUTATION.
const MaxBatch = 2000

// Bridge is the part of the Sheets bridge the relay uses (nil in relay-only mode).
type Bridge interface {
	NotifyChanged()
	Snapshot() *sheets.Snapshot
	Status() sheets.Status
}

// Relay handles inbound device packets.
type Relay struct {
	Store  *livesync.Store
	Hub    *ws.Hub
	mu     sync.RWMutex
	bridge Bridge
}

// New installs the relay as the hub's message handler.
func New(store *livesync.Store, hub *ws.Hub) *Relay {
	r := &Relay{Store: store, Hub: hub}
	hub.SetHandler(r)
	return r
}

// SetBridge switches to sheets mode.
func (r *Relay) SetBridge(b Bridge) {
	r.mu.Lock()
	r.bridge = b
	r.mu.Unlock()
}

func (r *Relay) getBridge() Bridge {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.bridge
}

// Mode is relay-only or sheets.
func (r *Relay) Mode() string {
	if r.getBridge() == nil {
		return ModeRelayOnly
	}
	return ModeSheets
}

// SheetsStatus for /health (nil in relay-only mode).
func (r *Relay) SheetsStatus() *sheets.Status {
	b := r.getBridge()
	if b == nil {
		return nil
	}
	st := b.Status()
	return &st
}

// PublishSnapshot streams a changed Sheets snapshot to every device.
func (r *Relay) PublishSnapshot(s sheets.Snapshot) { r.Hub.Broadcast("SHEETS_SNAPSHOT", s) }

type hello struct {
	DeviceID   string `json:"deviceId"`
	AppVersion string `json:"appVersion"`
}

type mutation struct {
	BatchID string            `json:"batchId"`
	Changes []livesync.Entity `json:"changes"`
}

// HandleMessage implements ws.MessageHandler.
func (r *Relay) HandleMessage(c *ws.Client, msg ws.Inbound) {
	switch msg.Type {
	case "HELLO":
		var h hello
		_ = json.Unmarshal(msg.Payload, &h)
		if len(h.DeviceID) > livesync.MaxByBytes {
			h.DeviceID = h.DeviceID[:livesync.MaxByBytes]
		}
		c.SetDeviceID(h.DeviceID)
		snap := r.Store.Snapshot()
		payload := map[string]any{"weekStart": snap.WeekStart, "rev": snap.Rev, "entities": snap.Entities, "mode": r.Mode()}
		if st := r.SheetsStatus(); st != nil {
			payload["sheets"] = st
		}
		c.Send("HYDRATE", payload)
		if b := r.getBridge(); b != nil {
			if s := b.Snapshot(); s != nil {
				c.Send("SHEETS_SNAPSHOT", s)
			}
		}

	case "STATE_MUTATION":
		var m mutation
		if err := json.Unmarshal(msg.Payload, &m); err != nil {
			c.Send("ERROR", map[string]string{"reason": "malformed STATE_MUTATION"})
			return
		}
		if len(m.Changes) > MaxBatch {
			c.Send("ERROR", map[string]any{"reason": "batch too large", "batchId": m.BatchID})
			return
		}
		res := r.Store.Merge(m.Changes)
		if len(res.Rejected) > 0 {
			log.Printf("[Relay] %d change(s) rejected from %s (first: %s)", len(res.Rejected), c.DeviceID(), res.Rejected[0].Reason)
		}
		c.Send("MUTATION_ACK", map[string]any{"batchId": m.BatchID, "entities": nonNil(res.Stored), "rejected": res.Rejected})
		if len(res.Accepted) > 0 {
			r.Hub.BroadcastExcept(c, "STATE_MUTATION", map[string]any{"changes": res.Accepted, "rev": r.Store.Rev(), "from": c.DeviceID()})
			if b := r.getBridge(); b != nil {
				b.NotifyChanged()
			}
		}

	default:
		c.Send("ERROR", map[string]string{"reason": "unknown packet type"})
	}
}

func nonNil(e []livesync.Entity) []livesync.Entity {
	if e == nil {
		return []livesync.Entity{}
	}
	return e
}
