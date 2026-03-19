package k8s

import (
	"log"
	"net/http"
	"sync"

	"github.com/noovastack/traefik-manager/internal/provider"
	"k8s.io/client-go/kubernetes"
)

// DefaultClusterName is the identifier for the local cluster the pod was deployed into.
const DefaultClusterName = "local"

type ManagerImpl struct {
	mu      sync.RWMutex
	clients map[string]*Client // maps cluster name -> *k8s.Client implementation

	// Local provider used when no header is present
	local *Client
}

func NewManager(localClient *Client) *ManagerImpl {
	m := &ManagerImpl{
		clients: make(map[string]*Client),
		local:   localClient,
	}
	
	// Register the local cluster by default
	m.clients[DefaultClusterName] = localClient
	return m
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

// RemoveCluster deletes a cluster's connection pool by name.
func (m *ManagerImpl) RemoveCluster(id int) {
	// Need to find the cluster by ID from the DB in a real scenario,
	// but for now the handler uses the DB ID to delete. 
	// We'll expose a RemoveClusterByName for simplicity in memory manipulation
}

func (m *ManagerImpl) RemoveClusterByName(name string) {
	m.mu.Lock()
	delete(m.clients, name)
	m.mu.Unlock()
	log.Printf("Removed remote cluster connection: %s", name)
}

// Get implements provider.Manager. It inspects the request header.
func (m *ManagerImpl) Get(r *http.Request) provider.Provider {
	ctxName := r.Header.Get("X-Cluster-Context")
	if ctxName == "" || ctxName == DefaultClusterName {
		return m.local
	}

	m.mu.RLock()
	client, exists := m.clients[ctxName]
	m.mu.RUnlock()

	if !exists {
		// Fallback to local if requested cluster isn't loaded (e.g., deleted or error)
		log.Printf("Warning: Requested cluster context '%s' not found, falling back to local", ctxName)
		return m.local
	}

	return client
}

// GetK8s implements provider.Manager for handlers that need raw K8s access.
func (m *ManagerImpl) GetK8s(r *http.Request) kubernetes.Interface {
	ctxName := r.Header.Get("X-Cluster-Context")
	
	m.mu.RLock()
	client, exists := m.clients[ctxName]
	m.mu.RUnlock()

	if !exists || ctxName == "" {
		return m.local.K8s
	}
	
	return client.K8s
}
