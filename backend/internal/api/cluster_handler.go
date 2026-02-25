package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/chousour/traefik-manager/internal/db"
	"github.com/chousour/traefik-manager/internal/crypto"
)

type ClusterManager interface {
	AddCluster(id int, name, kubeconfig string) error
	RemoveCluster(id int)
}

type ClusterHandler struct {
	manager ClusterManager
}

func NewClusterHandler(manager ClusterManager) *ClusterHandler {
	return &ClusterHandler{manager: manager}
}

func (h *ClusterHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Delete("/{id}", h.Delete)
	return r
}

type ClusterResponse struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	CreatedAt string `json:"createdAt"`
}

func (h *ClusterHandler) List(w http.ResponseWriter, r *http.Request) {
	clusters, err := db.GetClusters()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	res := make([]ClusterResponse, len(clusters))
	for i, c := range clusters {
		res[i] = ClusterResponse{
			ID:        c.ID,
			Name:      c.Name,
			CreatedAt: c.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	respondJSON(w, http.StatusOK, res)
}

type CreateClusterRequest struct {
	Name       string `json:"name"`
	Kubeconfig string `json:"kubeconfig"`
}

func (h *ClusterHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateClusterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	if req.Name == "" || req.Kubeconfig == "" {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "name and kubeconfig are required")
		return
	}

	// Encrypt the Kubeconfig before saving
	encrypted, err := crypto.Encrypt(req.Kubeconfig)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "CRYPTO_ERROR", "failed to encrypt credentials: "+err.Error())
		return
	}

	id, err := db.AddCluster(req.Name, encrypted)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", "failed to save cluster to db: "+err.Error())
		return
	}

	// Update the in-memory pool
	if err := h.manager.AddCluster(id, req.Name, req.Kubeconfig); err != nil {
		// Rollback DB insertion if we can't authenticate to it
		db.DeleteCluster(id)
		respondError(w, http.StatusBadRequest, "K8S_AUTH_FAILED", "failed to authenticate cluster: "+err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"id":   id,
		"name": req.Name,
	})
}

func (h *ClusterHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_ID", "id must be an integer")
		return
	}

	if err := db.DeleteCluster(id); err != nil {
		respondError(w, http.StatusInternalServerError, "DB_ERROR", err.Error())
		return
	}

	h.manager.RemoveCluster(id)
	w.WriteHeader(http.StatusNoContent)
}
