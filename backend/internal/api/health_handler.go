package api

import (
	"context"
	"net/http"
	"time"

	"github.com/noovastack/traefik-manager/internal/provider"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type HealthHandler struct {
	manager provider.Manager
}

func NewHealthHandler(manager provider.Manager) *HealthHandler {
	return &HealthHandler{manager: manager}
}

type NodeSummary struct {
	Total int `json:"total"`
	Ready int `json:"ready"`
}

type PodSummary struct {
	Total   int `json:"total"`
	Running int `json:"running"`
	Pending int `json:"pending"`
	Failed  int `json:"failed"`
}

type ClusterHealthResponse struct {
	KubernetesVersion string     `json:"kubernetesVersion"`
	Platform          string     `json:"platform"`
	Nodes             NodeSummary `json:"nodes"`
	Pods              PodSummary  `json:"pods"`
}

func (h *HealthHandler) Get(w http.ResponseWriter, r *http.Request) {
	k8s := h.manager.GetK8s(r)
	if k8s == nil {
		respondError(w, http.StatusServiceUnavailable, "NO_K8S", "Kubernetes client not available")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
	defer cancel()

	// Server version
	version, err := k8s.Discovery().ServerVersion()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "VERSION_ERROR", "failed to get server version: "+err.Error())
		return
	}

	// Nodes
	nodes, err := k8s.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "NODES_ERROR", "failed to list nodes: "+err.Error())
		return
	}

	nodeSummary := NodeSummary{Total: len(nodes.Items)}
	for _, node := range nodes.Items {
		for _, cond := range node.Status.Conditions {
			if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
				nodeSummary.Ready++
				break
			}
		}
	}

	// Pods (all namespaces)
	pods, err := k8s.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "PODS_ERROR", "failed to list pods: "+err.Error())
		return
	}

	podSummary := PodSummary{Total: len(pods.Items)}
	for _, pod := range pods.Items {
		switch pod.Status.Phase {
		case corev1.PodRunning:
			podSummary.Running++
		case corev1.PodPending:
			podSummary.Pending++
		case corev1.PodFailed:
			podSummary.Failed++
		}
	}

	resp := ClusterHealthResponse{
		KubernetesVersion: version.GitVersion,
		Platform:          version.Platform,
		Nodes:             nodeSummary,
		Pods:              podSummary,
	}

	respondJSON(w, http.StatusOK, resp)
}
