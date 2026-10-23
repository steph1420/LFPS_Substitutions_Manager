package ws

import (
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func dial(t *testing.T, url, origin string) (*websocket.Conn, error) {
	t.Helper()
	h := map[string][]string{}
	if origin != "" {
		h["Origin"] = []string{origin}
	}
	c, _, err := websocket.DefaultDialer.Dial(url, h)
	return c, err
}

func TestOriginCheck(t *testing.T) {
	hub := NewHub(func(o string) bool { return o == "" || o == "https://ok.example" })
	go hub.Run()
	srv := httptest.NewServer(httpHandler(hub))
	defer srv.Close()
	url := "ws" + strings.TrimPrefix(srv.URL, "http")

	if c, err := dial(t, url, "https://ok.example"); err != nil {
		t.Fatalf("allowed origin rejected: %v", err)
	} else {
		c.Close()
	}
	if _, err := dial(t, url, "https://evil.example"); err == nil {
		t.Fatal("disallowed origin accepted")
	}
}

// Many clients connecting, disconnecting and a flood of broadcasts (which drops slow
// clients from the map) must be race-free under `go test -race` (BUG-26).
func TestBroadcastChurnIsRaceFree(t *testing.T) {
	hub := NewHub(nil)
	go hub.Run()
	srv := httptest.NewServer(httpHandler(hub))
	defer srv.Close()
	url := "ws" + strings.TrimPrefix(srv.URL, "http")

	var wg sync.WaitGroup
	stop := make(chan struct{})
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			select {
			case <-stop:
				return
			default:
				hub.Broadcast("STATE_MUTATION", map[string]int{"n": 1})
				_ = hub.ClientCount()
			}
		}
	}()
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(slow bool) {
			defer wg.Done()
			c, err := dial(t, url, "")
			if err != nil {
				return
			}
			if !slow {
				_ = c.SetReadDeadline(time.Now().Add(200 * time.Millisecond))
				for {
					if _, _, err := c.ReadMessage(); err != nil {
						break
					}
				}
			} else {
				time.Sleep(200 * time.Millisecond) // never reads → gets dropped
			}
			c.Close()
		}(i%2 == 0)
	}
	time.Sleep(300 * time.Millisecond)
	close(stop)
	wg.Wait()
}

func TestReadLimitAllowsStatePayloads(t *testing.T) {
	if MaxMessageBytes < 64<<10 {
		t.Fatalf("read limit too small for state payloads: %d", MaxMessageBytes)
	}
}
