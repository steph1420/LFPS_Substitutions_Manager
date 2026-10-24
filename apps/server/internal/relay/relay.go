// Package relay wires the WebSocket hub to the live entity store and the Sheets bridge
// (Bundle 35). Protocol, all packets {type, payload, timestamp}:
//
//	server → device  CONNECT_ACK      {clients, mode}
//	device → server  HELLO            {deviceId, appVersion, adminToken?}
//	server → device  HYDRATE          {weekStart, rev, entities, mode, sheets}
//	server → device  SHEETS_SNAPSHOT  {fetchedAt, hash, tabs:[{name, rows}]}  (after HYDRATE and on change)
//	device → server  STATE_MUTATION   {batchId, changes:[entity]}
//	server → device  MUTATION_ACK     {batchId, entities, rejected}  (to the sender)
//	server → others  STATE_MUTATION   {changes, rev, from}
//	server → all     PRESENCE         {clients}
//	server → device  ERROR            {reason, batchId?}
//
// Start-up in sheets mode (Bundle 35a): the relay is "hydrating" until the bridge has
// reloaded the week from the Subs tab. HELLOs are held (answered with HYDRATE once the
// week is loaded) and STATE_MUTATIONs get ERROR "hydrating", so no device can publish an
// old copy of something that was deleted before the restart. If the reload takes longer
// than the start timeout the relay opens anyway (degraded); the late reload then merges
// by last-writer-wins and is broadcast like any other change.
//
// See docs/SAS.md §6.3.
package relay

import (
	"encoding/json"
	"log"
	"os"
	"strings"
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

	gate      sync.Mutex
	hydrating bool
	pending   []*ws.Client // HELLOs held while hydrating
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

// BeginHydrating holds devices until Open (call before the hub accepts connections).
func (r *Relay) BeginHydrating() {
	r.gate.Lock()
	r.hydrating = true
	r.gate.Unlock()
}

// Hydrating reports whether devices are still being held.
func (r *Relay) Hydrating() bool {
	r.gate.Lock()
	defer r.gate.Unlock()
	return r.hydrating
}

// Open stops holding devices and answers the held HELLOs. Safe to call more than once.
func (r *Relay) Open() {
	r.gate.Lock()
	held := r.pending
	was := r.hydrating
	r.hydrating, r.pending = false, nil
	r.gate.Unlock()
	if was {
		log.Printf("[Relay] Open for devices (%d waiting)", len(held))
	}
	for _, c := range held {
		r.sendHydrate(c)
	}
}

// ApplyRehydrate merges the week reloaded from Sheets, broadcasts what changed (devices
// already connected, if the relay opened before the reload finished) and opens.
func (r *Relay) ApplyRehydrate(ents []livesync.Entity) {
	res := r.Store.Merge(ents)
	if len(res.Rejected) > 0 {
		log.Printf("[Relay] Reload: %d row(s) refused (first: %s)", len(res.Rejected), res.Rejected[0].Reason)
	}
	if len(res.Accepted) > 0 {
		r.Hub.Broadcast("STATE_MUTATION", map[string]any{"changes": res.Accepted, "rev": r.Store.Rev(), "from": "sheets"})
	}
	// Changes accepted while degraded were held back from Sheets until now.
	if b := r.getBridge(); b != nil {
		b.NotifyChanged()
	}
	r.Open()
}

// PublishSnapshot streams a changed Sheets snapshot to every device.
func (r *Relay) PublishSnapshot(s sheets.Snapshot) { r.Hub.Broadcast("SHEETS_SNAPSHOT", s) }

type hello struct {
	DeviceID   string `json:"deviceId"`
	AppVersion string `json:"appVersion"`
	AdminToken string `json:"adminToken,omitempty"` // SEC-02 stub; ignored unless LFPS_REQUIRE_ADMIN_TOKEN=1
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
		c.SetAdminToken(strings.TrimSpace(h.AdminToken))
		r.gate.Lock()
		if r.hydrating {
			for _, p := range r.pending {
				if p == c {
					r.gate.Unlock()
					return
				}
			}
			r.pending = append(r.pending, c)
			r.gate.Unlock()
			return
		}
		r.gate.Unlock()
		r.sendHydrate(c)

	case "STATE_MUTATION":
		var m mutation
		if err := json.Unmarshal(msg.Payload, &m); err != nil {
			c.Send("ERROR", map[string]string{"reason": "malformed STATE_MUTATION"})
			return
		}
		if r.Hydrating() {
			c.Send("ERROR", map[string]any{"reason": "hydrating", "batchId": m.BatchID})
			return
		}
		r.mutate(c, m)

	default:
		c.Send("ERROR", map[string]string{"reason": "unknown packet type"})
	}
}

func (r *Relay) sendHydrate(c *ws.Client) {
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
}

// requireAdminToken reports whether SEC-02 privileged-kind enforcement is on (default off).
func requireAdminToken() bool {
	v := strings.TrimSpace(os.Getenv("LFPS_REQUIRE_ADMIN_TOKEN"))
	return v == "1" || strings.EqualFold(v, "true") || strings.EqualFold(v, "yes")
}

// adminPrivilegedKind is true for entity kinds that the product treats as admin-only (SEC-02).
func adminPrivilegedKind(kind string) bool {
	return kind == "sched" || kind == "limbo"
}

// filterAdminPrivileged drops sched/limbo changes when enforcement is on and the client
// has no admin token. Any-role kinds (abs/sub/avail/oac/oct) always pass. See docs/SEC_02_SERVER_AUTH.md.
func filterAdminPrivileged(c *ws.Client, changes []livesync.Entity) (allowed []livesync.Entity, rejected []livesync.Rejection) {
	if !requireAdminToken() || c.AdminToken() != "" {
		return changes, nil
	}
	for _, e := range changes {
		kind, _, ok := livesync.ParseKey(e.Key)
		if ok && adminPrivilegedKind(kind) {
			rejected = append(rejected, livesync.Rejection{Key: e.Key, Reason: "admin required"})
			continue
		}
		allowed = append(allowed, e)
	}
	return allowed, rejected
}

func (r *Relay) mutate(c *ws.Client, m mutation) {
	if len(m.Changes) > MaxBatch {
		c.Send("ERROR", map[string]any{"reason": "batch too large", "batchId": m.BatchID})
		return
	}
	changes, preReject := filterAdminPrivileged(c, m.Changes)
	res := r.Store.Merge(changes)
	if len(preReject) > 0 {
		res.Rejected = append(preReject, res.Rejected...)
	}
	if len(res.Rejected) > 0 {
		log.Printf("[Relay] %d change(s) rejected from %s (first: %s)", len(res.Rejected), c.DeviceID(), res.Rejected[0].Reason)
	}
	// Wake the Sheets writer before the ACK (non-blocking), so "acked" implies "queued for Sheets".
	if len(res.Accepted) > 0 {
		if b := r.getBridge(); b != nil {
			b.NotifyChanged()
		}
	}
	c.Send("MUTATION_ACK", map[string]any{"batchId": m.BatchID, "entities": nonNil(res.Stored), "rejected": res.Rejected})
	if len(res.Accepted) > 0 {
		r.Hub.BroadcastExcept(c, "STATE_MUTATION", map[string]any{"changes": res.Accepted, "rev": r.Store.Rev(), "from": c.DeviceID()})
	}
}

func nonNil(e []livesync.Entity) []livesync.Entity {
	if e == nil {
		return []livesync.Entity{}
	}
	return e
}
