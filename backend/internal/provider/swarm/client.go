package swarm

import (
	"context"
	"errors"

	"github.com/noovastack/pre-rup-traefik-manager/internal/provider"
	traefikalphav1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
)

// Client is a stub for the Docker Swarm provider.
// This proves the architecture works and paves the way for Phase 11.
type Client struct{}

func NewClient() *Client {
	return &Client{}
}

// ── Namespaces ──────────────────────────────────────────────────────────────

func (c *Client) GetNamespaces(ctx context.Context) ([]string, error) {
	return []string{"swarm-default"}, nil
}

// ── Services ────────────────────────────────────────────────────────────────

func (c *Client) GetServices(ctx context.Context, namespace string) ([]provider.ServiceInfo, error) {
	return []provider.ServiceInfo{
		{Name: "swarm-service-a", Ports: []int32{}},
		{Name: "swarm-service-b", Ports: []int32{}},
	}, nil
}

func (c *Client) GetEndpoints(ctx context.Context, namespace, service string) ([]string, error) {
	return []string{"swarm-task-1", "swarm-task-2"}, nil
}

// ── Unsupported CRDs (Stub implementations) ─────────────────────────────────
var errNotImplemented = errors.New("not implemented for swarm provider yet")

func (c *Client) GetTLSOptions(ns string) ([]traefikalphav1.TLSOption, error) { return nil, errNotImplemented }
func (c *Client) GetTLSOption(ns, name string) (*traefikalphav1.TLSOption, error) { return nil, errNotImplemented }
func (c *Client) CreateTLSOption(ns string, obj *traefikalphav1.TLSOption) (*traefikalphav1.TLSOption, error) { return nil, errNotImplemented }
func (c *Client) UpdateTLSOption(ns, name string, obj *traefikalphav1.TLSOption) (*traefikalphav1.TLSOption, error) { return nil, errNotImplemented }
func (c *Client) DeleteTLSOption(ns, name string) error { return errNotImplemented }

func (c *Client) GetTLSStores(ns string) ([]traefikalphav1.TLSStore, error) { return nil, errNotImplemented }
func (c *Client) GetTLSStore(ns, name string) (*traefikalphav1.TLSStore, error) { return nil, errNotImplemented }
func (c *Client) CreateTLSStore(ns string, obj *traefikalphav1.TLSStore) (*traefikalphav1.TLSStore, error) { return nil, errNotImplemented }
func (c *Client) UpdateTLSStore(ns, name string, obj *traefikalphav1.TLSStore) (*traefikalphav1.TLSStore, error) { return nil, errNotImplemented }
func (c *Client) DeleteTLSStore(ns, name string) error { return errNotImplemented }

func (c *Client) GetIngressRoutes(ns string) ([]traefikalphav1.IngressRoute, error) { return nil, errNotImplemented }
func (c *Client) GetIngressRoute(ns, name string) (*traefikalphav1.IngressRoute, error) { return nil, errNotImplemented }
func (c *Client) CreateIngressRoute(ns string, obj *traefikalphav1.IngressRoute) (*traefikalphav1.IngressRoute, error) { return nil, errNotImplemented }
func (c *Client) UpdateIngressRoute(ns, name string, obj *traefikalphav1.IngressRoute) (*traefikalphav1.IngressRoute, error) { return nil, errNotImplemented }
func (c *Client) DeleteIngressRoute(ns, name string) error { return errNotImplemented }

func (c *Client) GetIngressRoutesTCP(ns string) ([]traefikalphav1.IngressRouteTCP, error) { return nil, errNotImplemented }
func (c *Client) GetIngressRouteTCP(ns, name string) (*traefikalphav1.IngressRouteTCP, error) { return nil, errNotImplemented }
func (c *Client) CreateIngressRouteTCP(ns string, obj *traefikalphav1.IngressRouteTCP) (*traefikalphav1.IngressRouteTCP, error) { return nil, errNotImplemented }
func (c *Client) UpdateIngressRouteTCP(ns, name string, obj *traefikalphav1.IngressRouteTCP) (*traefikalphav1.IngressRouteTCP, error) { return nil, errNotImplemented }
func (c *Client) DeleteIngressRouteTCP(ns, name string) error { return errNotImplemented }

func (c *Client) GetIngressRoutesUDP(ns string) ([]traefikalphav1.IngressRouteUDP, error) { return nil, errNotImplemented }
func (c *Client) GetIngressRouteUDP(ns, name string) (*traefikalphav1.IngressRouteUDP, error) { return nil, errNotImplemented }
func (c *Client) CreateIngressRouteUDP(ns string, obj *traefikalphav1.IngressRouteUDP) (*traefikalphav1.IngressRouteUDP, error) { return nil, errNotImplemented }
func (c *Client) UpdateIngressRouteUDP(ns, name string, obj *traefikalphav1.IngressRouteUDP) (*traefikalphav1.IngressRouteUDP, error) { return nil, errNotImplemented }
func (c *Client) DeleteIngressRouteUDP(ns, name string) error { return errNotImplemented }

func (c *Client) GetMiddlewares(ns string) ([]traefikalphav1.Middleware, error) { return nil, errNotImplemented }
func (c *Client) GetMiddleware(ns, name string) (*traefikalphav1.Middleware, error) { return nil, errNotImplemented }
func (c *Client) CreateMiddleware(ns string, obj *traefikalphav1.Middleware) (*traefikalphav1.Middleware, error) { return nil, errNotImplemented }
func (c *Client) UpdateMiddleware(ns, name string, obj *traefikalphav1.Middleware) (*traefikalphav1.Middleware, error) { return nil, errNotImplemented }
func (c *Client) DeleteMiddleware(ns, name string) error { return errNotImplemented }

