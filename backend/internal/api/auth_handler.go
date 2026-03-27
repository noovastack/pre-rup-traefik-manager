package api

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/noovastack/traefik-manager/internal/db"
)

type AuthHandler struct {
	jwtSecret []byte
}

func NewAuthHandler(jwtSecret []byte) *AuthHandler {
	return &AuthHandler{jwtSecret: jwtSecret}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Login handles POST /api/v1/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	if req.Username == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "username and password are required")
		return
	}

	user, err := db.GetUserByUsername(req.Username)
	if err != nil {
		log.Printf("[ERR] login db error: %v", err)
		respondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "an internal error occurred")
		return
	}
	if user == nil {
		respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid credentials")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid credentials")
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  user.ID,
		"role": user.Role,
		"exp":  time.Now().Add(24 * time.Hour).Unix(),
	})

	tokenStr, err := token.SignedString(h.jwtSecret)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "TOKEN_ERROR", "failed to sign token")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"token": tokenStr})
}
