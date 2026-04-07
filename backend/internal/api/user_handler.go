package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/noovastack/pre-rup-traefik-manager/internal/db"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

func (h *UserHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.ListUsers)
	r.Post("/", h.CreateUser)
	r.Delete("/{id}", h.DeleteUser)
	r.Put("/{id}/role", h.UpdateUserRole)
	return r
}

type userItem struct {
	ID                   int    `json:"id"`
	Username             string `json:"username"`
	DisplayName          string `json:"displayName"`
	Email                string `json:"email"`
	Role                 string `json:"role"`
	MustChangeCredentials bool   `json:"mustChangeCredentials"`
	CreatedAt            string `json:"createdAt"`
}

func (h *UserHandler) ListUsers(w http.ResponseWriter, r *http.Request) {
	users, err := db.ListUsers()
	if err != nil {
		internalError(w, err, "USERS_LIST_ERROR")
		return
	}
	items := make([]userItem, len(users))
	for i, u := range users {
		items[i] = userItem{
			ID:                   u.ID,
			Username:             u.Username,
			DisplayName:          u.DisplayName,
			Email:                u.Email,
			Role:                 u.Role,
			MustChangeCredentials: u.MustChangeCredentials,
			CreatedAt:            u.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	respondJSON(w, http.StatusOK, items)
}

type createUserRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	Role        string `json:"role"`
}

func (h *UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.Username == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "username and password are required")
		return
	}
	if len(req.Password) < 8 {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "password must be at least 8 characters")
		return
	}
	if req.Role != "admin" && req.Role != "viewer" {
		req.Role = "viewer"
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		internalError(w, err, "HASH_ERROR")
		return
	}
	if err := db.CreateUserFull(req.Username, string(hash), req.DisplayName, req.Email, req.Role, false); err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint") {
			respondError(w, http.StatusConflict, "CONFLICT", "username already exists")
			return
		}
		internalError(w, err, "USER_CREATE_ERROR")
		return
	}
	user, err := db.GetUserByUsername(req.Username)
	if err != nil || user == nil {
		internalError(w, err, "USER_GET_ERROR")
		return
	}
	respondJSON(w, http.StatusCreated, userItem{
		ID:                   user.ID,
		Username:             user.Username,
		DisplayName:          user.DisplayName,
		Email:                user.Email,
		Role:                 user.Role,
		MustChangeCredentials: user.MustChangeCredentials,
		CreatedAt:            user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	selfID := userIDFromContext(r.Context())
	targetID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_ID", "invalid user id")
		return
	}
	if targetID == selfID {
		respondError(w, http.StatusBadRequest, "CANNOT_DELETE_SELF", "cannot delete your own account")
		return
	}
	target, err := db.GetUserByID(targetID)
	if err != nil {
		internalError(w, err, "USER_GET_ERROR")
		return
	}
	if target == nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "user not found")
		return
	}
	if err := db.DeleteUser(targetID); err != nil {
		internalError(w, err, "USER_DELETE_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type updateRoleRequest struct {
	Role string `json:"role"`
}

func (h *UserHandler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	targetID, err := strconv.Atoi(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_ID", "invalid user id")
		return
	}
	var req updateRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	if req.Role != "admin" && req.Role != "viewer" {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "role must be 'admin' or 'viewer'")
		return
	}
	if err := db.UpdateUserRole(targetID, req.Role); err != nil {
		internalError(w, err, "ROLE_UPDATE_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