func (c *Client) GetMiddlewaresTCP(ns string) ([]traefikalphav1.MiddlewareTCP, error) { return nil, errNotImplemented }
func (c *Client) GetMiddlewareTCP(ns, name string) (*traefikalphav1.MiddlewareTCP, error) { return nil, errNotImplemented }
func (c *Client) CreateMiddlewareTCP(ns string, obj *traefikalphav1.MiddlewareTCP) (*traefikalphav1.MiddlewareTCP, error) { return nil, errNotImplemented }
func (c *Client) UpdateMiddlewareTCP(ns, name string, obj *traefikalphav1.MiddlewareTCP) (*traefikalphav1.MiddlewareTCP, error) { return nil, errNotImplemented }
func (c *Client) DeleteMiddlewareTCP(ns, name string) error { return errNotImplemented }

func (c *Client) GetTraefikServices(ns string) ([]traefikalphav1.TraefikService, error) { return nil, errNotImplemented }
func (c *Client) GetTraefikService(ns, name string) (*traefikalphav1.TraefikService, error) { return nil, errNotImplemented }
func (c *Client) CreateTraefikService(ns string, obj *traefikalphav1.TraefikService) (*traefikalphav1.TraefikService, error) { return nil, errNotImplemented }
func (c *Client) UpdateTraefikService(ns, name string, obj *traefikalphav1.TraefikService) (*traefikalphav1.TraefikService, error) { return nil, errNotImplemented }
func (c *Client) DeleteTraefikService(ns, name string) error { return errNotImplemented }

func (c *Client) GetServersTransports(ns string) ([]traefikalphav1.ServersTransport, error) { return nil, errNotImplemented }
func (c *Client) GetServersTransport(ns, name string) (*traefikalphav1.ServersTransport, error) { return nil, errNotImplemented }
func (c *Client) CreateServersTransport(ns string, obj *traefikalphav1.ServersTransport) (*traefikalphav1.ServersTransport, error) { return nil, errNotImplemented }
func (c *Client) UpdateServersTransport(ns, name string, obj *traefikalphav1.ServersTransport) (*traefikalphav1.ServersTransport, error) { return nil, errNotImplemented }
func (c *Client) DeleteServersTransport(ns, name string) error { return errNotImplemented }

func (c *Client) GetServersTransportsTCP(ns string) ([]traefikalphav1.ServersTransportTCP, error) { return nil, errNotImplemented }
func (c *Client) GetServersTransportTCP(ns, name string) (*traefikalphav1.ServersTransportTCP, error) { return nil, errNotImplemented }
func (c *Client) CreateServersTransportTCP(ns string, obj *traefikalphav1.ServersTransportTCP) (*traefikalphav1.ServersTransportTCP, error) { return nil, errNotImplemented }
func (c *Client) UpdateServersTransportTCP(ns, name string, obj *traefikalphav1.ServersTransportTCP) (*traefikalphav1.ServersTransportTCP, error) { return nil, errNotImplemented }
func (c *Client) DeleteServersTransportTCP(ns, name string) error { return errNotImplemented }

func (c *Client) GetGatewayClasses() ([]gatewayv1.GatewayClass, error) { return nil, errNotImplemented }
func (c *Client) GetGatewayClass(name string) (*gatewayv1.GatewayClass, error) { return nil, errNotImplemented }
func (c *Client) CreateGatewayClass(obj *gatewayv1.GatewayClass) (*gatewayv1.GatewayClass, error) { return nil, errNotImplemented }
func (c *Client) UpdateGatewayClass(name string, obj *gatewayv1.GatewayClass) (*gatewayv1.GatewayClass, error) { return nil, errNotImplemented }
func (c *Client) DeleteGatewayClass(name string) error { return errNotImplemented }

func (c *Client) GetGateways(ns string) ([]gatewayv1.Gateway, error) { return nil, errNotImplemented }
func (c *Client) GetGateway(ns, name string) (*gatewayv1.Gateway, error) { return nil, errNotImplemented }
func (c *Client) CreateGateway(ns string, obj *gatewayv1.Gateway) (*gatewayv1.Gateway, error) { return nil, errNotImplemented }
func (c *Client) UpdateGateway(ns, name string, obj *gatewayv1.Gateway) (*gatewayv1.Gateway, error) { return nil, errNotImplemented }
func (c *Client) DeleteGateway(ns, name string) error { return errNotImplemented }

func (c *Client) GetHTTPRoutes(ns string) ([]gatewayv1.HTTPRoute, error) { return nil, errNotImplemented }
func (c *Client) GetHTTPRoute(ns, name string) (*gatewayv1.HTTPRoute, error) { return nil, errNotImplemented }
func (c *Client) CreateHTTPRoute(ns string, obj *gatewayv1.HTTPRoute) (*gatewayv1.HTTPRoute, error) { return nil, errNotImplemented }
func (c *Client) UpdateHTTPRoute(ns, name string, obj *gatewayv1.HTTPRoute) (*gatewayv1.HTTPRoute, error) { return nil, errNotImplemented }
func (c *Client) DeleteHTTPRoute(ns, name string) error { return errNotImplemented }

func (c *Client) GetTelemetryConfig(ctx context.Context, namespace, configMapName string) (map[string]interface{}, error) { return nil, errNotImplemented }
func (c *Client) UpdateTelemetryConfig(ctx context.Context, namespace, configMapName string, data map[string]interface{}) error { return errNotImplemented }

func (c *Client) GetPluginConfig(ctx context.Context, namespace, configMapName string) (map[string]interface{}, error) { return nil, errNotImplemented }
func (c *Client) UpdatePluginConfig(ctx context.Context, namespace, configMapName string, data map[string]interface{}) error { return errNotImplemented }
