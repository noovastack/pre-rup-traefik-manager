package api

import (
	"encoding/json"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"github.com/noovastack/traefik-manager/internal/db"
)

// setupAuthDB initialises an in-memory DB and seeds a test user.
func setupAuthDB(t *testing.T) {
	t.Helper()
	t.Setenv("TM_DB_PATH", ":memory:")
	db.InitDB()
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("bcrypt: %v", err)
	}
	if err := db.CreateUser("alice", string(hash)); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}
	t.Cleanup(func() {
		if db.DB != nil {
			db.DB.Close()
			db.DB = nil
		}
	})
}

func TestAuthHandler_ValidLogin(t *testing.T) {
	setupAuthDB(t)
	h := NewAuthHandler(testJWTSecret)

	r := newJSONRequest("POST", "/auth/login", `{"username":"alice","password":"password123"}`, "")
	w := serve(h.Login, r)

	assertStatus(t, w, 200)
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("parse response: %v", err)
	}
	if resp["token"] == "" {
		t.Error("expected non-empty token in response")
	}
}

func TestAuthHandler_WrongPassword(t *testing.T) {
	setupAuthDB(t)
	h := NewAuthHandler(testJWTSecret)

	r := newJSONRequest("POST", "/auth/login", `{"username":"alice","password":"wrong"}`, "")
	w := serve(h.Login, r)

	assertStatus(t, w, 401)
	assertContains(t, w, "UNAUTHORIZED")
}

func TestAuthHandler_UnknownUser(t *testing.T) {
	setupAuthDB(t)
	h := NewAuthHandler(testJWTSecret)

	r := newJSONRequest("POST", "/auth/login", `{"username":"nobody","password":"pass"}`, "")
	w := serve(h.Login, r)

	assertStatus(t, w, 401)
}

func TestAuthHandler_MissingFields(t *testing.T) {
	setupAuthDB(t)
	h := NewAuthHandler(testJWTSecret)

	r := newJSONRequest("POST", "/auth/login", `{"username":"alice"}`, "")
	w := serve(h.Login, r)

	assertStatus(t, w, 400)
	assertContains(t, w, "VALIDATION_FAILED")
}

func TestAuthHandler_InvalidJSON(t *testing.T) {
	setupAuthDB(t)
	h := NewAuthHandler(testJWTSecret)

	r := newJSONRequest("POST", "/auth/login", `not json`, "")
	w := serve(h.Login, r)

	assertStatus(t, w, 400)
	assertContains(t, w, "INVALID_JSON")
}

func TestAuthHandler_EmptyBody(t *testing.T) {
	setupAuthDB(t)
	h := NewAuthHandler(testJWTSecret)

	r := newJSONRequest("POST", "/auth/login", "", "")
	// empty body — decoder will fail
	_ = strings.NewReader("") // just to confirm empty
	w := serve(h.Login, r)

	// empty body decodes as EOF → INVALID_JSON or VALIDATION_FAILED
	if w.Code != 400 {
		t.Errorf("status = %d, want 400", w.Code)
	}
}
