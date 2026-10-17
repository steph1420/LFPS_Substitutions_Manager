package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"lfps/server/internal/handlers"
	"lfps/server/internal/ws"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	hub := ws.NewHub()
	go hub.Run()

	mux := http.NewServeMux()

	// REST API Endpoints
	mux.HandleFunc("GET /api/v1/health", handlers.HealthHandler)
	mux.HandleFunc("GET /api/v1/meta", handlers.MetaHandler)

	// Root Handler
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		fmt.Fprintf(w, "LFPS Substitutions & Routine Suite API (Go 1.23 Engine) - Operational")
	})

	serverAddr := fmt.Sprintf(":%s", port)
	log.Printf("[Server] LFPS Core API listening on http://localhost%s\n", serverAddr)
	if err := http.ListenAndServe(serverAddr, mux); err != nil {
		log.Fatalf("[Server Fatal] %v\n", err)
	}
}

