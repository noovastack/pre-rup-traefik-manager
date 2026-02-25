package api

import (
"encoding/json"
"net/http"

"github.com/go-chi/chi/v5"
traefikalphav1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
"github.com/chousour/traefik-manager/internal/provider"
)

type TraefikServiceHandler struct {
manager provider.Manager
}

func NewTraefikServiceHandler(manager provider.Manager) *TraefikServiceHandler {
return &TraefikServiceHandler{manager: manager}
}

func (h *TraefikServiceHandler) Routes() chi.Router {
r := chi.NewRouter()
r.Get("/", h.List)
r.Post("/", h.Create)
r.Put("/{name}", h.Update)
r.Delete("/{name}", h.Delete)
return r
}

func (h *TraefikServiceHandler) List(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
services, err := h.manager.Get(r).GetTraefikServices(namespace)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(services)
}

func (h *TraefikServiceHandler) Create(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
var crd traefikalphav1.TraefikService
if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
http.Error(w, err.Error(), http.StatusBadRequest)
return
}

created, err := h.manager.Get(r).CreateTraefikService(namespace, &crd)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(created)
}

func (h *TraefikServiceHandler) Update(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
name := chi.URLParam(r, "name")
var crd traefikalphav1.TraefikService
if err := json.NewDecoder(r.Body).Decode(&crd); err != nil {
http.Error(w, err.Error(), http.StatusBadRequest)
return
}

updated, err := h.manager.Get(r).UpdateTraefikService(namespace, name, &crd)
if err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
json.NewEncoder(w).Encode(updated)
}

func (h *TraefikServiceHandler) Delete(w http.ResponseWriter, r *http.Request) {
namespace := chi.URLParam(r, "namespace")
name := chi.URLParam(r, "name")
if err := h.manager.Get(r).DeleteTraefikService(namespace, name); err != nil {
http.Error(w, err.Error(), http.StatusInternalServerError)
return
}
w.WriteHeader(http.StatusNoContent)
}
