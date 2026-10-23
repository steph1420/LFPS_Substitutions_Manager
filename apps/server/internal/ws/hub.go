package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// MaxMessageBytes is the largest inbound frame accepted (a device's whole week fits easily).
const MaxMessageBytes = 256 << 10 // 256 KiB

// Event is an outbound WebSocket packet.
type Event struct {
	Type      string      `json:"type"` // CONNECT_ACK, PRESENCE, HYDRATE, STATE_MUTATION, MUTATION_ACK, SHEETS_SNAPSHOT, ERROR
	Payload   interface{} `json:"payload"`
	Timestamp int64       `json:"timestamp"`
}

// Inbound is a packet from a device. Payload is decoded by the MessageHandler.
type Inbound struct {
	Type    string          `json:"type"` // HELLO, STATE_MUTATION, PING
	Payload json.RawMessage `json:"payload"`
}

// MessageHandler handles inbound packets (Bundle 35 live sync). It runs on the client's
// reader goroutine, so it must be safe for concurrent use.
type MessageHandler interface {
	HandleMessage(c *Client, msg Inbound)
}

// Client wraps a single connected WebSocket peer.
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan Event
	// DeviceID is set by the handler after HELLO (diagnostics only).
	mu       sync.Mutex
	deviceID string
}

// SetDeviceID records the peer's device id (from HELLO).
func (c *Client) SetDeviceID(id string) { c.mu.Lock(); c.deviceID = id; c.mu.Unlock() }

// DeviceID is the peer's device id, "" before HELLO.
func (c *Client) DeviceID() string { c.mu.Lock(); defer c.mu.Unlock(); return c.deviceID }

// Send queues an event for this client only. Safe from any goroutine.
func (c *Client) Send(eventType string, payload interface{}) {
	c.hub.out <- outbound{event: newEvent(eventType, payload), to: c}
}

type outbound struct {
	event   Event
	to      *Client // only this client
	exclude *Client // everyone but this client
}

// Hub maintains the set of active clients and fans events out.
type Hub struct {
	clients    map[*Client]bool
	out        chan outbound
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
	upgrader   websocket.Upgrader
	handler    MessageHandler
}

// NewHub creates a hub. originAllowed gates the WebSocket handshake by Origin header
// (same allowlist as HTTP CORS); nil allows every origin.
func NewHub(originAllowed func(origin string) bool) *Hub {
	if originAllowed == nil {
		originAllowed = func(string) bool { return true }
	}
	return &Hub{
		upgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool { return originAllowed(r.Header.Get("Origin")) },
		},
		clients:    make(map[*Client]bool),
		out:        make(chan outbound, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

// SetHandler installs the inbound message handler. Call before Run.
func (h *Hub) SetHandler(m MessageHandler) { h.handler = m }

func newEvent(t string, p interface{}) Event {
	return Event{Type: t, Payload: p, Timestamp: time.Now().UnixMilli()}
}

func (h *Hub) presenceLocked() Event {
	return newEvent("PRESENCE", map[string]int{"clients": len(h.clients)})
}

// deliverLocked queues ev for c, dropping c if it is too slow to keep up (BUG-26).
func (h *Hub) deliverLocked(c *Client, ev Event) {
	select {
	case c.send <- ev:
	default:
		close(c.send)
		delete(h.clients, c)
	}
}

func (h *Hub) Run() {
	log.Println("[WebSocket Hub] Real-time engine started")
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			n := len(h.clients)
			h.deliverLocked(client, newEvent("CONNECT_ACK", map[string]int{"clients": n}))
			presence := h.presenceLocked()
			for c := range h.clients {
				if c != client {
					h.deliverLocked(c, presence)
				}
			}
			h.mutex.Unlock()
			log.Printf("[WebSocket Hub] Client connected. Total active: %d\n", n)

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			n := len(h.clients)
			presence := h.presenceLocked()
			for c := range h.clients {
				h.deliverLocked(c, presence)
			}
			h.mutex.Unlock()
			log.Printf("[WebSocket Hub] Client disconnected. Total active: %d\n", n)

		case o := <-h.out:
			// Write lock: slow clients are removed from the map here (BUG-26).
			h.mutex.Lock()
			if o.to != nil {
				if h.clients[o.to] {
					h.deliverLocked(o.to, o.event)
				}
			} else {
				for c := range h.clients {
					if c != o.exclude {
						h.deliverLocked(c, o.event)
					}
				}
			}
			h.mutex.Unlock()
		}
	}
}

// ClientCount reports connected clients (tests, diagnostics, health).
func (h *Hub) ClientCount() int {
	h.mutex.RLock()
	defer h.mutex.RUnlock()
	return len(h.clients)
}

// Broadcast sends an event to every client.
func (h *Hub) Broadcast(eventType string, payload interface{}) {
	h.out <- outbound{event: newEvent(eventType, payload)}
}

// BroadcastExcept sends an event to every client but one (the sender of a change).
func (h *Hub) BroadcastExcept(except *Client, eventType string, payload interface{}) {
	h.out <- outbound{event: newEvent(eventType, payload), exclude: except}
}

// ServeWS handles incoming websocket requests from clients.
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WebSocket Upgrade Error] %v\n", err)
		return
	}
	client := &Client{hub: h, conn: conn, send: make(chan Event, 64)}
	h.register <- client
	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(MaxMessageBytes)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			break
		}
		// Any inbound frame proves the peer is alive.
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		var msg Inbound
		if err := json.Unmarshal(data, &msg); err != nil || msg.Type == "" {
			c.Send("ERROR", map[string]string{"reason": "malformed packet"})
			continue
		}
		if msg.Type == "PING" {
			c.Send("PONG", nil)
			continue
		}
		if c.hub.handler != nil {
			c.hub.handler.HandleMessage(c, msg)
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case event, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteJSON(event); err != nil {
				return
			}

		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
