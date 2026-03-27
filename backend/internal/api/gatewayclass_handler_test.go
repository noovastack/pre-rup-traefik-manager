package api

import (
	"encoding/json"
	"testing"

	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type gatewayClassProvider struct {
	mockProvider
	items []gatewayv1.GatewayClass
}

func (p *gatewayClassProvider) GetGatewayClasses() ([]gatewayv1.GatewayClass, error) {
	return p.items, nil
}

func (p *gatewayClassProvider) GetGatewayClass(name string) (*gatewayv1.GatewayClass, error) {
	return &gatewayv1.GatewayClass{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *gatewayClassProvider) CreateGatewayClass(obj *gatewayv1.GatewayClass) (*gatewayv1.GatewayClass, error) {
	return obj, nil
}

func (p *gatewayClassProvider) UpdateGatewayClass(name string, obj *gatewayv1.GatewayClass) (*gatewayv1.GatewayClass, error) {
	return obj, nil
}

func (p *gatewayClassProvider) DeleteGatewayClass(name string) error {
	return nil
}

func TestGatewayClassHandler_List(t *testing.T) {
	p := &gatewayClassProvider{
		items: []gatewayv1.GatewayClass{{ObjectMeta: metav1.ObjectMeta{Name: "gc-a"}}},
	}
	h := NewGatewayClassHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []gatewayv1.GatewayClass
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 item, got %d", len(result))
	}
}

func TestGatewayClassHandler_Create(t *testing.T) {
	h := NewGatewayClassHandler(&mockManager{p: &gatewayClassProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"gc-new"}}`, "")
	w := serve(h.Create, r)

	assertStatus(t, w, 201)
}

func TestGatewayClassHandler_Delete(t *testing.T) {
	h := NewGatewayClassHandler(&mockManager{p: &gatewayClassProvider{}})

	r := newJSONRequest("DELETE", "/gc-a", "", "")
	r = withChiParams(r, map[string]string{"name": "gc-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}
