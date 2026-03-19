package api

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/noovastack/traefik-manager/internal/provider"
)

// NewRouter builds and returns the application's chi router.
func NewRouter(manager provider.Manager) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	// AllowedOrigins is intentionally open — Traefik Manager is a self-hosted
	// internal tool. Restrict this if you expose the API to untrusted networks.
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Content-Type", "X-Cluster-Context"},
	}))

	// Process-level liveness probe — no cluster required
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Public routes
		r.Mount("/clusters", NewClusterHandler(manager).Routes())

		// Cluster-level endpoints
		r.Get("/capabilities", NewCapabilitiesHandler(manager).Get)
		r.Get("/cluster/health", NewClusterHealthHandler(manager).Get)

		r.Mount("/namespaces", NewNamespaceHandler(manager).Routes())
		r.Mount("/gatewayclasses", NewGatewayClassHandler(manager).Routes())
		
		// Protected routes inside namespace contexts
		r.Route("/namespaces/{namespace}", func(r chi.Router) {
			r.Mount("/services", NewServiceHandler(manager).Routes())
			r.Mount("/ingressroutes", NewIngressRouteHandler(manager).Routes())
			r.Mount("/middlewares", NewMiddlewareHandler(manager).Routes())
			r.Mount("/middlewaretcps", NewMiddlewareTCPHandler(manager).Routes())
			r.Mount("/tlsoptions", NewTLSHandler(manager).Routes())
			r.Mount("/tlsstores", NewTLSStoreHandler(manager).Routes())

			// TCP & UDP Routes
			tcpudp := NewTCPUDPHandler(manager)
			r.Mount("/ingressroutetcps", tcpudp.RoutesTCP())
			r.Mount("/ingressrouteudps", tcpudp.RoutesUDP())

			// Gateway API
			r.Mount("/gateways", NewGatewayHandler(manager).Routes())
			r.Mount("/httproutes", NewHTTPRouteHandler(manager).Routes())

			// TraefikServices (Canary, Mirroring)
			r.Mount("/traefikservices", NewTraefikServiceHandler(manager).Routes())

			// ServersTransports (Upstream TLS/Auth)
			r.Mount("/serverstransports", NewServersTransportHandler(manager).Routes())
			r.Mount("/serverstransporttcps", NewServersTransportTCPHandler(manager).Routes())
			
			// Observability (Tracing & Metrics Static ConfigMaps)
			r.Mount("/observability", NewObservabilityHandler(manager).Routes())

			// WASM Plugins
			r.Mount("/plugins", NewPluginHandler(manager).Routes())

			// Prometheus Metrics scraping (Dynamically pulls K8s interface from Manager)
			r.Mount("/metrics", NewMetricsHandler(manager).Routes())
		})
	})

	return r
}

// ---- shared response helpers -----------------------------------------------

type errorEnvelope struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func respondJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload) //nolint:errcheck
}

func respondError(w http.ResponseWriter, status int, code, msg string) {
	respondJSON(w, status, errorEnvelope{Error: errorBody{Code: code, Message: msg}})
}

func errorf(format string, args ...any) error {
	return fmt.Errorf(format, args...)
}
