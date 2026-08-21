package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"online-grocery/backend/internal/models"
	"online-grocery/backend/internal/utils"
)

const (
	ContextUserID = "userID"
	ContextRole   = "role"
)

// RequireAuth validates the Bearer JWT and injects userID/role into the
// context. Routes not wrapped by this middleware are public.
func RequireAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr, ok := extractToken(c)
		if !ok {
			utils.Error(c, http.StatusUnauthorized, "missing or malformed Authorization header")
			return
		}

		claims, err := utils.ParseToken(secret, tokenStr)
		if err != nil {
			utils.Error(c, http.StatusUnauthorized, "invalid or expired session, please log in again")
			return
		}

		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextRole, claims.Role)
		c.Next()
	}
}

// extractToken reads the bearer token from the Authorization header, or
// falls back to a ?token= query param. The fallback exists solely for the
// notification SSE stream: the browser's native EventSource API can't set
// custom request headers, so a query param is its only way to authenticate.
// A token in the URL can end up in server logs/history, but it's short-
// lived (same JWT expiry as everywhere else) and this is the standard
// workaround for EventSource + bearer auth.
func extractToken(c *gin.Context) (string, bool) {
	header := c.GetHeader("Authorization")
	if strings.HasPrefix(header, "Bearer ") {
		return strings.TrimPrefix(header, "Bearer "), true
	}
	if token := c.Query("token"); token != "" {
		return token, true
	}
	return "", false
}

// OptionalAuth injects userID/role into the context when a valid Bearer JWT
// is present, but never blocks the request when it's missing or invalid —
// for public routes that behave the same for guests and logged-in users but
// want to personalize the response (e.g. a product's is_wishlisted flag)
// when a session does exist.
func OptionalAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if strings.HasPrefix(header, "Bearer ") {
			if claims, err := utils.ParseToken(secret, strings.TrimPrefix(header, "Bearer ")); err == nil {
				c.Set(ContextUserID, claims.UserID)
				c.Set(ContextRole, claims.Role)
			}
		}
		c.Next()
	}
}

// RequireRole restricts a route to one or more roles. Must run after
// RequireAuth so ContextRole is already populated.
func RequireRole(roles ...models.Role) gin.HandlerFunc {
	allowed := make(map[models.Role]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(c *gin.Context) {
		role, _ := c.Get(ContextRole)
		r, _ := role.(models.Role)
		if !allowed[r] {
			utils.Error(c, http.StatusForbidden, "you do not have access to this resource")
			return
		}
		c.Next()
	}
}
