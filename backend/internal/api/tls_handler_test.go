package api

import (
	"encoding/json"
	"testing"

	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type tlsOptionProvider struct {
	mockProvider
	items []traefikv1alpha1.TLSOption
}

func (p *tlsOptionProvider) GetTLSOptions(namespace string) ([]traefikv1alpha1.TLSOption, error) {
	return p.items, nil
}

func (p *tlsOptionProvider) GetTLSOption(namespace, name string) (*traefikv1alpha1.TLSOption, error) {
	return &traefikv1alpha1.TLSOption{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *tlsOptionProvider) CreateTLSOption(namespace string, obj *traefikv1alpha1.TLSOption) (*traefikv1alpha1.TLSOption, error) {
	return obj, nil
}

func (p *tlsOptionProvider) UpdateTLSOption(namespace, name string, obj *traefikv1alpha1.TLSOption) (*traefikv1alpha1.TLSOption, error) {
	return obj, nil
}

func (p *tlsOptionProvider) DeleteTLSOption(namespace, name string) error {
	return nil
}

func TestTLSHandler_List(t *testing.T) {
	p := &tlsOptionProvider{
		items: []traefikv1alpha1.TLSOption{{ObjectMeta: metav1.ObjectMeta{Name: "tls-a"}}},
	}
	h := NewTLSHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.TLSOption
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 item, got %d", len(result))
	}
}

func TestTLSHandler_Create(t *testing.T) {
	h := NewTLSHandler(&mockManager{p: &tlsOptionProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"tls-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 201)
}

func TestTLSHandler_Delete(t *testing.T) {
	h := NewTLSHandler(&mockManager{p: &tlsOptionProvider{}})

	r := newJSONRequest("DELETE", "/tls-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "tls-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}

func TestTLSHandler_Get(t *testing.T) {
	h := NewTLSHandler(&mockManager{p: &tlsOptionProvider{}})

	r := newJSONRequest("GET", "/tls-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "tls-a"})
	w := serve(h.Get, r)

	assertStatus(t, w, 200)
}

func TestTLSHandler_Update(t *testing.T) {
	h := NewTLSHandler(&mockManager{p: &tlsOptionProvider{}})

	r := newJSONRequest("PUT", "/tls-a", `{"metadata":{"name":"tls-a"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "tls-a"})
	w := serve(h.Update, r)

	assertStatus(t, w, 200)
}
