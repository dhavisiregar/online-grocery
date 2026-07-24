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
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			utils.Error(c, http.StatusUnauthorized, "missing or malformed Authorization header")
			return
		}

		claims, err := utils.ParseToken(secret, strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			utils.Error(c, http.StatusUnauthorized, "invalid or expired session, please log in again")
			return
		}

		c.Set(ContextUserID, claims.UserID)
		c.Set(ContextRole, claims.Role)
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
