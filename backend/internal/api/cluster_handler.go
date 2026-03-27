package api

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/noovastack/traefik-manager/internal/crypto"
	"github.com/noovastack/traefik-manager/internal/db"
)

type ClusterManager interface {
	AddCluster(id int, name, serverURL, token, caCert string) error
	RemoveClusterByName(name string)
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
	ServerURL string `json:"serverUrl"`
	CreatedAt string `json:"createdAt"`
}

func (h *ClusterHandler) List(w http.ResponseWriter, r *http.Request) {
	clusters, err := db.GetClusters()
	if err != nil {
		internalError(w, err, "DB_ERROR")
		return
	}

	res := make([]ClusterResponse, len(clusters))
	for i, c := range clusters {
		res[i] = ClusterResponse{
			ID:        c.ID,
			Name:      c.Name,
			ServerURL: c.ServerURL,
			CreatedAt: c.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}
	respondJSON(w, http.StatusOK, res)
}

type CreateClusterRequest struct {
	Name      string `json:"name"`
	ServerURL string `json:"serverUrl"`
	Token     string `json:"token"`
	CACert    string `json:"caCert"`
}

func (h *ClusterHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateClusterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
		return
	}

	if req.Name == "" || req.ServerURL == "" || req.Token == "" {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "name, serverUrl, and token are required")
		return
	}

	if u, err := url.ParseRequestURI(req.ServerURL); err != nil || (u.Scheme != "https" && u.Scheme != "http") {
		respondError(w, http.StatusBadRequest, "VALIDATION_FAILED", "serverUrl must be a valid http or https URL")
		return
	}

	encToken, err := crypto.Encrypt(req.Token)
	if err != nil {
		internalError(w, err, "CRYPTO_ERROR")
		return
	}

	encCA := ""
	if req.CACert != "" {
		encCA, err = crypto.Encrypt(req.CACert)
		if err != nil {
			internalError(w, err, "CRYPTO_ERROR")
			return
		}
	}

	id, err := db.AddCluster(req.Name, req.ServerURL, encToken, encCA)
	if err != nil {
		internalError(w, err, "DB_ERROR")
		return
	}

	// Test connectivity before confirming success
	if err := h.manager.AddCluster(id, req.Name, req.ServerURL, req.Token, req.CACert); err != nil {
		db.DeleteCluster(id)
		log.Printf("[ERR] cluster %q connect failed: %v", req.Name, err)
		respondError(w, http.StatusBadRequest, "K8S_AUTH_FAILED", "failed to connect to cluster; check the server URL and token")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"id":        id,
		"name":      req.Name,
		"serverUrl": req.ServerURL,
	})
}

func (h *ClusterHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "INVALID_ID", "id must be an integer")
		return
	}

	cluster, err := db.GetClusterByID(id)
	if err != nil {
		internalError(w, err, "DB_ERROR")
		return
	}
	if cluster == nil {
		respondError(w, http.StatusNotFound, "NOT_FOUND", "cluster not found")
		return
	}

	if err := db.DeleteCluster(id); err != nil {
		internalError(w, err, "DB_ERROR")
		return
	}

	h.manager.RemoveClusterByName(cluster.Name)
	w.WriteHeader(http.StatusNoContent)
}
