package api

import (
	"encoding/json"
	"testing"

	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type httpRouteProvider struct {
	mockProvider
	items []gatewayv1.HTTPRoute
}

func (p *httpRouteProvider) GetHTTPRoutes(namespace string) ([]gatewayv1.HTTPRoute, error) {
	return p.items, nil
}

func (p *httpRouteProvider) GetHTTPRoute(namespace, name string) (*gatewayv1.HTTPRoute, error) {
	return &gatewayv1.HTTPRoute{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *httpRouteProvider) CreateHTTPRoute(namespace string, obj *gatewayv1.HTTPRoute) (*gatewayv1.HTTPRoute, error) {
	return obj, nil
}

func (p *httpRouteProvider) UpdateHTTPRoute(namespace, name string, obj *gatewayv1.HTTPRoute) (*gatewayv1.HTTPRoute, error) {
	return obj, nil
}

func (p *httpRouteProvider) DeleteHTTPRoute(namespace, name string) error {
	return nil
}

func TestHTTPRouteHandler_List(t *testing.T) {
	p := &httpRouteProvider{
		items: []gatewayv1.HTTPRoute{{ObjectMeta: metav1.ObjectMeta{Name: "hr-a"}}},
	}
	h := NewHTTPRouteHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []gatewayv1.HTTPRoute
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 route, got %d", len(result))
	}
}

func TestHTTPRouteHandler_Create(t *testing.T) {
	h := NewHTTPRouteHandler(&mockManager{p: &httpRouteProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"hr-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 201)
}

func TestHTTPRouteHandler_Delete(t *testing.T) {
	h := NewHTTPRouteHandler(&mockManager{p: &httpRouteProvider{}})

	r := newJSONRequest("DELETE", "/hr-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "hr-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}
