package api

import (
	"encoding/json"
	"testing"

	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type ingressRouteProvider struct {
	mockProvider
	routes    []traefikv1alpha1.IngressRoute
	listErr   error
	createErr error
	deleteErr error
}

func (p *ingressRouteProvider) GetIngressRoutes(namespace string) ([]traefikv1alpha1.IngressRoute, error) {
	return p.routes, p.listErr
}

func (p *ingressRouteProvider) GetIngressRoute(namespace, name string) (*traefikv1alpha1.IngressRoute, error) {
	for i := range p.routes {
		if p.routes[i].Name == name {
			return &p.routes[i], nil
		}
	}
	return &traefikv1alpha1.IngressRoute{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *ingressRouteProvider) CreateIngressRoute(namespace string, route *traefikv1alpha1.IngressRoute) (*traefikv1alpha1.IngressRoute, error) {
	return route, p.createErr
}

func (p *ingressRouteProvider) UpdateIngressRoute(namespace, name string, route *traefikv1alpha1.IngressRoute) (*traefikv1alpha1.IngressRoute, error) {
	return route, nil
}

func (p *ingressRouteProvider) DeleteIngressRoute(namespace, name string) error {
	return p.deleteErr
}

func TestIngressRouteHandler_List(t *testing.T) {
	p := &ingressRouteProvider{
		routes: []traefikv1alpha1.IngressRoute{
			{ObjectMeta: metav1.ObjectMeta{Name: "route-a", Namespace: "default"}},
		},
	}
	h := NewIngressRouteHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []traefikv1alpha1.IngressRoute
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 route, got %d", len(result))
	}
}

func TestIngressRouteHandler_Get(t *testing.T) {
	p := &ingressRouteProvider{
		routes: []traefikv1alpha1.IngressRoute{
			{ObjectMeta: metav1.ObjectMeta{Name: "route-a"}},
		},
	}
	h := NewIngressRouteHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/route-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "route-a"})
	w := serve(h.Get, r)

	assertStatus(t, w, 200)
	assertContains(t, w, "route-a")
}

func TestIngressRouteHandler_Create(t *testing.T) {
	p := &ingressRouteProvider{}
	h := NewIngressRouteHandler(&mockManager{p: p})

	body := `{"metadata":{"name":"new-route"},"spec":{}}`
	r := newJSONRequest("POST", "/", body, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 201)
}

func TestIngressRouteHandler_Create_InvalidJSON(t *testing.T) {
	p := &ingressRouteProvider{}
	h := NewIngressRouteHandler(&mockManager{p: p})

	r := newJSONRequest("POST", "/", `not json`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 400)
	assertContains(t, w, "INVALID_JSON")
}

func TestIngressRouteHandler_Update(t *testing.T) {
	p := &ingressRouteProvider{
		routes: []traefikv1alpha1.IngressRoute{
			{ObjectMeta: metav1.ObjectMeta{Name: "route-a", ResourceVersion: "1"}},
		},
	}
	h := NewIngressRouteHandler(&mockManager{p: p})

	body := `{"metadata":{"name":"route-a"},"spec":{}}`
	r := newJSONRequest("PUT", "/route-a", body, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "route-a"})
	w := serve(h.Update, r)

	assertStatus(t, w, 200)
}

func TestIngressRouteHandler_Delete(t *testing.T) {
	p := &ingressRouteProvider{}
	h := NewIngressRouteHandler(&mockManager{p: p})

	r := newJSONRequest("DELETE", "/route-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "route-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}
