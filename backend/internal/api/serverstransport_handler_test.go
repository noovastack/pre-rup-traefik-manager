package api

import (
	"encoding/json"
	"testing"

	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type serversTransportProvider struct {
	mockProvider
	items []traefikv1alpha1.ServersTransport
}

func (p *serversTransportProvider) GetServersTransports(namespace string) ([]traefikv1alpha1.ServersTransport, error) {
	return p.items, nil
}

func (p *serversTransportProvider) GetServersTransport(namespace, name string) (*traefikv1alpha1.ServersTransport, error) {
	return &traefikv1alpha1.ServersTransport{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *serversTransportProvider) CreateServersTransport(namespace string, obj *traefikv1alpha1.ServersTransport) (*traefikv1alpha1.ServersTransport, error) {
	return obj, nil
}

func (p *serversTransportProvider) UpdateServersTransport(namespace, name string, obj *traefikv1alpha1.ServersTransport) (*traefikv1alpha1.ServersTransport, error) {
	return obj, nil
}

func (p *serversTransportProvider) DeleteServersTransport(namespace, name string) error {
	return nil
}

func TestServersTransportHandler_List(t *testing.T) {
	p := &serversTransportProvider{
		items: []traefikv1alpha1.ServersTransport{{ObjectMeta: metav1.ObjectMeta{Name: "st-a"}}},
	}
	h := NewServersTransportHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.ServersTransport
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 item, got %d", len(result))
	}
}

func TestServersTransportHandler_Create(t *testing.T) {
	h := NewServersTransportHandler(&mockManager{p: &serversTransportProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"st-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 200)
}

func TestServersTransportHandler_Delete(t *testing.T) {
	h := NewServersTransportHandler(&mockManager{p: &serversTransportProvider{}})

	r := newJSONRequest("DELETE", "/st-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "st-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}

func TestServersTransportHandler_Update(t *testing.T) {
	h := NewServersTransportHandler(&mockManager{p: &serversTransportProvider{}})

	r := newJSONRequest("PUT", "/st-a", `{"metadata":{"name":"st-a"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "st-a"})
	w := serve(h.Update, r)

	assertStatus(t, w, 200)
}
