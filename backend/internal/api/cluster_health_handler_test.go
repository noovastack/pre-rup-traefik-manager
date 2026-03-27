package api

import (
	"testing"

	"k8s.io/client-go/kubernetes/fake"
)

func TestClusterHealthHandler_NoCluster(t *testing.T) {
	h := NewClusterHealthHandler(&mockManager{k8s: nil})

	r := newJSONRequest("GET", "/cluster/health", "", "")
	w := serve(h.Get, r)

	assertStatus(t, w, 503)
	assertContains(t, w, "NO_CLUSTER")
}

func TestClusterHealthHandler_WithFakeCluster(t *testing.T) {
	fakeK8s := fake.NewSimpleClientset()
	h := NewClusterHealthHandler(&mockManager{k8s: fakeK8s})

	r := newJSONRequest("GET", "/cluster/health", "", "")
	w := serve(h.Get, r)

	// fake client returns a valid (empty) server version
	assertStatus(t, w, 200)
}
