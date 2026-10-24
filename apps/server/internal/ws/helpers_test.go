package ws

import "net/http"

func httpHandler(h *Hub) http.Handler { return http.HandlerFunc(h.ServeWS) }
