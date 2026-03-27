package api

import (
	"encoding/json"
	"testing"

	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type traefikServiceProvider struct {
	mockProvider
	items []traefikv1alpha1.TraefikService
}

func (p *traefikServiceProvider) GetTraefikServices(namespace string) ([]traefikv1alpha1.TraefikService, error) {
	return p.items, nil
}

func (p *traefikServiceProvider) GetTraefikService(namespace, name string) (*traefikv1alpha1.TraefikService, error) {
	return &traefikv1alpha1.TraefikService{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *traefikServiceProvider) CreateTraefikService(namespace string, obj *traefikv1alpha1.TraefikService) (*traefikv1alpha1.TraefikService, error) {
	return obj, nil
}

func (p *traefikServiceProvider) UpdateTraefikService(namespace, name string, obj *traefikv1alpha1.TraefikService) (*traefikv1alpha1.TraefikService, error) {
	return obj, nil
}

func (p *traefikServiceProvider) DeleteTraefikService(namespace, name string) error {
	return nil
}

func TestTraefikServiceHandler_List(t *testing.T) {
	p := &traefikServiceProvider{
		items: []traefikv1alpha1.TraefikService{{ObjectMeta: metav1.ObjectMeta{Name: "svc-a"}}},
	}
	h := NewTraefikServiceHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.TraefikService
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 item, got %d", len(result))
	}
}

func TestTraefikServiceHandler_Create(t *testing.T) {
	h := NewTraefikServiceHandler(&mockManager{p: &traefikServiceProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"svc-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 200)
}

func TestTraefikServiceHandler_Delete(t *testing.T) {
	h := NewTraefikServiceHandler(&mockManager{p: &traefikServiceProvider{}})

	r := newJSONRequest("DELETE", "/svc-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "svc-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}

func TestTraefikServiceHandler_Update(t *testing.T) {
	h := NewTraefikServiceHandler(&mockManager{p: &traefikServiceProvider{}})

	r := newJSONRequest("PUT", "/svc-a", `{"metadata":{"name":"svc-a"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "svc-a"})
	w := serve(h.Update, r)

	assertStatus(t, w, 200)
}
