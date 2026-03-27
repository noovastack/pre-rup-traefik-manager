package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/noovastack/traefik-manager/internal/db"
)

type ProfileHandler struct{}

func NewProfileHandler() *ProfileHandler {
	return &ProfileHandler{}
}

func (h *ProfileHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.GetProfile)
	r.Put("/", h.UpdateProfile)
	r.Put("/password", h.ChangePassword)
	r.Put("/setup", h.Setup)
	return r
}

type profileResponse struct {
	ID                   int    `json:"id"`
	Username             string `json:"username"`
	DisplayName          string `json:"displayName"`
	Email                string `json:"email"`
	Role                 string `json:"role"`
	MustChangeCredentials bool  `json:"mustChangeCredentials"`
	CreatedAt            string `json:"createdAt"`
}

func (h *ProfileHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromContext(r.Context())
	user, err := db.GetUserByID(userID)
	if err != nil {
		internalError(w, err, "PROFILE_GET_ERROR")
		return
	}
	if user == nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	respondJSON(w, http.StatusOK, profileResponse{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		Role:                  user.Role,
		MustChangeCredentials: user.MustChangeCredentials,
		CreatedAt:             user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

type updateProfileRequest struct {
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
}

func (h *ProfileHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromContext(r.Context())
	var req updateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if err := db.UpdateUserProfile(userID, req.DisplayName, req.Email); err != nil {
		internalError(w, err, "PROFILE_UPDATE_ERROR")
		return
	}
	user, err := db.GetUserByID(userID)
	if err != nil || user == nil {
		internalError(w, err, "PROFILE_GET_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, profileResponse{
		ID:          user.ID,
		Username:    user.Username,
		DisplayName: user.DisplayName,
		Email:       user.Email,
		Role:                  user.Role,
		MustChangeCredentials: user.MustChangeCredentials,
		CreatedAt:             user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (h *ProfileHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromContext(r.Context())
	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.CurrentPassword == "" || req.NewPassword == "" {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "currentPassword and newPassword are required")
		return
	}
	if len(req.NewPassword) < 8 {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "new password must be at least 8 characters")
		return
	}
	user, err := db.GetUserByID(userID)
	if err != nil || user == nil {
		internalError(w, err, "PROFILE_GET_ERROR")
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		respondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "current password is incorrect")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		internalError(w, err, "HASH_ERROR")
		return
	}
	if err := db.UpdatePassword(userID, string(hash)); err != nil {
		internalError(w, err, "PASSWORD_UPDATE_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type setupRequest struct {
	Username    string `json:"username"`
	NewPassword string `json:"newPassword"`
}

func (h *ProfileHandler) Setup(w http.ResponseWriter, r *http.Request) {
	userID := userIDFromContext(r.Context())
	var req setupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.Username == "" || req.NewPassword == "" {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "username and newPassword are required")
		return
	}
	if len(req.NewPassword) < 8 {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "password must be at least 8 characters")
		return
	}
	// Ensure username is not taken by another user
	existing, err := db.GetUserByUsername(req.Username)
	if err != nil {
		internalError(w, err, "SETUP_ERROR")
		return
	}
	if existing != nil && existing.ID != userID {
		respondError(w, http.StatusConflict, "CONFLICT", "username already taken")
		return
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		internalError(w, err, "HASH_ERROR")
		return
	}
	if err := db.SetupCredentials(userID, req.Username, string(hash)); err != nil {
		internalError(w, err, "SETUP_ERROR")
		return
	}
	user, err := db.GetUserByID(userID)
	if err != nil || user == nil {
		internalError(w, err, "PROFILE_GET_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, profileResponse{
		ID:                    user.ID,
		Username:              user.Username,
		DisplayName:           user.DisplayName,
		Email:                 user.Email,
		Role:                  user.Role,
		MustChangeCredentials: user.MustChangeCredentials,
		CreatedAt:             user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}
