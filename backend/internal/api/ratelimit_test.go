package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLoginRateLimiter_AllowsUpToBurst(t *testing.T) {
	rl := newLoginRateLimiter()
	mw := rl.Middleware()
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	handler := mw(ok)

	// Burst is 5 — first 5 requests from the same IP should pass
	for i := 0; i < 5; i++ {
		r := httptest.NewRequest("POST", "/auth/login", nil)
		r.RemoteAddr = "1.2.3.4:9999"
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		if w.Code != http.StatusOK {
			t.Fatalf("request %d: got %d, want 200", i+1, w.Code)
		}
	}
}

func TestLoginRateLimiter_BlocksAfterBurst(t *testing.T) {
	rl := newLoginRateLimiter()
	mw := rl.Middleware()
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	handler := mw(ok)

	// Exhaust the burst of 5
	for i := 0; i < 5; i++ {
		r := httptest.NewRequest("POST", "/auth/login", nil)
		r.RemoteAddr = "10.0.0.1:1234"
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
	}

	// 6th request must be rate-limited
	r := httptest.NewRequest("POST", "/auth/login", nil)
	r.RemoteAddr = "10.0.0.1:1234"
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	assertStatus(t, w, http.StatusTooManyRequests)
	assertContains(t, w, "RATE_LIMITED")
}

func TestLoginRateLimiter_IndependentPerIP(t *testing.T) {
	rl := newLoginRateLimiter()
	mw := rl.Middleware()
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	handler := mw(ok)

	// Exhaust IP A
	for i := 0; i < 5; i++ {
		r := httptest.NewRequest("POST", "/auth/login", nil)
		r.RemoteAddr = "192.168.1.1:1234"
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
	}

	// IP B should still be allowed
	r := httptest.NewRequest("POST", "/auth/login", nil)
	r.RemoteAddr = "192.168.1.2:1234"
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	assertStatus(t, w, http.StatusOK)
}
