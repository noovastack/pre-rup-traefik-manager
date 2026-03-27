package api

import (
	"encoding/json"
	"testing"

	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type gatewayProvider struct {
	mockProvider
	items []gatewayv1.Gateway
}

func (p *gatewayProvider) GetGateways(namespace string) ([]gatewayv1.Gateway, error) {
	return p.items, nil
}

func (p *gatewayProvider) GetGateway(namespace, name string) (*gatewayv1.Gateway, error) {
	return &gatewayv1.Gateway{ObjectMeta: metav1.ObjectMeta{Name: name}}, nil
}

func (p *gatewayProvider) CreateGateway(namespace string, obj *gatewayv1.Gateway) (*gatewayv1.Gateway, error) {
	return obj, nil
}

func (p *gatewayProvider) UpdateGateway(namespace, name string, obj *gatewayv1.Gateway) (*gatewayv1.Gateway, error) {
	return obj, nil
}

func (p *gatewayProvider) DeleteGateway(namespace, name string) error {
	return nil
}

func TestGatewayHandler_List(t *testing.T) {
	p := &gatewayProvider{
		items: []gatewayv1.Gateway{{ObjectMeta: metav1.ObjectMeta{Name: "gw-a"}}},
	}
	h := NewGatewayHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var result []gatewayv1.Gateway
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if len(result) != 1 {
		t.Errorf("want 1 gateway, got %d", len(result))
	}
}

func TestGatewayHandler_Create(t *testing.T) {
	h := NewGatewayHandler(&mockManager{p: &gatewayProvider{}})

	r := newJSONRequest("POST", "/", `{"metadata":{"name":"gw-new"}}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Create, r)

	assertStatus(t, w, 201)
}

func TestGatewayHandler_Delete(t *testing.T) {
	h := NewGatewayHandler(&mockManager{p: &gatewayProvider{}})

	r := newJSONRequest("DELETE", "/gw-a", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "gw-a"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 204)
}
