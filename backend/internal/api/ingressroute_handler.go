package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"k8s.io/apimachinery/pkg/api/errors"

	"github.com/noovastack/traefik-manager/internal/provider"
	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
)

type IngressRouteHandler struct {
	manager provider.Manager
}

func NewIngressRouteHandler(manager provider.Manager) *IngressRouteHandler {
	return &IngressRouteHandler{manager: manager}
}

func (h *IngressRouteHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{name}", h.Get)
	r.Put("/{name}", h.Update)
	r.Delete("/{name}", h.Delete)
	return r
}

func (h *IngressRouteHandler) List(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	routes, err := h.manager.Get(r).GetIngressRoutes(namespace)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "K8S_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, routes)
}

func (h *IngressRouteHandler) Get(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	route, err := h.manager.Get(r).GetIngressRoute(namespace, name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "IngressRoute not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "K8S_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, route)
}

func (h *IngressRouteHandler) Create(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	var ir traefikv1alpha1.IngressRoute
	if err := json.NewDecoder(r.Body).Decode(&ir); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	// Safety: force namespace to match URL
	ir.Namespace = namespace

	created, err := h.manager.Get(r).CreateIngressRoute(namespace, &ir)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "K8S_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *IngressRouteHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	var ir traefikv1alpha1.IngressRoute
	if err := json.NewDecoder(r.Body).Decode(&ir); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	// Retrieve existing to get ResourceVersion (required for updates)
	existing, err := h.manager.Get(r).GetIngressRoute(namespace, name)
	if err != nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "IngressRoute not found")
		return
	}

	ir.ObjectMeta.ResourceVersion = existing.ObjectMeta.ResourceVersion
	ir.Namespace = namespace
	ir.Name = name

	updated, err := h.manager.Get(r).UpdateIngressRoute(namespace, ir.Name, &ir)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "K8S_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

func (h *IngressRouteHandler) Delete(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	err := h.manager.Get(r).DeleteIngressRoute(namespace, name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "IngressRoute not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "K8S_ERROR", err.Error())
		return
	}
	
	w.WriteHeader(http.StatusNoContent)
}
