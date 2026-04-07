package api

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"golang.org/x/time/rate"

	"github.com/noovastack/pre-rup-traefik-manager/internal/provider"
)

// NewRouter builds and returns the application's chi router.
func NewRouter(manager provider.Manager) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(securityHeadersMiddleware)
	// AllowedOrigins is intentionally open — Traefik Manager is a self-hosted
	// internal tool. Restrict this if you expose the API to untrusted networks.
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type", "X-Cluster-Context"},
	}))

	// Derive JWT secret: TM_JWT_SECRET env var, or fall back to TM_ENCRYPTION_KEY.
	// TM_ENCRYPTION_KEY may be a 64-char hex string (preferred) or a 32-char raw string.
	jwtSecret := []byte(os.Getenv("TM_JWT_SECRET"))
	if len(jwtSecret) == 0 {
		if encKey := os.Getenv("TM_ENCRYPTION_KEY"); encKey != "" {
			if len(encKey) == 64 {
				if decoded, err := hex.DecodeString(encKey); err == nil && len(decoded) == 32 {
					jwtSecret = decoded
				}
			} else if len(encKey) >= 32 {
				jwtSecret = []byte(encKey[:32])
			}
		}
	}
	if len(jwtSecret) == 0 {
		// No secret configured — refuse to start rather than use a known default
		// that anyone reading the source code could use to forge tokens.
		panic("FATAL: set TM_JWT_SECRET (or TM_ENCRYPTION_KEY) before starting traefik-manager")
	}

	// Process-level liveness probe — no cluster required
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	loginRL := newLoginRateLimiter()

	r.Route("/api/v1", func(r chi.Router) {
		// Public — no auth; rate-limited to prevent brute-force
		r.With(loginRL.Middleware()).Post("/auth/login", NewAuthHandler(jwtSecret).Login)

		// Readiness probe — checks K8s connectivity
		r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
			k8sClient := manager.GetK8s(r)
			if k8sClient == nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				return
			}
			if _, err := k8sClient.Discovery().ServerVersion(); err != nil {
				w.WriteHeader(http.StatusServiceUnavailable)
				return
			}
			w.WriteHeader(http.StatusOK)
		})

		// All other routes require a valid JWT
		r.Group(func(r chi.Router) {
			r.Use(AuthMiddleware(jwtSecret))

			// Profile — self-service for any authenticated user
			ph := NewProfileHandler()
			r.Route("/profile", func(r chi.Router) {
				r.Get("/", ph.GetProfile)
				r.Put("/", ph.UpdateProfile)
				r.Put("/password", ph.ChangePassword)
				r.Put("/setup", ph.Setup)
			})

			// User management — admin only
			uh := NewUserHandler()
			r.Route("/users", func(r chi.Router) {
				r.Use(AdminOnlyMiddleware)
				r.Get("/", uh.ListUsers)
				r.Post("/", uh.CreateUser)
				r.Delete("/{id}", uh.DeleteUser)
				r.Put("/{id}/role", uh.UpdateUserRole)
			})

			// Cluster management — no active cluster required
			r.Mount("/clusters", NewClusterHandler(manager).Routes())

			// All resource routes require an active cluster
			r.Group(func(r chi.Router) {
				r.Use(clusterRequiredMiddleware(manager))
				r.Use(ViewerReadonlyMiddleware)

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
		})
	})

	return r
}

// clusterRequiredMiddleware returns 503 when the requested cluster context is not connected.
func clusterRequiredMiddleware(manager provider.Manager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if manager.Get(r) == nil {
				ctx := r.Header.Get("X-Cluster-Context")
				if ctx == "" {
					ctx = "local"
				}
				respondError(w, http.StatusServiceUnavailable, "NO_CLUSTER",
					fmt.Sprintf("cluster %q is not connected; add it via the cluster manager", ctx))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
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

// internalError logs the full error server-side and returns a generic 500 to the client.
// Never expose err.Error() to clients — it can leak K8s internals, DB schema, etc.
func internalError(w http.ResponseWriter, err error, code string) {
	log.Printf("[ERR] %s: %v", code, err)
	respondError(w, http.StatusInternalServerError, code, "an internal error occurred")
}

// securityHeadersMiddleware adds standard security response headers.
func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		// HSTS: enforce HTTPS for 1 year (only effective when served over TLS)
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		// CSP: restrict resource loading to same origin; adjust if you embed external fonts/CDNs
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'")
		w.Header().Set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		next.ServeHTTP(w, r)
	})
}

// ---- login rate limiter ----------------------------------------------------

// loginRateLimiter allows 5 login attempts per minute per IP, with a burst of 5.
// Limiters are evicted after 10 minutes of inactivity.
type loginRateLimiter struct {
	mu      sync.Mutex
	entries map[string]*rateLimitEntry
}

type rateLimitEntry struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func newLoginRateLimiter() *loginRateLimiter {
	rl := &loginRateLimiter{entries: make(map[string]*rateLimitEntry)}
	go rl.cleanup()
	return rl
}

func (rl *loginRateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	e, ok := rl.entries[ip]
	if !ok {
		e = &rateLimitEntry{limiter: rate.NewLimiter(rate.Every(time.Minute/5), 5)}
		rl.entries[ip] = e
	}
	e.lastSeen = time.Now()
	ok = e.limiter.Allow()
	rl.mu.Unlock()
	return ok
}

func (rl *loginRateLimiter) cleanup() {
	for range time.Tick(5 * time.Minute) {
		rl.mu.Lock()
		for ip, e := range rl.entries {
			if time.Since(e.lastSeen) > 10*time.Minute {
				delete(rl.entries, ip)
			}
		}
		rl.mu.Unlock()
	}
}

func (rl *loginRateLimiter) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip, _, err := net.SplitHostPort(r.RemoteAddr)
			if err != nil {
				ip = r.RemoteAddr
			}
			if !rl.allow(ip) {
				respondError(w, http.StatusTooManyRequests, "RATE_LIMITED", "too many login attempts; try again later")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
