package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/noovastack/pre-rup-traefik-manager/internal/provider"
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
		internalError(w, err, "PROVIDER_ERROR")
		return
	}
	respondJSON(w, http.StatusOK, nss)
}
