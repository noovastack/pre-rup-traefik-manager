package api

import (
	"encoding/json"
	"testing"

	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type middlewareTCPProvider struct {
	mockProvider
	items []traefikv1alpha1.MiddlewareTCP
}

func (p *middlewareTCPProvider) GetMiddlewaresTCP(namespace string) ([]traefikv1alpha1.MiddlewareTCP, error) {
	return p.items, nil
}

func (p *middlewareTCPProvider) GetMiddlewareTCP(namespace, name string) (*traefikv1alpha1.MiddlewareTCP, error) {
	return &traefikv1alpha1.MiddlewareTCP{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *middlewareTCPProvider) CreateMiddlewareTCP(namespace string, obj *traefikv1alpha1.MiddlewareTCP) (*traefikv1alpha1.MiddlewareTCP, error) {
	return obj, nil
}

func (p *middlewareTCPProvider) UpdateMiddlewareTCP(namespace, name string, obj *traefikv1alpha1.MiddlewareTCP) (*traefikv1alpha1.MiddlewareTCP, error) {
	return obj, nil
}

func (p *middlewareTCPProvider) DeleteMiddlewareTCP(namespace, name string) error {
	return nil
}

func TestMiddlewareTCPHandler_List(t *testing.T) {
	p := &middlewareTCPProvider{
		items: []traefikv1alpha1.MiddlewareTCP{{ObjectMeta: metav1.ObjectMeta{Name: "tcp-mw"}}},
	}
	h := NewMiddlewareTCPHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.MiddlewareTCP
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 item, got %d", len(result))
	}
}

func TestMiddlewareTCPHandler_Create(t *testing.T) {
	h := NewMiddlewareTCPHandler(&mockManager{p: &middlewareTCPProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"tcp-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 200)
}

func TestMiddlewareTCPHandler_Delete(t *testing.T) {
	h := NewMiddlewareTCPHandler(&mockManager{p: &middlewareTCPProvider{}})

	r := newJSONRequest("DELETE", "/tcp-mw", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "tcp-mw"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}
