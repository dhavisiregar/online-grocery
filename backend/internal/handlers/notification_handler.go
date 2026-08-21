package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/service"
	"online-grocery/backend/internal/utils"
)

type NotificationHandler struct {
	notifications *service.NotificationService
}

func NewNotificationHandler(notifications *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notifications: notifications}
}

func (h *NotificationHandler) List(c *gin.Context) {
	items, pagination, err := h.notifications.List(currentUserID(c), utils.ParsePagination(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load notifications")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"items": items, "pagination": pagination})
}

func (h *NotificationHandler) UnreadCount(c *gin.Context) {
	count, err := h.notifications.ListUnreadCount(currentUserID(c))
	if err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to load unread count")
		return
	}
	utils.Success(c, http.StatusOK, "ok", gin.H{"unread_count": count})
}

func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.Error(c, http.StatusBadRequest, "invalid notification id")
		return
	}
	if err := h.notifications.MarkAsRead(currentUserID(c), uint(id)); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to mark notification read")
		return
	}
	utils.Success(c, http.StatusOK, "ok", nil)
}

func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	if err := h.notifications.MarkAllAsRead(currentUserID(c)); err != nil {
		utils.Error(c, http.StatusInternalServerError, "failed to mark notifications read")
		return
	}
	utils.Success(c, http.StatusOK, "ok", nil)
}

// Stream is a Server-Sent Events endpoint: one "notification" event per
// notification as it's created, so an open tab updates live without
// polling. SSE (not WebSocket) because this is one-way push only, and the
// browser's EventSource auto-reconnects on its own — no custom client
// reconnect logic needed. The frontend falls back to polling
// List/UnreadCount if the connection can't be established at all.
func (h *NotificationHandler) Stream(c *gin.Context) {
	userID := currentUserID(c)
	ch, unsubscribe := h.notifications.Subscribe(userID)
	defer unsubscribe()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	// In case this ever sits behind an nginx-style reverse proxy — without
	// it, the proxy may buffer the stream and delay delivery.
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	ticker := time.NewTicker(20 * time.Second)
	defer ticker.Stop()

	first := true
	c.Stream(func(w io.Writer) bool {
		if first {
			// Opens the stream immediately so EventSource fires onopen
			// right away rather than waiting for the first real event.
			first = false
			io.WriteString(w, ": connected\n\n")
			return true
		}
		select {
		case <-c.Request.Context().Done():
			return false
		case payload, ok := <-ch:
			if !ok {
				return false
			}
			var n json.RawMessage = payload
			c.SSEvent("notification", n)
			return true
		case <-ticker.C:
			// Keep-alive comment so intermediary proxies/load balancers
			// don't time out an otherwise-idle connection.
			io.WriteString(w, ": ping\n\n")
			return true
		}
	})
}
