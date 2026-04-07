package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/noovastack/pre-rup-traefik-manager/internal/provider"
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
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "namespace parameter is required")
		return
	}

	config, err := h.manager.Get(r).GetPluginConfig(r.Context(), namespace, "traefik-plugins")
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(config) //nolint:errcheck
}

// Update handles PUT /api/v1/namespaces/{namespace}/plugins
func (h *PluginHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	if namespace == "" {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "namespace parameter is required")
		return
	}

	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", "invalid request body")
		return
	}

	err := h.manager.Get(r).UpdatePluginConfig(r.Context(), namespace, "traefik-plugins", data)
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"}) //nolint:errcheck
}
