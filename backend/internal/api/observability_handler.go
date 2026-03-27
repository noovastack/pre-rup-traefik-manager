package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/noovastack/traefik-manager/internal/provider"
)

// ObservabilityHandler handles requests for telemetry settings.
type ObservabilityHandler struct {
	manager provider.Manager
}

// NewObservabilityHandler creates a new handle.
func NewObservabilityHandler(manager provider.Manager) *ObservabilityHandler {
	return &ObservabilityHandler{manager: manager}
}

func (h *ObservabilityHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/{name}", h.Get)
	r.Put("/{name}", h.Update)
	return r
}

func (h *ObservabilityHandler) Get(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	ctx := r.Context()
	data, err := h.manager.Get(r).GetTelemetryConfig(ctx, namespace, name)
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}

	respondJSON(w, http.StatusOK, data)
}

func (h *ObservabilityHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	var data map[string]interface{}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	ctx := r.Context()
	err := h.manager.Get(r).UpdateTelemetryConfig(ctx, namespace, name, data)
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}

	respondJSON(w, http.StatusOK, data)
}
