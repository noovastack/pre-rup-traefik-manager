package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestAuthMiddleware_MissingHeader(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := AuthMiddleware(testJWTSecret)(next)

	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	assertStatus(t, w, http.StatusUnauthorized)
	assertContains(t, w, "UNAUTHORIZED")
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := AuthMiddleware(testJWTSecret)(next)

	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer not-a-real-token")
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	assertStatus(t, w, http.StatusUnauthorized)
}

func TestAuthMiddleware_ExpiredToken(t *testing.T) {
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": 1,
		"exp": time.Now().Add(-time.Hour).Unix(), // expired
	})
	str, _ := tok.SignedString(testJWTSecret)

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := AuthMiddleware(testJWTSecret)(next)

	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer "+str)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	assertStatus(t, w, http.StatusUnauthorized)
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})
	handler := AuthMiddleware(testJWTSecret)(next)

	r := newJSONRequest("GET", "/", "", makeTestJWT(t))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	assertStatus(t, w, http.StatusOK)
	if !called {
		t.Error("expected next handler to be called")
	}
}

func TestAuthMiddleware_WrongSigningKey(t *testing.T) {
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": 1,
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	str, _ := tok.SignedString([]byte("different-secret"))

	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	handler := AuthMiddleware(testJWTSecret)(next)

	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer "+str)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	assertStatus(t, w, http.StatusUnauthorized)
}
