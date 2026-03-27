package api

import (
	"encoding/json"
	"testing"

	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type serversTransportTCPProvider struct {
	mockProvider
	items []traefikv1alpha1.ServersTransportTCP
}

func (p *serversTransportTCPProvider) GetServersTransportsTCP(namespace string) ([]traefikv1alpha1.ServersTransportTCP, error) {
	return p.items, nil
}

func (p *serversTransportTCPProvider) GetServersTransportTCP(namespace, name string) (*traefikv1alpha1.ServersTransportTCP, error) {
	return &traefikv1alpha1.ServersTransportTCP{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *serversTransportTCPProvider) CreateServersTransportTCP(namespace string, obj *traefikv1alpha1.ServersTransportTCP) (*traefikv1alpha1.ServersTransportTCP, error) {
	return obj, nil
}

func (p *serversTransportTCPProvider) UpdateServersTransportTCP(namespace, name string, obj *traefikv1alpha1.ServersTransportTCP) (*traefikv1alpha1.ServersTransportTCP, error) {
	return obj, nil
}

func (p *serversTransportTCPProvider) DeleteServersTransportTCP(namespace, name string) error {
	return nil
}

func TestServersTransportTCPHandler_List(t *testing.T) {
	p := &serversTransportTCPProvider{
		items: []traefikv1alpha1.ServersTransportTCP{{ObjectMeta: metav1.ObjectMeta{Name: "sttcp-a"}}},
	}
	h := NewServersTransportTCPHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.ServersTransportTCP
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 item, got %d", len(result))
	}
}

func TestServersTransportTCPHandler_Create(t *testing.T) {
	h := NewServersTransportTCPHandler(&mockManager{p: &serversTransportTCPProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"sttcp-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 200)
}

func TestServersTransportTCPHandler_Delete(t *testing.T) {
	h := NewServersTransportTCPHandler(&mockManager{p: &serversTransportTCPProvider{}})

	r := newJSONRequest("DELETE", "/sttcp-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "sttcp-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}

func TestServersTransportTCPHandler_Update(t *testing.T) {
	h := NewServersTransportTCPHandler(&mockManager{p: &serversTransportTCPProvider{}})

	r := newJSONRequest("PUT", "/sttcp-a", `{"metadata":{"name":"sttcp-a"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "sttcp-a"})
	w := serve(h.Update, r)

	assertStatus(t, w, 200)
}
