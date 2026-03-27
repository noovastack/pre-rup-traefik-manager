package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/noovastack/traefik-manager/internal/provider"
)

type ServiceHandler struct {
	manager provider.Manager
}

func NewServiceHandler(manager provider.Manager) *ServiceHandler {
	return &ServiceHandler{manager: manager}
}

func (h *ServiceHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Get("/{service}/endpoints", h.ListEndpoints)
	return r
}

func (h *ServiceHandler) List(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	if namespace == "" {
		respondError(w, http.StatusBadRequest, "INVALID_INPUT", "namespace is required")
		return
	}

	svcs, err := h.manager.Get(r).GetServices(r.Context(), namespace)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}

	// Just return names to keep it simple, since the UI only needs names for dropdowns.
	// We'll update UI if it strictly requires the `ports` array later.
	type svcResp struct {
		Name  string `json:"name"`
	}

	var results []svcResp
	for _, name := range svcs {
		results = append(results, svcResp{Name: name})
	}

	respondJSON(w, http.StatusOK, results)
}

func (h *ServiceHandler) ListEndpoints(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	service := chi.URLParam(r, "service")
	if namespace == "" || service == "" {
		respondError(w, http.StatusBadRequest, "INVALID_INPUT", "namespace and service are required")
		return
	}

	eps, err := h.manager.Get(r).GetEndpoints(r.Context(), namespace, service)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}

	type epResp struct {
		Name string `json:"name"`
	}

	results := make([]epResp, 0, len(eps))
	for _, name := range eps {
		results = append(results, epResp{Name: name})
	}

	respondJSON(w, http.StatusOK, results)
}
