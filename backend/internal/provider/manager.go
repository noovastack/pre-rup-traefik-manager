package provider

import (
	"net/http"
	"k8s.io/client-go/kubernetes"
)

// Manager handles routing requests to the appropriate cluster connection
// based on the X-Cluster-Context HTTP header.
type Manager interface {
	// Get returns the Traefik Provider implementation for the requested cluster.
	Get(r *http.Request) Provider

	// GetK8s returns the raw Kubernetes client for the requested cluster, 
	// or nil if the active provider is not Kubernetes (e.g. Swarm).
	GetK8s(r *http.Request) kubernetes.Interface

	// AddCluster adds a new remote Kubernetes cluster to the active connection pool.
	AddCluster(id int, name, serverURL, token, caCert string) error

	// RemoveCluster deletes a remote cluster from the active connection pool.
	RemoveCluster(id int)
}
