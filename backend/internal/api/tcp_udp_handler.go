package api

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	traefikalphav1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	"github.com/noovastack/traefik-manager/internal/provider"
)

type TCPUDPHandler struct {
	manager provider.Manager
}

func NewTCPUDPHandler(manager provider.Manager) *TCPUDPHandler {
	return &TCPUDPHandler{manager: manager}
}

func (h *TCPUDPHandler) RoutesTCP() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.ListTCP)
	r.Post("/", h.CreateTCP)
	r.Put("/{name}", h.UpdateTCP)
	r.Delete("/{name}", h.DeleteTCP)
	return r
}

func (h *TCPUDPHandler) RoutesUDP() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.ListUDP)
	r.Post("/", h.CreateUDP)
	r.Put("/{name}", h.UpdateUDP)
	r.Delete("/{name}", h.DeleteUDP)
	return r
}

// ── IngressRouteTCP ─────────────────────────────────────────────────────────

func (h *TCPUDPHandler) ListTCP(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
routes, err := h.manager.Get(r).GetIngressRoutesTCP(namespace)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(routes)
}

func (h *TCPUDPHandler) CreateTCP(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
var crd traefikalphav1.IngressRouteTCP
if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
http.Error(w, err.Error(), http.StatusBadRequest)
return
}

created, err := h.manager.Get(r).CreateIngressRouteTCP(namespace, &crd)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(created)
}

func (h *TCPUDPHandler) UpdateTCP(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
name := chi.URLParam(r, "name")
var crd traefikalphav1.IngressRouteTCP
if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
http.Error(w, err.Error(), http.StatusBadRequest)
return
}

updated, err := h.manager.Get(r).UpdateIngressRouteTCP(namespace, name, &crd)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(updated)
}

func (h *TCPUDPHandler) DeleteTCP(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
name := chi.URLParam(r, "name")
if err := h.manager.Get(r).DeleteIngressRouteTCP(namespace, name); err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
w.WriteHeader(http.StatusNoContent)
}

// ── IngressRouteUDP ─────────────────────────────────────────────────────────

func (h *TCPUDPHandler) ListUDP(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
routes, err := h.manager.Get(r).GetIngressRoutesUDP(namespace)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(routes)
}

func (h *TCPUDPHandler) CreateUDP(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
var crd traefikalphav1.IngressRouteUDP
if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
http.Error(w, err.Error(), http.StatusBadRequest)
return
}

created, err := h.manager.Get(r).CreateIngressRouteUDP(namespace, &crd)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(created)
}

func (h *TCPUDPHandler) UpdateUDP(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
name := chi.URLParam(r, "name")
var crd traefikalphav1.IngressRouteUDP
if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
http.Error(w, err.Error(), http.StatusBadRequest)
return
}

updated, err := h.manager.Get(r).UpdateIngressRouteUDP(namespace, name, &crd)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(updated)
}

func (h *TCPUDPHandler) DeleteUDP(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
name := chi.URLParam(r, "name")
if err := h.manager.Get(r).DeleteIngressRouteUDP(namespace, name); err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
w.WriteHeader(http.StatusNoContent)
}
