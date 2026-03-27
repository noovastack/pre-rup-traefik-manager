package api

import (
	"context"
	"encoding/json"
	"testing"
)

type serviceProvider struct {
	mockProvider
	services  []string
	endpoints []string
}

func (p *serviceProvider) GetServices(ctx context.Context, namespace string) ([]string, error) {
	return p.services, nil
}

func (p *serviceProvider) GetEndpoints(ctx context.Context, namespace, service string) ([]string, error) {
	return p.endpoints, nil
}

func TestServiceHandler_List(t *testing.T) {
	p := &serviceProvider{services: []string{"svc-a", "svc-b"}}
	h := NewServiceHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("want 2 services, got %d", len(result))
	}
}

func TestServiceHandler_ListEndpoints(t *testing.T) {
	p := &serviceProvider{endpoints: []string{"10.0.0.1", "10.0.0.2"}}
	h := NewServiceHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/svc-a/endpoints", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "service": "svc-a"})
	w := serve(h.ListEndpoints, r)

	assertStatus(t, w, 200)
	var result []map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("want 2 endpoints, got %d", len(result))
	}
}
