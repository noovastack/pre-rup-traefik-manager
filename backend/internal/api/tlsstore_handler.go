package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	traefikalphav1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"

	"github.com/noovastack/pre-rup-traefik-manager/internal/provider"
)

type TLSStoreHandler struct {
	manager provider.Manager
}

func NewTLSStoreHandler(manager provider.Manager) *TLSStoreHandler {
	return &TLSStoreHandler{manager: manager}
}

func (h *TLSStoreHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{name}", h.Get)
	r.Put("/{name}", h.Update)
	r.Delete("/{name}", h.Delete)
	return r
}

func (h *TLSStoreHandler) List(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	stores, err := h.manager.Get(r).GetTLSStores(namespace)
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, stores)
}

func (h *TLSStoreHandler) Get(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")
	store, err := h.manager.Get(r).GetTLSStore(namespace, name)
	if err != nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "TLSStore not found")
		return
	}
	respondJSON(w, http.StatusOK, store)
}

func (h *TLSStoreHandler) Create(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	var store traefikalphav1.TLSStore
	if err := json.NewDecoder(r.Body).Decode(&store); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	created, err := h.manager.Get(r).CreateTLSStore(namespace, &store)
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *TLSStoreHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")
	var store traefikalphav1.TLSStore
	if err := json.NewDecoder(r.Body).Decode(&store); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}
	updated, err := h.manager.Get(r).UpdateTLSStore(namespace, name, &store)
	if err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, updated)
}

func (h *TLSStoreHandler) Delete(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")
	if err := h.manager.Get(r).DeleteTLSStore(namespace, name); err != nil {
		internalError(w, err, "K8S_ERROR")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
