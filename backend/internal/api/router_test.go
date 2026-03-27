package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/noovastack/traefik-manager/internal/db"
)

// newTestRouter builds a router with testJWTSecret and the given manager.
func newTestRouter(mgr *mockManager) http.Handler {
	return NewRouter(mgr)
}

func setupRouterDB(t *testing.T) {
	t.Helper()
	t.Setenv("TM_DB_PATH", ":memory:")
	// Make the router use the same JWT secret as makeTestJWT.
	t.Setenv("TM_JWT_SECRET", string(testJWTSecret))
	db.InitDB()
	t.Cleanup(func() {
		if db.DB != nil {
			db.DB.Close()
			db.DB = nil
		}
	})
}

func TestRouter_Healthz(t *testing.T) {
	setupRouterDB(t)
	router := newTestRouter(&mockManager{})

	r := httptest.NewRequest("GET", "/healthz", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, r)

	assertStatus(t, w, http.StatusOK)
}

func TestRouter_ProtectedRouteWithoutAuth(t *testing.T) {
	setupRouterDB(t)
	router := newTestRouter(&mockManager{p: &mockProvider{}})

	r := httptest.NewRequest("GET", "/api/v1/namespaces/default/ingressroutes/", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, r)

	assertStatus(t, w, http.StatusUnauthorized)
}

func TestRouter_ClusterRequiredMiddleware_NoCluster(t *testing.T) {
	setupRouterDB(t)
	// p == nil → clusterRequiredMiddleware returns 503
	router := newTestRouter(&mockManager{p: nil})

	r := httptest.NewRequest("GET", "/api/v1/namespaces/default/ingressroutes/", nil)
	r.Header.Set("Authorization", "Bearer "+makeTestJWT(t))
	r.Header.Set("X-Cluster-Context", "missing-cluster")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, r)

	assertStatus(t, w, http.StatusServiceUnavailable)
	assertContains(t, w, "NO_CLUSTER")
}

func TestRouter_ClustersEndpoint_NoClusterRequired(t *testing.T) {
	setupRouterDB(t)
	// p == nil but /clusters should still respond (no clusterRequiredMiddleware)
	router := newTestRouter(&mockManager{p: nil})

	r := httptest.NewRequest("GET", "/api/v1/clusters/", nil)
	r.Header.Set("Authorization", "Bearer "+makeTestJWT(t))
	w := httptest.NewRecorder()
	router.ServeHTTP(w, r)

	// Should be 200, not 503
	assertStatus(t, w, http.StatusOK)
}
