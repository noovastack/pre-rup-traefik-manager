package provider

import (
	"context"

	traefikalphav1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

// ServiceInfo represents a Kubernetes/Swarm service with its exposed ports.
type ServiceInfo struct {
	Name  string  `json:"name"`
	Ports []int32 `json:"ports"`
}

// Provider abstracts the persistent storage layer for Traefik configurations.
// While originally built for Kubernetes CRDs, this interface enables 
// Docker Swarm, ECS, and other environments to be supported by implementing
// these CRUD operations using labels, tags, or alternative configuration stores.
type Provider interface {
	// ── Namespaces ─────────────────────────────────────────────────────────────
	GetNamespaces(ctx context.Context) ([]string, error)

	// ── Services ───────────────────────────────────────────────────────────────
	// In non-K8s environments, this might return swarm services or ECS tasks.
	GetServices(ctx context.Context, namespace string) ([]ServiceInfo, error)
	GetEndpoints(ctx context.Context, namespace, service string) ([]string, error)

	// ── TLS Options ────────────────────────────────────────────────────────────
	GetTLSOptions(namespace string) ([]traefikalphav1.TLSOption, error)
	GetTLSOption(namespace, name string) (*traefikalphav1.TLSOption, error)
	CreateTLSOption(namespace string, option *traefikalphav1.TLSOption) (*traefikalphav1.TLSOption, error)
	UpdateTLSOption(namespace, name string, option *traefikalphav1.TLSOption) (*traefikalphav1.TLSOption, error)
	DeleteTLSOption(namespace, name string) error

	// ── TLS Stores ─────────────────────────────────────────────────────────────
	GetTLSStores(namespace string) ([]traefikalphav1.TLSStore, error)
	GetTLSStore(namespace, name string) (*traefikalphav1.TLSStore, error)
	CreateTLSStore(namespace string, store *traefikalphav1.TLSStore) (*traefikalphav1.TLSStore, error)
	UpdateTLSStore(namespace, name string, store *traefikalphav1.TLSStore) (*traefikalphav1.TLSStore, error)
	DeleteTLSStore(namespace, name string) error

	// ── IngressRoute ───────────────────────────────────────────────────────────
	GetIngressRoutes(namespace string) ([]traefikalphav1.IngressRoute, error)
	GetIngressRoute(namespace, name string) (*traefikalphav1.IngressRoute, error)
	CreateIngressRoute(namespace string, route *traefikalphav1.IngressRoute) (*traefikalphav1.IngressRoute, error)
	UpdateIngressRoute(namespace, name string, route *traefikalphav1.IngressRoute) (*traefikalphav1.IngressRoute, error)
	DeleteIngressRoute(namespace, name string) error

	// ── IngressRouteTCP ────────────────────────────────────────────────────────
	GetIngressRoutesTCP(namespace string) ([]traefikalphav1.IngressRouteTCP, error)
	GetIngressRouteTCP(namespace, name string) (*traefikalphav1.IngressRouteTCP, error)
	CreateIngressRouteTCP(namespace string, route *traefikalphav1.IngressRouteTCP) (*traefikalphav1.IngressRouteTCP, error)
	UpdateIngressRouteTCP(namespace, name string, route *traefikalphav1.IngressRouteTCP) (*traefikalphav1.IngressRouteTCP, error)
	DeleteIngressRouteTCP(namespace, name string) error

	// ── IngressRouteUDP ────────────────────────────────────────────────────────
	GetIngressRoutesUDP(namespace string) ([]traefikalphav1.IngressRouteUDP, error)
	GetIngressRouteUDP(namespace, name string) (*traefikalphav1.IngressRouteUDP, error)
	CreateIngressRouteUDP(namespace string, route *traefikalphav1.IngressRouteUDP) (*traefikalphav1.IngressRouteUDP, error)
	UpdateIngressRouteUDP(namespace, name string, route *traefikalphav1.IngressRouteUDP) (*traefikalphav1.IngressRouteUDP, error)
	DeleteIngressRouteUDP(namespace, name string) error

	// ── Middlewares ────────────────────────────────────────────────────────────
	GetMiddlewares(namespace string) ([]traefikalphav1.Middleware, error)
	GetMiddleware(namespace, name string) (*traefikalphav1.Middleware, error)
	CreateMiddleware(namespace string, route *traefikalphav1.Middleware) (*traefikalphav1.Middleware, error)
	UpdateMiddleware(namespace, name string, route *traefikalphav1.Middleware) (*traefikalphav1.Middleware, error)
	DeleteMiddleware(namespace, name string) error

	// ── MiddlewareTCP ──────────────────────────────────────────────────────────
	GetMiddlewaresTCP(namespace string) ([]traefikalphav1.MiddlewareTCP, error)
	GetMiddlewareTCP(namespace, name string) (*traefikalphav1.MiddlewareTCP, error)
	CreateMiddlewareTCP(namespace string, obj *traefikalphav1.MiddlewareTCP) (*traefikalphav1.MiddlewareTCP, error)
	UpdateMiddlewareTCP(namespace, name string, obj *traefikalphav1.MiddlewareTCP) (*traefikalphav1.MiddlewareTCP, error)
	DeleteMiddlewareTCP(namespace, name string) error

	// ── TraefikService ─────────────────────────────────────────────────────────
	GetTraefikServices(namespace string) ([]traefikalphav1.TraefikService, error)
	GetTraefikService(namespace, name string) (*traefikalphav1.TraefikService, error)
	CreateTraefikService(namespace string, svc *traefikalphav1.TraefikService) (*traefikalphav1.TraefikService, error)
	UpdateTraefikService(namespace, name string, svc *traefikalphav1.TraefikService) (*traefikalphav1.TraefikService, error)
	DeleteTraefikService(namespace, name string) error

	// ── ServersTransports (Standard & TCP) ─────────────────────────────────────
	GetServersTransports(namespace string) ([]traefikalphav1.ServersTransport, error)
	GetServersTransport(namespace, name string) (*traefikalphav1.ServersTransport, error)
	CreateServersTransport(namespace string, obj *traefikalphav1.ServersTransport) (*traefikalphav1.ServersTransport, error)
	UpdateServersTransport(namespace, name string, obj *traefikalphav1.ServersTransport) (*traefikalphav1.ServersTransport, error)
	DeleteServersTransport(namespace, name string) error

	GetServersTransportsTCP(namespace string) ([]traefikalphav1.ServersTransportTCP, error)
	GetServersTransportTCP(namespace, name string) (*traefikalphav1.ServersTransportTCP, error)
	CreateServersTransportTCP(namespace string, obj *traefikalphav1.ServersTransportTCP) (*traefikalphav1.ServersTransportTCP, error)
	UpdateServersTransportTCP(namespace, name string, obj *traefikalphav1.ServersTransportTCP) (*traefikalphav1.ServersTransportTCP, error)
	DeleteServersTransportTCP(namespace, name string) error

	// ── Gateway API (GatewayClass) ─────────────────────────────────────────────
	GetGatewayClasses() ([]gatewayv1.GatewayClass, error)
	GetGatewayClass(name string) (*gatewayv1.GatewayClass, error)
	CreateGatewayClass(obj *gatewayv1.GatewayClass) (*gatewayv1.GatewayClass, error)
	UpdateGatewayClass(name string, obj *gatewayv1.GatewayClass) (*gatewayv1.GatewayClass, error)
	DeleteGatewayClass(name string) error

	// ── Gateway API (Gateway) ──────────────────────────────────────────────────
	GetGateways(namespace string) ([]gatewayv1.Gateway, error)
	GetGateway(namespace, name string) (*gatewayv1.Gateway, error)
	CreateGateway(namespace string, obj *gatewayv1.Gateway) (*gatewayv1.Gateway, error)
	UpdateGateway(namespace, name string, obj *gatewayv1.Gateway) (*gatewayv1.Gateway, error)
	DeleteGateway(namespace, name string) error

	// ── Gateway API (HTTPRoute) ────────────────────────────────────────────────
	GetHTTPRoutes(namespace string) ([]gatewayv1.HTTPRoute, error)
	GetHTTPRoute(namespace, name string) (*gatewayv1.HTTPRoute, error)
	CreateHTTPRoute(namespace string, obj *gatewayv1.HTTPRoute) (*gatewayv1.HTTPRoute, error)
	UpdateHTTPRoute(namespace, name string, obj *gatewayv1.HTTPRoute) (*gatewayv1.HTTPRoute, error)
	DeleteHTTPRoute(namespace, name string) error

	// ── Observability ──────────────────────────────────────────────────────────
	GetTelemetryConfig(ctx context.Context, namespace, configMapName string) (map[string]interface{}, error)
	UpdateTelemetryConfig(ctx context.Context, namespace, configMapName string, data map[string]interface{}) error

	// ── WebAssembly Plugins ────────────────────────────────────────────────────
	GetPluginConfig(ctx context.Context, namespace, configMapName string) (map[string]interface{}, error)
	UpdatePluginConfig(ctx context.Context, namespace, configMapName string, data map[string]interface{}) error
}
