package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"k8s.io/apimachinery/pkg/api/errors"

	"github.com/noovastack/traefik-manager/internal/provider"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

type GatewayClassHandler struct {
	manager provider.Manager
}

func NewGatewayClassHandler(manager provider.Manager) *GatewayClassHandler {
	return &GatewayClassHandler{manager: manager}
}

func (h *GatewayClassHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{name}", h.Get)
	r.Put("/{name}", h.Update)
	r.Delete("/{name}", h.Delete)
	return r
}

func (h *GatewayClassHandler) List(w http.ResponseWriter, r *http.Request) {
	classes, err := h.manager.Get(r).GetGatewayClasses()
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, classes)
}

func (h *GatewayClassHandler) Get(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	gc, err := h.manager.Get(r).GetGatewayClass(name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "GatewayClass not found")
			return
		}
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, gc)
}

func (h *GatewayClassHandler) Create(w http.ResponseWriter, r *http.Request) {
	var gc gatewayv1.GatewayClass
	if err := json.NewDecoder(r.Body).Decode(&gc); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	created, err := h.manager.Get(r).CreateGatewayClass(&gc)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *GatewayClassHandler) Update(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	var gc gatewayv1.GatewayClass
	if err := json.NewDecoder(r.Body).Decode(&gc); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	// Retrieve existing to get ResourceVersion
	existing, err := h.manager.Get(r).GetGatewayClass(name)
	if err != nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "GatewayClass not found")
		return
	}

	gc.ObjectMeta.ResourceVersion = existing.ObjectMeta.ResourceVersion
	gc.Name = name

	updated, err := h.manager.Get(r).UpdateGatewayClass(gc.Name, &gc)
	if err != nil {
		internalError(w, err, "PROVIDER_ERROR")
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

func (h *GatewayClassHandler) Delete(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")

	err := h.manager.Get(r).DeleteGatewayClass(name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "GatewayClass not found")
			return
		}
		internalError(w, err, "PROVIDER_ERROR")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
