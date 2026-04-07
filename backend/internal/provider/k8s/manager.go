package k8s

import (
	"log"
	"net/http"
	"sync"

	"github.com/noovastack/pre-rup-traefik-manager/internal/provider"
	"k8s.io/client-go/kubernetes"
)

const localClusterName = "local"

type ManagerImpl struct {
	mu      sync.RWMutex
	clients map[string]*Client // maps cluster name -> *k8s.Client implementation
}

func NewManager() *ManagerImpl {
	return &ManagerImpl{
		clients: make(map[string]*Client),
	}
}

// RegisterLocalClient registers a pre-built in-cluster client as "local".
// Called once at startup when running inside a Kubernetes pod.
func (m *ManagerImpl) RegisterLocalClient(client *Client) {
	m.mu.Lock()
	m.clients[localClusterName] = client
	m.mu.Unlock()
}

// AddCluster builds a client from a bearer token and registers it in the pool.
func (m *ManagerImpl) AddCluster(id int, name, serverURL, token, caCert string) error {
	client, err := NewClientFromToken(serverURL, token, caCert)
	if err != nil {
		return err
	}

	m.mu.Lock()
	m.clients[name] = client
	m.mu.Unlock()

	log.Printf("Successfully registered remote cluster connection: %s", name)
	return nil
}

func (m *ManagerImpl) RemoveClusterByName(name string) {
	m.mu.Lock()
	delete(m.clients, name)
	m.mu.Unlock()
	log.Printf("Removed remote cluster connection: %s", name)
}

// Get implements provider.Manager. Returns nil if the requested cluster is not connected.
func (m *ManagerImpl) Get(r *http.Request) provider.Provider {
	ctxName := r.Header.Get("X-Cluster-Context")
	if ctxName == "" {
		ctxName = localClusterName
	}

	m.mu.RLock()
	client, exists := m.clients[ctxName]
	m.mu.RUnlock()

	if !exists {
		return nil
	}

	return client
}

// GetK8s implements provider.Manager for handlers that need raw K8s access.
// Returns nil if the requested cluster is not connected.
func (m *ManagerImpl) GetK8s(r *http.Request) kubernetes.Interface {
	ctxName := r.Header.Get("X-Cluster-Context")
	if ctxName == "" {
		ctxName = localClusterName
	}

	m.mu.RLock()
	client, exists := m.clients[ctxName]
	m.mu.RUnlock()

	if !exists {
		return nil
	}

	return client.K8s
}
