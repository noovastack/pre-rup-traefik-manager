package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/chousour/traefik-manager/internal/provider"
)

// PluginHandler handles operations on Traefik Plugin ConfigMaps.
type PluginHandler struct {
	manager provider.Manager
}

// NewPluginHandler creates a new PluginHandler.
func NewPluginHandler(manager provider.Manager) *PluginHandler {
	return &PluginHandler{
		manager: manager,
	}
}

// Routes returns the chi router for plugins.
func (h *PluginHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.Get)
	r.Put("/", h.Update)
	return r
}

// Get handles GET /api/v1/namespaces/{namespace}/plugins
func (h *PluginHandler) Get(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	if namespace == "" {
		http.Error(w, "namespace parameter is required", http.StatusBadRequest)
		return
	}

	config, err := h.manager.Get(r).GetPluginConfig(r.Context(), namespace, "traefik-plugins")
	if err != nil {
		http.Error(w, "failed to get plugin config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config)
}

// Update handles PUT /api/v1/namespaces/{namespace}/plugins
func (h *PluginHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	if namespace == "" {
		http.Error(w, "namespace parameter is required", http.StatusBadRequest)
		return
	}

	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	err := h.manager.Get(r).UpdatePluginConfig(r.Context(), namespace, "traefik-plugins", data)
	if err != nil {
		http.Error(w, "failed to update plugin config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
