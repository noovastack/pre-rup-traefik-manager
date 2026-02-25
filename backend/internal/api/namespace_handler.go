package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/chousour/traefik-manager/internal/provider"
)

type NamespaceHandler struct {
	manager provider.Manager
}

func NewNamespaceHandler(manager provider.Manager) *NamespaceHandler {
	return &NamespaceHandler{manager: manager}
}

func (h *NamespaceHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	return r
}

func (h *NamespaceHandler) List(w http.ResponseWriter, r *http.Request) {
	nss, err := h.manager.Get(r).GetNamespaces(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "PROVIDER_ERROR", err.Error())
		return
	}
	respondJSON(w, http.StatusOK, nss)
}
