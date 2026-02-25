package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"k8s.io/apimachinery/pkg/api/errors"

	"github.com/chousour/traefik-manager/internal/provider"
	traefikv1alpha1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
)

type MiddlewareHandler struct {
	manager provider.Manager
}

func NewMiddlewareHandler(manager provider.Manager) *MiddlewareHandler {
	return &MiddlewareHandler{manager: manager}
}

func (h *MiddlewareHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{name}", h.Get)
	r.Put("/{name}", h.Update)
	r.Delete("/{name}", h.Delete)
	return r
}

func (h *MiddlewareHandler) List(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	middlewares, err := h.manager.Get(r).GetMiddlewares(namespace)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, middlewares)
}

func (h *MiddlewareHandler) Get(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	mw, err := h.manager.Get(r).GetMiddleware(namespace, name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "Middleware not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, mw)
}

func (h *MiddlewareHandler) Create(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	var mw traefikv1alpha1.Middleware
	if err := json.NewDecoder(r.Body).Decode(&mw); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	// Safety: force namespace to match URL
	mw.Namespace = namespace

	created, err := h.manager.Get(r).CreateMiddleware(namespace, &mw)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *MiddlewareHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	var mw traefikv1alpha1.Middleware
	if err := json.NewDecoder(r.Body).Decode(&mw); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	// Retrieve existing to get ResourceVersion (required for updates)
	existing, err := h.manager.Get(r).GetMiddleware(namespace, name)
	if err != nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "Middleware not found")
		return
	}

	mw.ObjectMeta.ResourceVersion = existing.ObjectMeta.ResourceVersion
	mw.Namespace = namespace
	mw.Name = name

	updated, err := h.manager.Get(r).UpdateMiddleware(namespace, mw.Name, &mw)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

func (h *MiddlewareHandler) Delete(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	err := h.manager.Get(r).DeleteMiddleware(namespace, name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "Middleware not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}
	
	w.WriteHeader(http.StatusNoContent)
}
