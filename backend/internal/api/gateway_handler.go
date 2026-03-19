package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"k8s.io/apimachinery/pkg/api/errors"

	"github.com/noovastack/traefik-manager/internal/provider"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

type GatewayHandler struct {
	manager provider.Manager
}

func NewGatewayHandler(manager provider.Manager) *GatewayHandler {
	return &GatewayHandler{manager: manager}
}

func (h *GatewayHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{name}", h.Get)
	r.Put("/{name}", h.Update)
	r.Delete("/{name}", h.Delete)
	return r
}

func (h *GatewayHandler) List(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	gateways, err := h.manager.Get(r).GetGateways(namespace)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, gateways)
}

func (h *GatewayHandler) Get(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	gw, err := h.manager.Get(r).GetGateway(namespace, name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "Gateway not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, gw)
}

func (h *GatewayHandler) Create(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	var gw gatewayv1.Gateway
	if err := json.NewDecoder(r.Body).Decode(&gw); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	gw.Namespace = namespace

	created, err := h.manager.Get(r).CreateGateway(namespace, &gw)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, created)
}

func (h *GatewayHandler) Update(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	var gw gatewayv1.Gateway
	if err := json.NewDecoder(r.Body).Decode(&gw); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	existing, err := h.manager.Get(r).GetGateway(namespace, name)
	if err != nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "Gateway not found")
		return
	}

	gw.ObjectMeta.ResourceVersion = existing.ObjectMeta.ResourceVersion
	gw.Namespace = namespace
	gw.Name = name

	updated, err := h.manager.Get(r).UpdateGateway(namespace, gw.Name, &gw)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}

	respondJSON(w, http.StatusOK, updated)
}

func (h *GatewayHandler) Delete(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	name := chi.URLParam(r, "name")

	err := h.manager.Get(r).DeleteGateway(namespace, name)
	if err != nil {
		if errors.IsNotFound(err) {
			respondError(w, http.StatusNotFound, "NOT_FOUND", "Gateway not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
