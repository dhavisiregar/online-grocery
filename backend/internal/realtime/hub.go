// Package realtime holds the in-memory pub/sub hub backing the
// notification SSE stream. It only fans out live events to whatever
// connections happen to be open on this process — the database row created
// alongside every publish (see service.NotificationService) is the durable
// copy the list/unread-count/polling endpoints read from.
package realtime

import "sync"

// Hub fans out notification events to any number of live SSE connections
// per user — a user with two tabs open gets the push in both.
type Hub struct {
	mu   sync.RWMutex
	subs map[uint]map[chan []byte]struct{}
}

func NewHub() *Hub {
	return &Hub{subs: make(map[uint]map[chan []byte]struct{})}
}

// Subscribe registers a new channel for userID and returns it along with an
// unsubscribe func the caller must defer.
func (h *Hub) Subscribe(userID uint) (chan []byte, func()) {
	ch := make(chan []byte, 8)

	h.mu.Lock()
	if h.subs[userID] == nil {
		h.subs[userID] = make(map[chan []byte]struct{})
	}
	h.subs[userID][ch] = struct{}{}
	h.mu.Unlock()

	unsubscribe := func() {
		h.mu.Lock()
		delete(h.subs[userID], ch)
		if len(h.subs[userID]) == 0 {
			delete(h.subs, userID)
		}
		h.mu.Unlock()
		close(ch)
	}
	return ch, unsubscribe
}

// Publish pushes payload to every live connection for userID. Non-blocking
// — a slow/stuck subscriber is skipped rather than stalling the publisher;
// best-effort realtime, with the client's polling/list fallback as the
// backstop for anything missed.
func (h *Hub) Publish(userID uint, payload []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subs[userID] {
		select {
		case ch <- payload:
		default:
		}
	}
}
