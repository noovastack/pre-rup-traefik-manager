package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"k8s.io/apimachinery/pkg/api/errors"

	"github.com/noovastack/traefik-manager/internal/provider"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

type HTTPRouteHandler struct {
	manager provider.Manager
}

func NewHTTPRouteHandler(manager provider.Manager) *HTTPRouteHandler {
	return &HTTPRouteHandler{manager: manager}
}

func (h *HTTPRouteHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{name}", h.Get)
	r.Put("/{name}", h.Update)
	r.Delete("/{name}", h.Delete)
	return r
}

func (h *HTTPRouteHandler) List(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	routes, err := h.manager.Get(r).GetHTTPRoutes(namespace)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, routes)
}

func (h *HTTPRouteHandler) Get(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	hr, err := h.manager.Get(r).GetHTTPRoute(namespace, name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "HTTPRoute not found")
			return
		}
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, hr)
}

func (h *HTTPRouteHandler) Create(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	var hr gatewayv1.HTTPRoute
	if err := json.NewDecoder(r.Body).Decode(&hr); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	hr.Namespace = namespace

	created, err := h.manager.Get(r).CreateHTTPRoute(namespace, &hr)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *HTTPRouteHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	var hr gatewayv1.HTTPRoute
	if err := json.NewDecoder(r.Body).Decode(&hr); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	existing, err := h.manager.Get(r).GetHTTPRoute(namespace, name)
	if err != nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "HTTPRoute not found")
		return
	}

	hr.ObjectMeta.ResourceVersion = existing.ObjectMeta.ResourceVersion
	hr.Namespace = namespace
	hr.Name = name

	updated, err := h.manager.Get(r).UpdateHTTPRoute(namespace, hr.Name, &hr)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

func (h *HTTPRouteHandler) Delete(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	err := h.manager.Get(r).DeleteHTTPRoute(namespace, name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "HTTPRoute not found")
			return
		}
		internalError(w, err, "PROVIDER_ERROR")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
