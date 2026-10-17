package ws

import (
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all school intranet origins
	},
}

// Event represents a live WebSocket packet
type Event struct {
	Type      string      `json:"type"`      // "STATE_MUTATION", "PING", "CONNECT_ACK"
	Payload   interface{} `json:"payload"`
	Timestamp int64       `json:"timestamp"`
}

// Client wraps a single connected WebSocket peer
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan Event
}

// Hub maintains the set of active clients and broadcasts events
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan Event
	register   chan *Client
	unregister chan *Client
	mutex      sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan Event, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	log.Println("[WebSocket Hub] Real-time engine started")
	for {
		select {
		case client := <-h.register:
			h.mutex.Lock()
			h.clients[client] = true
			clientCount := len(h.clients)
			h.mutex.Unlock()
			log.Printf("[WebSocket Hub] Client connected. Total active: %d\n", clientCount)
			client.send <- Event{
				Type:      "CONNECT_ACK",
				Payload:   map[string]interface{}{"clients": clientCount},
				Timestamp: time.Now().UnixMilli(),
			}

		case client := <-h.unregister:
			h.mutex.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			clientCount := len(h.clients)
			h.mutex.Unlock()
			log.Printf("[WebSocket Hub] Client disconnected. Total active: %d\n", clientCount)

		case event := <-h.broadcast:
			h.mutex.RLock()
			for client := range h.clients {
				select {
				case client.send <- event:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
			h.mutex.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(eventType string, payload interface{}) {
	event := Event{
		Type:      eventType,
		Payload:   payload,
		Timestamp: time.Now().UnixMilli(),
	}
	h.broadcast <- event
}

// ServeWS handles incoming websocket requests from clients
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WebSocket Upgrade Error] %v\n", err)
		return
	}

	client := &Client{
		hub:  h,
		conn: conn,
		send: make(chan Event, 64),
	}

	h.register <- client

	// Start writer pump in goroutine
	go client.writePump()
	// Start reader pump
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(512)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, _, err := c.conn.ReadMessage()
		if err != nil {
			break
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
