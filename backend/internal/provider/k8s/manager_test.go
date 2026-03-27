package k8s

import (
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
)

// newReqWithHeader builds a request with X-Cluster-Context set.
func newReqWithHeader(clusterName string) *http.Request {
	r := httptest.NewRequest("GET", "/", nil)
	if clusterName != "" {
		r.Header.Set("X-Cluster-Context", clusterName)
	}
	return r
}

func TestNewManager_EmptyPool(t *testing.T) {
	m := NewManager()
	if m.clients == nil {
		t.Fatal("clients map should be initialised")
	}
	if len(m.clients) != 0 {
		t.Errorf("expected empty pool, got %d entries", len(m.clients))
	}
}

func TestManager_Get_NoCluster(t *testing.T) {
	m := NewManager()
	r := newReqWithHeader("unknown")
	if got := m.Get(r); got != nil {
		t.Error("expected nil for unknown cluster")
	}
}

func TestManager_Get_EmptyHeaderDefaultsToLocal(t *testing.T) {
	m := NewManager()
	// No "local" registered yet — should return nil.
	r := newReqWithHeader("")
	if got := m.Get(r); got != nil {
		t.Error("expected nil when local cluster not registered")
	}
}

func TestManager_RegisterLocalClient(t *testing.T) {
	m := NewManager()
	// Use a non-nil Client stub (fields can be nil; we only care about map presence).
	local := &Client{}
	m.RegisterLocalClient(local)

	// Empty header → local
	if got := m.Get(newReqWithHeader("")); got == nil {
		t.Error("expected local provider after RegisterLocalClient, got nil")
	}
	// "local" header → local
	if got := m.Get(newReqWithHeader("local")); got == nil {
		t.Error("expected local provider for X-Cluster-Context: local")
	}
}

func TestManager_AddCluster_ResolvesByName(t *testing.T) {
	// AddCluster calls NewClientFromToken which dials the K8s API.
	// We skip the real network call by verifying the map entry directly.
	m := NewManager()
	// Directly inject a client to simulate what AddCluster would do.
	m.mu.Lock()
	m.clients["prod"] = &Client{}
	m.mu.Unlock()

	r := newReqWithHeader("prod")
	if got := m.Get(r); got == nil {
		t.Error("expected provider for 'prod' cluster")
	}
}

func TestManager_RemoveClusterByName(t *testing.T) {
	m := NewManager()
	m.mu.Lock()
	m.clients["staging"] = &Client{}
	m.mu.Unlock()

	m.RemoveClusterByName("staging")

	r := newReqWithHeader("staging")
	if got := m.Get(r); got != nil {
		t.Error("expected nil after RemoveClusterByName")
	}
}

func TestManager_GetK8s_NoCluster(t *testing.T) {
	m := NewManager()
	r := newReqWithHeader("missing")
	if got := m.GetK8s(r); got != nil {
		t.Error("expected nil kubernetes.Interface for unknown cluster")
	}
}

func TestManager_GetK8s_EmptyHeaderDefaultsToLocal(t *testing.T) {
	m := NewManager()
	// No local registered — should return nil.
	r := newReqWithHeader("")
	if got := m.GetK8s(r); got != nil {
		t.Error("expected nil when no local cluster registered")
	}
}

// TestManager_ConcurrentAccess runs parallel Get + RegisterLocalClient to catch races.
// Run with: go test -race ./internal/provider/k8s/...
func TestManager_ConcurrentAccess(t *testing.T) {
	m := NewManager()

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(2)
		go func() {
			defer wg.Done()
			m.RegisterLocalClient(&Client{})
		}()
		go func() {
			defer wg.Done()
			m.Get(newReqWithHeader("local"))
		}()
	}
	wg.Wait()
}
