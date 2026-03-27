package api

import (
	"encoding/json"
	"testing"

	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type tcpUDPProvider struct {
	mockProvider
	tcpRoutes []traefikv1alpha1.IngressRouteTCP
	udpRoutes []traefikv1alpha1.IngressRouteUDP
}

func (p *tcpUDPProvider) GetIngressRoutesTCP(namespace string) ([]traefikv1alpha1.IngressRouteTCP, error) {
	return p.tcpRoutes, nil
}

func (p *tcpUDPProvider) GetIngressRouteTCP(namespace, name string) (*traefikv1alpha1.IngressRouteTCP, error) {
	return &traefikv1alpha1.IngressRouteTCP{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *tcpUDPProvider) CreateIngressRouteTCP(namespace string, obj *traefikv1alpha1.IngressRouteTCP) (*traefikv1alpha1.IngressRouteTCP, error) {
	return obj, nil
}

func (p *tcpUDPProvider) UpdateIngressRouteTCP(namespace, name string, obj *traefikv1alpha1.IngressRouteTCP) (*traefikv1alpha1.IngressRouteTCP, error) {
	return obj, nil
}

func (p *tcpUDPProvider) DeleteIngressRouteTCP(namespace, name string) error {
	return nil
}

func (p *tcpUDPProvider) GetIngressRoutesUDP(namespace string) ([]traefikv1alpha1.IngressRouteUDP, error) {
	return p.udpRoutes, nil
}

func (p *tcpUDPProvider) GetIngressRouteUDP(namespace, name string) (*traefikv1alpha1.IngressRouteUDP, error) {
	return &traefikv1alpha1.IngressRouteUDP{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *tcpUDPProvider) CreateIngressRouteUDP(namespace string, obj *traefikv1alpha1.IngressRouteUDP) (*traefikv1alpha1.IngressRouteUDP, error) {
	return obj, nil
}

func (p *tcpUDPProvider) UpdateIngressRouteUDP(namespace, name string, obj *traefikv1alpha1.IngressRouteUDP) (*traefikv1alpha1.IngressRouteUDP, error) {
	return obj, nil
}

func (p *tcpUDPProvider) DeleteIngressRouteUDP(namespace, name string) error {
	return nil
}

func TestTCPUDPHandler_ListTCP(t *testing.T) {
	p := &tcpUDPProvider{
		tcpRoutes: []traefikv1alpha1.IngressRouteTCP{{ObjectMeta: metav1.ObjectMeta{Name: "tcp-a"}}},
	}
	h := NewTCPUDPHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.ListTCP, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.IngressRouteTCP
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 TCP route, got %d", len(result))
	}
}

func TestTCPUDPHandler_CreateTCP(t *testing.T) {
	h := NewTCPUDPHandler(&mockManager{p: &tcpUDPProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"tcp-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.CreateTCP, r)

	assertStatus(t, w, 200)
}

func TestTCPUDPHandler_DeleteTCP(t *testing.T) {
	h := NewTCPUDPHandler(&mockManager{p: &tcpUDPProvider{}})

	r := newJSONRequest("DELETE", "/tcp-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "tcp-a"})
	w := serve(h.DeleteTCP, r)

	assertStatus(t, w, 204)
}

func TestTCPUDPHandler_ListUDP(t *testing.T) {
	p := &tcpUDPProvider{
		udpRoutes: []traefikv1alpha1.IngressRouteUDP{{ObjectMeta: metav1.ObjectMeta{Name: "udp-a"}}},
	}
	h := NewTCPUDPHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.ListUDP, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.IngressRouteUDP
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 UDP route, got %d", len(result))
	}
}

func TestTCPUDPHandler_CreateUDP(t *testing.T) {
	h := NewTCPUDPHandler(&mockManager{p: &tcpUDPProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"udp-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.CreateUDP, r)

	assertStatus(t, w, 200)
}

func TestTCPUDPHandler_DeleteUDP(t *testing.T) {
	h := NewTCPUDPHandler(&mockManager{p: &tcpUDPProvider{}})

	r := newJSONRequest("DELETE", "/udp-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "udp-a"})
	w := serve(h.DeleteUDP, r)

	assertStatus(t, w, 204)
}

func TestTCPUDPHandler_UpdateTCP(t *testing.T) {
	h := NewTCPUDPHandler(&mockManager{p: &tcpUDPProvider{}})

	r := newJSONRequest("PUT", "/tcp-a", `{"metadata":{"name":"tcp-a"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "tcp-a"})
	w := serve(h.UpdateTCP, r)

	assertStatus(t, w, 200)
}

func TestTCPUDPHandler_UpdateUDP(t *testing.T) {
	h := NewTCPUDPHandler(&mockManager{p: &tcpUDPProvider{}})

	r := newJSONRequest("PUT", "/udp-a", `{"metadata":{"name":"udp-a"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "udp-a"})
	w := serve(h.UpdateUDP, r)

	assertStatus(t, w, 200)
}
