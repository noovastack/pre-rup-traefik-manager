package api

import (
	"encoding/json"
	"testing"

	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type middlewareProvider struct {
	mockProvider
	items []traefikv1alpha1.Middleware
}

func (p *middlewareProvider) GetMiddlewares(namespace string) ([]traefikv1alpha1.Middleware, error) {
	return p.items, nil
}

func (p *middlewareProvider) GetMiddleware(namespace, name string) (*traefikv1alpha1.Middleware, error) {
	return &traefikv1alpha1.Middleware{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *middlewareProvider) CreateMiddleware(namespace string, obj *traefikv1alpha1.Middleware) (*traefikv1alpha1.Middleware, error) {
	return obj, nil
}

func (p *middlewareProvider) UpdateMiddleware(namespace, name string, obj *traefikv1alpha1.Middleware) (*traefikv1alpha1.Middleware, error) {
	return obj, nil
}

func (p *middlewareProvider) DeleteMiddleware(namespace, name string) error {
	return nil
}

func TestMiddlewareHandler_List(t *testing.T) {
	p := &middlewareProvider{
		items: []traefikv1alpha1.Middleware{{ObjectMeta: metav1.ObjectMeta{Name: "mw-a"}}},
	}
	h := NewMiddlewareHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.Middleware
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 middleware, got %d", len(result))
	}
}

func TestMiddlewareHandler_Create(t *testing.T) {
	h := NewMiddlewareHandler(&mockManager{p: &middlewareProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"mw-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 201)
}

func TestMiddlewareHandler_Delete(t *testing.T) {
	h := NewMiddlewareHandler(&mockManager{p: &middlewareProvider{}})

	r := newJSONRequest("DELETE", "/mw-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "mw-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}
