package api

import (
	"context"
	"net/http"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/noovastack/traefik-manager/internal/provider"
)

type ClusterHealthHandler struct {
	manager provider.Manager
}

func NewClusterHealthHandler(manager provider.Manager) *ClusterHealthHandler {
	return &ClusterHealthHandler{manager: manager}
}

type clusterHealthResponse struct {
	KubernetesVersion string     `json:"kubernetesVersion"`
	Platform          string     `json:"platform"`
	Nodes             nodeHealth `json:"nodes"`
	Pods              podHealth  `json:"pods"`
}

type nodeHealth struct {
	Ready int `json:"ready"`
	Total int `json:"total"`
}

type podHealth struct {
	Total   int `json:"total"`
	Running int `json:"running"`
	Pending int `json:"pending"`
	Failed  int `json:"failed"`
}

func (h *ClusterHealthHandler) Get(w http.ResponseWriter, r *http.Request) {
	k8s := h.manager.GetK8s(r)
	if k8s == nil {
		respondError(w, http.StatusServiceUnavailable, "NO_CLUSTER", "no cluster connected")
		return
	}

	ctx := context.Background()
	resp := clusterHealthResponse{}

	// Kubernetes version + platform
	version, err := k8s.Discovery().ServerVersion()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "VERSION_ERROR", "failed to get server version: "+err.Error())
		return
	}
	resp.KubernetesVersion = version.GitVersion
	resp.Platform = version.Platform

	// Node health
	nodes, err := k8s.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "NODES_ERROR", "failed to list nodes: "+err.Error())
		return
	}
	resp.Nodes.Total = len(nodes.Items)
	for _, node := range nodes.Items {
		for _, cond := range node.Status.Conditions {
			if cond.Type == corev1.NodeReady && cond.Status == corev1.ConditionTrue {
				resp.Nodes.Ready++
				break
			}
		}
	}

	// Pod health (all namespaces)
	pods, err := k8s.CoreV1().Pods("").List(ctx, metav1.ListOptions{})
	if err != nil {
		respondError(w, http.StatusInternalServerError, "PODS_ERROR", "failed to list pods: "+err.Error())
		return
	}
	resp.Pods.Total = len(pods.Items)
	for _, pod := range pods.Items {
		switch pod.Status.Phase {
		case corev1.PodRunning:
			resp.Pods.Running++
		case corev1.PodPending:
			resp.Pods.Pending++
		case corev1.PodFailed:
			resp.Pods.Failed++
		}
	}

	respondJSON(w, http.StatusOK, resp)
}
