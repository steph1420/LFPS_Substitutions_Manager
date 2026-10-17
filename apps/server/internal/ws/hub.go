package ws

import (
	"log"
	"sync"
)

// BroadcastMessage represents a live message dispatched to connected school devices
type BroadcastMessage struct {
	Type      string      `json:"type"`      // e.g. "SUBSTITUTION_ASSIGNED", "ABSENCE_TOGGLED"
	Payload   interface{} `json:"payload"`
	Timestamp int64       `json:"timestamp"`
}

// Hub manages active WebSocket client connections
type Hub struct {
	clients   map[string]bool
	broadcast chan BroadcastMessage
	mutex     sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:   make(map[string]bool),
		broadcast: make(chan BroadcastMessage, 100),
	}
}

func (h *Hub) Run() {
	log.Println("[WebSocket Hub] Live broadcast engine running")
	for msg := range h.broadcast {
		h.mutex.RLock()
		clientCount := len(h.clients)
		h.mutex.RUnlock()
		if clientCount > 0 {
			log.Printf("[WebSocket Hub] Dispatched event: %s to %d clients\n", msg.Type, clientCount)
		}
	}
}

func (h *Hub) Broadcast(msg BroadcastMessage) {
	h.broadcast <- msg
}

