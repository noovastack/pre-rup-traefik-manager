package api

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	contextKeyUserID   contextKey = "userID"
	contextKeyUserRole contextKey = "userRole"
)

// userIDFromContext extracts the authenticated user's ID from the request context.
func userIDFromContext(ctx context.Context) int {
	v, _ := ctx.Value(contextKeyUserID).(int)
	return v
}

// userRoleFromContext extracts the authenticated user's role from the request context.
func userRoleFromContext(ctx context.Context) string {
	v, _ := ctx.Value(contextKeyUserRole).(string)
	return v
}

// AuthMiddleware validates a Bearer JWT token and stores userID + role in the context.
func AuthMiddleware(jwtSecret []byte) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing or invalid Authorization header")
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, errorf("unexpected signing method: %v", t.Header["alg"])
				}
				return jwtSecret, nil
			})

			if err != nil || !token.Valid {
				respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid or expired token")
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid token claims")
				return
			}

			// sub is stored as float64 in MapClaims
			userID := 0
			if sub, ok := claims["sub"].(float64); ok {
				userID = int(sub)
			}
			role, _ := claims["role"].(string)

			ctx := context.WithValue(r.Context(), contextKeyUserID, userID)
			ctx = context.WithValue(ctx, contextKeyUserRole, role)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// AdminOnlyMiddleware rejects requests from non-admin users with 403.
func AdminOnlyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if userRoleFromContext(r.Context()) != "admin" {
			respondError(w, http.StatusForbidden, "FORBIDDEN", "admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// ViewerReadonlyMiddleware blocks write operations (POST/PUT/DELETE) for viewer-role users.
func ViewerReadonlyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if userRoleFromContext(r.Context()) == "viewer" {
			switch r.Method {
			case http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch:
				respondError(w, http.StatusForbidden, "FORBIDDEN", "viewer accounts are read-only")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
