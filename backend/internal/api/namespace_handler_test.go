package api

import (
	"context"
	"encoding/json"
	"testing"
)

type namespaceProvider struct {
	mockProvider
	namespaces []string
	err        error
}

func (p *namespaceProvider) GetNamespaces(ctx context.Context) ([]string, error) {
	return p.namespaces, p.err
}

func TestNamespaceHandler_List(t *testing.T) {
	p := &namespaceProvider{namespaces: []string{"default", "kube-system"}}
	h := NewNamespaceHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/namespaces/", "", "")
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []string
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 2 {
		t.Errorf("want 2 namespaces, got %d", len(result))
	}
}

func TestNamespaceHandler_List_Empty(t *testing.T) {
	p := &namespaceProvider{namespaces: []string{}}
	h := NewNamespaceHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/namespaces/", "", "")
	w := serve(h.List, r)

	assertStatus(t, w, 200)
}
