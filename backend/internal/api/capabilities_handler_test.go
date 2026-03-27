package api

import (
	"encoding/json"
	"testing"

	"k8s.io/client-go/kubernetes/fake"
)

func TestCapabilitiesHandler_NoCluster(t *testing.T) {
	// GetK8s returns nil → handler returns empty capabilities, not an error
	h := NewCapabilitiesHandler(&mockManager{k8s: nil})

	r := newJSONRequest("GET", "/capabilities", "", "")
	w := serve(h.Get, r)

	assertStatus(t, w, 200)
	var resp CapabilitiesResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if resp.Traefik || resp.GatewayAPI {
		t.Error("expected both capabilities to be false when no cluster connected")
	}
}

func TestCapabilitiesHandler_WithFakeCluster(t *testing.T) {
	// fake client has no Traefik/Gateway API groups by default
	fakeK8s := fake.NewSimpleClientset()
	h := NewCapabilitiesHandler(&mockManager{k8s: fakeK8s})

	r := newJSONRequest("GET", "/capabilities", "", "")
	w := serve(h.Get, r)

	assertStatus(t, w, 200)
	var resp CapabilitiesResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("parse: %v", err)
	}
	// fake cluster has no CRDs registered
	if resp.Traefik {
		t.Error("expected Traefik=false with fake cluster")
	}
}
