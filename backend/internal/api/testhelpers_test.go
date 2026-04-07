package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/golang-jwt/jwt/v5"
	"k8s.io/client-go/kubernetes"

	"github.com/noovastack/pre-rup-traefik-manager/internal/provider"
)

// testJWTSecret is the shared secret used to sign tokens in all api package tests.
var testJWTSecret = []byte("test-secret-key-32-bytes-long!!!")

// ── Mock Manager ─────────────────────────────────────────────────────────────

// mockManager implements provider.Manager.
// Set p to nil to simulate a missing cluster (clusterRequiredMiddleware → 503).
// Set k8s to a fake kubernetes.Interface for handlers that call GetK8s.
type mockManager struct {
	p             provider.Provider
	k8s           kubernetes.Interface
	addClusterErr error
}

func (m *mockManager) Get(r *http.Request) provider.Provider        { return m.p }
func (m *mockManager) GetK8s(r *http.Request) kubernetes.Interface  { return m.k8s }
func (m *mockManager) AddCluster(id int, name, serverURL, token, caCert string) error {
	return m.addClusterErr
}
func (m *mockManager) RemoveClusterByName(name string) {}

// ── Mock Provider ─────────────────────────────────────────────────────────────

// mockProvider embeds provider.Provider so that unimplemented methods panic clearly.
// Override only the methods each test actually exercises.
type mockProvider struct {
	provider.Provider
}

// ── JWT helpers ───────────────────────────────────────────────────────────────

// makeTestJWT signs a valid 1-hour JWT with testJWTSecret.
func makeTestJWT(t *testing.T) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": 1,
		"exp": time.Now().Add(time.Hour).Unix(),
	})
	str, err := tok.SignedString(testJWTSecret)
	if err != nil {
		t.Fatalf("makeTestJWT: %v", err)
	}
	return str
}

// ── Request helpers ───────────────────────────────────────────────────────────

// newJSONRequest creates a test request with an optional JSON body and bearer token.
func newJSONRequest(method, path, body, token string) *http.Request {
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	r.Header.Set("Content-Type", "application/json")
	if token != "" {
		r.Header.Set("Authorization", "Bearer "+token)
	}
	return r
}

// withChiParams injects chi URL parameters into a request's context.
// Necessary when calling handler methods directly (bypassing the chi router).
func withChiParams(r *http.Request, params map[string]string) *http.Request {
	rctx := chi.NewRouteContext()
	for k, v := range params {
		rctx.URLParams.Add(k, v)
	}
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

// serve runs a handler against a request and returns the recorded response.
func serve(handler http.HandlerFunc, r *http.Request) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	handler(w, r)
	return w
}

// assertStatus fails the test if the response code does not match.
func assertStatus(t *testing.T, got *httptest.ResponseRecorder, want int) {
	t.Helper()
	if got.Code != want {
		t.Errorf("status = %d, want %d; body: %s", got.Code, want, got.Body.String())
	}
}

// assertContains fails if the response body does not contain substr.
func assertContains(t *testing.T, got *httptest.ResponseRecorder, substr string) {
	t.Helper()
	if !strings.Contains(got.Body.String(), substr) {
		t.Errorf("body %q does not contain %q", got.Body.String(), substr)
	}
}
