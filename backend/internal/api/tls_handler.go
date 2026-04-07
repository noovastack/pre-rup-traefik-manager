package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	traefikalphav1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"

	"github.com/noovastack/pre-rup-traefik-manager/internal/provider"
)

type TLSHandler struct {
	manager provider.Manager
}

func NewTLSHandler(manager provider.Manager) *TLSHandler {
	return &TLSHandler{manager: manager}
}

// Routes returns the chi router for /api/namespaces/{namespace}/tlsoptions
func (h *TLSHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{name}", h.Get)
	r.Put("/{name}", h.Update)
	r.Delete("/{name}", h.Delete)
	return r
}

func (h *TLSHandler) List(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	options, err := h.manager.Get(r).GetTLSOptions(namespace)
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, options)
}

func (h *TLSHandler) Get(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")
	option, err := h.manager.Get(r).GetTLSOption(namespace, name)
	if err != nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "TLSOption not found")
		return
	}
	respondJSON(w, http.StatusOK, option)
}

func (h *TLSHandler) Create(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	var option traefikalphav1.TLSOption
	if err := json.NewDecoder(r.Body).Decode(&option); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	created, err := h.manager.Get(r).CreateTLSOption(namespace, &option)
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *TLSHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")
	var option traefikalphav1.TLSOption
	if err := json.NewDecoder(r.Body).Decode(&option); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	updated, err := h.manager.Get(r).UpdateTLSOption(namespace, name, &option)
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

func (h *TLSHandler) Delete(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")
	if err := h.manager.Get(r).DeleteTLSOption(namespace, name); err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
