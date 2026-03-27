package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	traefikalphav1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"

	"github.com/noovastack/traefik-manager/internal/provider"
)

type MiddlewareTCPHandler struct {
	manager provider.Manager
}

func NewMiddlewareTCPHandler(manager provider.Manager) *MiddlewareTCPHandler {
	return &MiddlewareTCPHandler{manager: manager}
}

func (h *MiddlewareTCPHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Put("/{name}", h.Update)
	r.Delete("/{name}", h.Delete)
	return r
}

func (h *MiddlewareTCPHandler) List(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	middlewares, err := h.manager.Get(r).GetMiddlewaresTCP(namespace)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, middlewares)
}

func (h *MiddlewareTCPHandler) Create(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	var crd traefikalphav1.MiddlewareTCP
	if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	created, err := h.manager.Get(r).CreateMiddlewareTCP(namespace, &crd)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, created)
}

func (h *MiddlewareTCPHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")
	var crd traefikalphav1.MiddlewareTCP
	if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	updated, err := h.manager.Get(r).UpdateMiddlewareTCP(namespace, name, &crd)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

func (h *MiddlewareTCPHandler) Delete(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")
	if err := h.manager.Get(r).DeleteMiddlewareTCP(namespace, name); err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
