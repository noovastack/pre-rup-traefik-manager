package api

import (
	"context"
	"encoding/json"
	"testing"
)

type observabilityProvider struct {
	mockProvider
	config map[string]interface{}
}

func (p *observabilityProvider) GetTelemetryConfig(ctx context.Context, namespace, name string) (map[string]interface{}, error) {
	if p.config == nil {
		return map[string]interface{}{}, nil
	}
	return p.config, nil
}

func (p *observabilityProvider) UpdateTelemetryConfig(ctx context.Context, namespace, name string, data map[string]interface{}) error {
	p.config = data
	return nil
}

func TestObservabilityHandler_Get(t *testing.T) {
	p := &observabilityProvider{config: map[string]interface{}{"tracing": "jaeger"}}
	h := NewObservabilityHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/traefik-config", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "traefik-config"})
	w := serve(h.Get, r)

	assertStatus(t, w, 200)
	var result map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("parse: %v", err)
	}
	if result["tracing"] != "jaeger" {
		t.Errorf("expected tracing=jaeger, got %v", result["tracing"])
	}
}

func TestObservabilityHandler_Update(t *testing.T) {
	p := &observabilityProvider{}
	h := NewObservabilityHandler(&mockManager{p: p})

	r := newJSONRequest("PUT", "/traefik-config", `{"tracing":"zipkin"}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "traefik-config"})
	w := serve(h.Update, r)

	assertStatus(t, w, 200)
}

func TestObservabilityHandler_Update_InvalidJSON(t *testing.T) {
	p := &observabilityProvider{}
	h := NewObservabilityHandler(&mockManager{p: p})

	r := newJSONRequest("PUT", "/traefik-config", `not json`, "")
	r = withChiParams(r, map[string]string{"namespace": "default", "name": "traefik-config"})
	w := serve(h.Update, r)

	assertStatus(t, w, 400)
	assertContains(t, w, "INVALID_JSON")
}
