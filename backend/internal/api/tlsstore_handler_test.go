package api

import (
	"encoding/json"
	"testing"

	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type tlsStoreProvider struct {
	mockProvider
	items []traefikv1alpha1.TLSStore
}

func (p *tlsStoreProvider) GetTLSStores(namespace string) ([]traefikv1alpha1.TLSStore, error) {
	return p.items, nil
}

func (p *tlsStoreProvider) GetTLSStore(namespace, name string) (*traefikv1alpha1.TLSStore, error) {
	return &traefikv1alpha1.TLSStore{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *tlsStoreProvider) CreateTLSStore(namespace string, obj *traefikv1alpha1.TLSStore) (*traefikv1alpha1.TLSStore, error) {
	return obj, nil
}

func (p *tlsStoreProvider) UpdateTLSStore(namespace, name string, obj *traefikv1alpha1.TLSStore) (*traefikv1alpha1.TLSStore, error) {
	return obj, nil
}

func (p *tlsStoreProvider) DeleteTLSStore(namespace, name string) error {
	return nil
}

func TestTLSStoreHandler_List(t *testing.T) {
	p := &tlsStoreProvider{
		items: []traefikv1alpha1.TLSStore{{ObjectMeta: metav1.ObjectMeta{Name: "store-a"}}},
	}
	h := NewTLSStoreHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.TLSStore
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 item, got %d", len(result))
	}
}

func TestTLSStoreHandler_Create(t *testing.T) {
	h := NewTLSStoreHandler(&mockManager{p: &tlsStoreProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"store-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 201)
}

func TestTLSStoreHandler_Delete(t *testing.T) {
	h := NewTLSStoreHandler(&mockManager{p: &tlsStoreProvider{}})

	r := newJSONRequest("DELETE", "/store-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "store-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}

func TestTLSStoreHandler_Get(t *testing.T) {
	h := NewTLSStoreHandler(&mockManager{p: &tlsStoreProvider{}})

	r := newJSONRequest("GET", "/store-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "store-a"})
	w := serve(h.Get, r)

	assertStatus(t, w, 200)
}

func TestTLSStoreHandler_Update(t *testing.T) {
	h := NewTLSStoreHandler(&mockManager{p: &tlsStoreProvider{}})

	r := newJSONRequest("PUT", "/store-a", `{"metadata":{"name":"store-a"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "store-a"})
	w := serve(h.Update, r)

	assertStatus(t, w, 200)
}
