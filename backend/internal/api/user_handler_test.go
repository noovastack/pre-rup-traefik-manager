package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/noovastack/traefik-manager/internal/db"
)

func setupUserDB(t *testing.T) {
	t.Helper()
	t.Setenv("TM_DB_PATH", ":memory:")
	db.InitDB()
	t.Cleanup(func() {
		if db.DB != nil {
			db.DB.Close()
			db.DB = nil
		}
	})
}

func TestUserHandler_ListUsers(t *testing.T) {
	setupUserDB(t)
	// Ensure we have at least one user by creating admin
	db.CreateUserFull("testadmin_list", "hash", "Admin", "admin@example.com", "admin", false)

	h := NewUserHandler()
	req := newJSONRequest(http.MethodGet, "/", "", "")
	w := httptest.NewRecorder()
	h.ListUsers(w, req)

	assertStatus(t, w, http.StatusOK)
	var items []userItem
	if err := json.Unmarshal(w.Body.Bytes(), &items); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(items) == 0 {
		t.Errorf("expected at least 1 user, got 0")
	}
}

func TestUserHandler_CreateUser(t *testing.T) {
	setupUserDB(t)
	h := NewUserHandler()

	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantBody   string
	}{
		{
			name:       "valid user",
			body:       `{"username":"newuser_test", "password":"password123", "displayName":"New User", "email":"new@example.com", "role":"viewer"}`,
			wantStatus: http.StatusCreated,
			wantBody:   `"username":"newuser_test"`,
		},
		{
			name:       "missing password",
			body:       `{"username":"newuser3"}`,
			wantStatus: http.StatusBadRequest,
			wantBody:   `username and password are required`,
		},
		{
			name:       "short password",
			body:       `{"username":"newuser4", "password":"123"}`,
			wantStatus: http.StatusBadRequest,
			wantBody:   `password must be at least 8 characters`,
		},
		{
			name:       "invalid json",
			body:       `{bad-json`,
			wantStatus: http.StatusBadRequest,
			wantBody:   `INVALID_JSON`,
		},
		{
			name:       "duplicate user",
			body:       `{"username":"newuser_test", "password":"password123", "displayName":"New User", "role":"viewer"}`, // Same username as first test
			wantStatus: http.StatusConflict,
			wantBody:   `username already exists`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newJSONRequest(http.MethodPost, "/", tt.body, "")
			w := httptest.NewRecorder()
			h.CreateUser(w, req)

			assertStatus(t, w, tt.wantStatus)
			if tt.wantBody != "" {
				assertContains(t, w, tt.wantBody)
			}
		})
	}
}

func TestUserHandler_DeleteUser(t *testing.T) {
	setupUserDB(t)
	err := db.CreateUserFull("delete_target", "hash", "Delete Target", "del@example.com", "viewer", false)
	if err != nil && !strings.Contains(err.Error(), "UNIQUE") {
		t.Fatalf("failed to create target user: %v", err)
	}
	target, _ := db.GetUserByUsername("delete_target")

	h := NewUserHandler()

	tests := []struct {
		name       string
		targetID   string
		selfID     int
		wantStatus int
	}{
		{
			name:       "delete valid user",
			targetID:   strconv.Itoa(target.ID),
			selfID:     999, // Admin self
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "delete self",
			targetID:   strconv.Itoa(target.ID),
			selfID:     target.ID, // Try to delete yourself
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "delete not found",
			targetID   : "99999",
			selfID     : 1,
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid id parsing",
			targetID   : "abc",
			selfID     : 1,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newJSONRequest(http.MethodDelete, "/"+tt.targetID, "", "")
			req = withChiParams(req, map[string]string{"id": tt.targetID})

			ctx := context.WithValue(req.Context(), contextKeyUserID, tt.selfID)
			ctx = context.WithValue(ctx, contextKeyUserRole, "admin")
			req = req.WithContext(ctx)

			w := httptest.NewRecorder()
			h.DeleteUser(w, req)

			assertStatus(t, w, tt.wantStatus)
		})
	}
}

func TestUserHandler_UpdateUserRole(t *testing.T) {
	setupUserDB(t)
	_ = db.CreateUserFull("role_target", "hash", "Target", "role@example.com", "viewer", false)
	target, _ := db.GetUserByUsername("role_target")

	h := NewUserHandler()

	tests := []struct {
		name       string
		targetID   string
		body       string
		wantStatus int
	}{
		{
			name:       "valid role update",
			targetID:   strconv.Itoa(target.ID),
			body:       `{"role":"admin"}`,
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "invalid role value",
			targetID:   strconv.Itoa(target.ID),
			body:       `{"role":"superadmin"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid json",
			targetID:   strconv.Itoa(target.ID),
			body:       `{bad-json`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid id",
			targetID   : "abc",
			body:       `{"role":"admin"}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := newJSONRequest(http.MethodPut, "/"+tt.targetID+"/role", tt.body, "")
			req = withChiParams(req, map[string]string{"id": tt.targetID})

			w := httptest.NewRecorder()
			h.UpdateUserRole(w, req)

			assertStatus(t, w, tt.wantStatus)
		})
	}
}
