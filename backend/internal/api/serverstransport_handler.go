package api

import (
"encoding/json"
"net/http"

"github.com/go-chi/chi/v5"
traefikalphav1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
"github.com/chousour/traefik-manager/internal/provider"
)

type ServersTransportHandler struct {
manager provider.Manager
}

func NewServersTransportHandler(manager provider.Manager) *ServersTransportHandler {
return &ServersTransportHandler{manager: manager}
}

func (h *ServersTransportHandler) Routes() chi.Router {
r := chi.NewRouter()
r.Get("/", h.List)
r.Post("/", h.Create)
r.Put("/{name}", h.Update)
r.Delete("/{name}", h.Delete)
return r
}

func (h *ServersTransportHandler) List(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
transports, err := h.manager.Get(r).GetServersTransports(namespace)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(transports)
}

func (h *ServersTransportHandler) Create(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
var crd traefikalphav1.ServersTransport
if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
http.Error(w, err.Error(), http.StatusBadRequest)
return
}

created, err := h.manager.Get(r).CreateServersTransport(namespace, &crd)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(created)
}

func (h *ServersTransportHandler) Update(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
name := chi.URLParam(r, "name")
var crd traefikalphav1.ServersTransport
if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
http.Error(w, err.Error(), http.StatusBadRequest)
return
}

updated, err := h.manager.Get(r).UpdateServersTransport(namespace, name, &crd)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(updated)
}

func (h *ServersTransportHandler) Delete(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
name := chi.URLParam(r, "name")
if err := h.manager.Get(r).DeleteServersTransport(namespace, name); err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
w.WriteHeader(http.StatusNoContent)
}
