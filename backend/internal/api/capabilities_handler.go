package api

import (
	"net/http"
	"strings"

	"github.com/noovastack/pre-rup-traefik-manager/internal/provider"
)

type CapabilitiesHandler struct {
	manager provider.Manager
}

func NewCapabilitiesHandler(manager provider.Manager) *CapabilitiesHandler {
	return &CapabilitiesHandler{manager: manager}
}

type CapabilitiesResponse struct {
	Traefik    bool `json:"traefik"`
	GatewayAPI bool `json:"gatewayApi"`
}

func (h *CapabilitiesHandler) Get(w http.ResponseWriter, r *http.Request) {
	k8s := h.manager.GetK8s(r)
	if k8s == nil {
		respondJSON(w, http.StatusOK, CapabilitiesResponse{})
		return
	}

	groups, err := k8s.Discovery().ServerGroups()
	if err != nil {
		internalError(w, err, "DISCOVERY_ERROR")
		return
	}

	caps := CapabilitiesResponse{}
	for _, g := range groups.Groups {
		name := strings.ToLower(g.Name)
		if strings.Contains(name, "traefik") {
			caps.Traefik = true
		}
		if name == "gateway.networking.k8s.io" {
			caps.GatewayAPI = true
		}
	}

	respondJSON(w, http.StatusOK, caps)
}
