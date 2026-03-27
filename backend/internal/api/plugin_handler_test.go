package api

import (
	"context"
	"testing"
)

type pluginProvider struct {
	mockProvider
	config map[string]interface{}
}

func (p *pluginProvider) GetPluginConfig(ctx context.Context, namespace, name string) (map[string]interface{}, error) {
	if p.config == nil {
		return map[string]interface{}{}, nil
	}
	return p.config, nil
}

func (p *pluginProvider) UpdatePluginConfig(ctx context.Context, namespace, name string, data map[string]interface{}) error {
	p.config = data
	return nil
}

func TestPluginHandler_Get(t *testing.T) {
	p := &pluginProvider{config: map[string]interface{}{"plugin-name": "traefik-real-ip"}}
	h := NewPluginHandler(&mockManager{p: p})

	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Get, r)

	assertStatus(t, w, 200)
	assertContains(t, w, "traefik-real-ip")
}

func TestPluginHandler_Update(t *testing.T) {
	p := &pluginProvider{}
	h := NewPluginHandler(&mockManager{p: p})

	r := newJSONRequest("PUT", "/", `{"enabled":true}`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Update, r)

	assertStatus(t, w, 200)
	assertContains(t, w, "success")
}

func TestPluginHandler_Update_InvalidJSON(t *testing.T) {
	p := &pluginProvider{}
	h := NewPluginHandler(&mockManager{p: p})

	r := newJSONRequest("PUT", "/", `not json`, "")
	r = withChiParams(r, map[string]string{"namespace": "default"})
	w := serve(h.Update, r)

	assertStatus(t, w, 400)
	assertContains(t, w, "INVALID_JSON")
}

func TestPluginHandler_Get_MissingNamespace(t *testing.T) {
	p := &pluginProvider{}
	h := NewPluginHandler(&mockManager{p: p})

	// no namespace param in chi context
	r := newJSONRequest("GET", "/", "", "")
	r = withChiParams(r, map[string]string{})
	w := serve(h.Get, r)

	assertStatus(t, w, 400)
	assertContains(t, w, "VALIDATION_FAILED")
}
