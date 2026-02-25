package k8s

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	traefikalphav1 "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/traefikio/v1alpha1"
	traefikclient "github.com/traefik/traefik/v3/pkg/provider/kubernetes/crd/generated/clientset/versioned"

	gatewayv1 "sigs.k8s.io/gateway-api/apis/v1"
	gatewayclient "sigs.k8s.io/gateway-api/pkg/client/clientset/versioned"
)

type Client struct {
	K8s     kubernetes.Interface
	Traefik traefikclient.Interface
	Gateway gatewayclient.Interface
}

func NewClient(explicitKubeconfig string) (*Client, error) {
	config, err := rest.InClusterConfig()
	if err != nil {
		kubeconfig := explicitKubeconfig
		if kubeconfig == "" {
			kubeconfig = os.Getenv("KUBECONFIG")
		}
		if kubeconfig == "" {
			kubeconfig = os.ExpandEnv("$HOME/.kube/config")
		}
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			return nil, fmt.Errorf("failed to build kubeconfig: %w", err)
		}
	}

	k8sClient, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create k8s client: %w", err)
	}

	traefikClient, err := traefikclient.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create traefik client: %w", err)
	}

	gwClient, err := gatewayclient.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create gateway client: %w", err)
	}

	return &Client{
		K8s:     k8sClient,
		Traefik: traefikClient,
		Gateway: gwClient,
	}, nil
}

// ── Namespaces ──────────────────────────────────────────────────────────────

func (c *Client) GetNamespaces(ctx context.Context) ([]string, error) {
	nsList, err := c.K8s.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var names []string
	for _, ns := range nsList.Items {
		names = append(names, ns.Name)
	}
	return names, nil
}

// ── Services ────────────────────────────────────────────────────────────────

func (c *Client) GetServices(ctx context.Context, namespace string) ([]string, error) {
	svcList, err := c.K8s.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	var names []string
	for _, svc := range svcList.Items {
		names = append(names, svc.Name)
	}
	return names, nil
}

func (c *Client) GetEndpoints(ctx context.Context, namespace, service string) ([]string, error) {
	endpoints, err := c.K8s.CoreV1().Endpoints(namespace).Get(ctx, service, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	var pods []string
	for _, subset := range endpoints.Subsets {
		for _, addr := range subset.Addresses {
			if addr.TargetRef != nil && addr.TargetRef.Kind == "Pod" {
				pods = append(pods, addr.TargetRef.Name)
			} else {
				pods = append(pods, addr.IP)
			}
		}
	}
	return pods, nil
}

// ── TLS Options ─────────────────────────────────────────────────────────────

func (c *Client) GetTLSOptions(namespace string) ([]traefikalphav1.TLSOption, error) {
	tlsList, err := c.Traefik.TraefikV1alpha1().TLSOptions(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return tlsList.Items, nil
}

func (c *Client) GetTLSOption(namespace, name string) (*traefikalphav1.TLSOption, error) {
	return c.Traefik.TraefikV1alpha1().TLSOptions(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateTLSOption(namespace string, option *traefikalphav1.TLSOption) (*traefikalphav1.TLSOption, error) {
	return c.Traefik.TraefikV1alpha1().TLSOptions(namespace).Create(context.Background(), option, metav1.CreateOptions{})
}

func (c *Client) UpdateTLSOption(namespace, name string, option *traefikalphav1.TLSOption) (*traefikalphav1.TLSOption, error) {
	existing, err := c.GetTLSOption(namespace, name)
	if err != nil {
		return nil, err
	}
	option.ResourceVersion = existing.ResourceVersion
	return c.Traefik.TraefikV1alpha1().TLSOptions(namespace).Update(context.Background(), option, metav1.UpdateOptions{})
}

func (c *Client) DeleteTLSOption(namespace, name string) error {
	return c.Traefik.TraefikV1alpha1().TLSOptions(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── TLS Stores ──────────────────────────────────────────────────────────────

func (c *Client) GetTLSStores(namespace string) ([]traefikalphav1.TLSStore, error) {
	storeList, err := c.Traefik.TraefikV1alpha1().TLSStores(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return storeList.Items, nil
}

func (c *Client) GetTLSStore(namespace, name string) (*traefikalphav1.TLSStore, error) {
	return c.Traefik.TraefikV1alpha1().TLSStores(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateTLSStore(namespace string, store *traefikalphav1.TLSStore) (*traefikalphav1.TLSStore, error) {
	return c.Traefik.TraefikV1alpha1().TLSStores(namespace).Create(context.Background(), store, metav1.CreateOptions{})
}

func (c *Client) UpdateTLSStore(namespace, name string, store *traefikalphav1.TLSStore) (*traefikalphav1.TLSStore, error) {
	existing, err := c.GetTLSStore(namespace, name)
	if err != nil {
		return nil, err
	}
	store.ResourceVersion = existing.ResourceVersion
	return c.Traefik.TraefikV1alpha1().TLSStores(namespace).Update(context.Background(), store, metav1.UpdateOptions{})
}

func (c *Client) DeleteTLSStore(namespace, name string) error {
	return c.Traefik.TraefikV1alpha1().TLSStores(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── IngressRoute ────────────────────────────────────────────────────────────

func (c *Client) GetIngressRoutes(namespace string) ([]traefikalphav1.IngressRoute, error) {
	routeList, err := c.Traefik.TraefikV1alpha1().IngressRoutes(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return routeList.Items, nil
}

func (c *Client) GetIngressRoute(namespace, name string) (*traefikalphav1.IngressRoute, error) {
	return c.Traefik.TraefikV1alpha1().IngressRoutes(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateIngressRoute(namespace string, route *traefikalphav1.IngressRoute) (*traefikalphav1.IngressRoute, error) {
	return c.Traefik.TraefikV1alpha1().IngressRoutes(namespace).Create(context.Background(), route, metav1.CreateOptions{})
}

func (c *Client) UpdateIngressRoute(namespace, name string, route *traefikalphav1.IngressRoute) (*traefikalphav1.IngressRoute, error) {
	existing, err := c.GetIngressRoute(namespace, name)
	if err != nil {
		return nil, err
	}
	route.ResourceVersion = existing.ResourceVersion
	return c.Traefik.TraefikV1alpha1().IngressRoutes(namespace).Update(context.Background(), route, metav1.UpdateOptions{})
}

func (c *Client) DeleteIngressRoute(namespace, name string) error {
	return c.Traefik.TraefikV1alpha1().IngressRoutes(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── IngressRouteTCP ─────────────────────────────────────────────────────────

func (c *Client) GetIngressRoutesTCP(namespace string) ([]traefikalphav1.IngressRouteTCP, error) {
routeList, err := c.Traefik.TraefikV1alpha1().IngressRouteTCPs(namespace).List(context.Background(), metav1.ListOptions{})
if err != nil {
return nil, err
}
return routeList.Items, nil
}

func (c *Client) GetIngressRouteTCP(namespace, name string) (*traefikalphav1.IngressRouteTCP, error) {
return c.Traefik.TraefikV1alpha1().IngressRouteTCPs(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateIngressRouteTCP(namespace string, route *traefikalphav1.IngressRouteTCP) (*traefikalphav1.IngressRouteTCP, error) {
return c.Traefik.TraefikV1alpha1().IngressRouteTCPs(namespace).Create(context.Background(), route, metav1.CreateOptions{})
}

func (c *Client) UpdateIngressRouteTCP(namespace, name string, route *traefikalphav1.IngressRouteTCP) (*traefikalphav1.IngressRouteTCP, error) {
existing, err := c.GetIngressRouteTCP(namespace, name)
if err != nil {
return nil, err
}
route.ResourceVersion = existing.ResourceVersion
return c.Traefik.TraefikV1alpha1().IngressRouteTCPs(namespace).Update(context.Background(), route, metav1.UpdateOptions{})
}

func (c *Client) DeleteIngressRouteTCP(namespace, name string) error {
return c.Traefik.TraefikV1alpha1().IngressRouteTCPs(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── IngressRouteUDP ─────────────────────────────────────────────────────────

func (c *Client) GetIngressRoutesUDP(namespace string) ([]traefikalphav1.IngressRouteUDP, error) {
routeList, err := c.Traefik.TraefikV1alpha1().IngressRouteUDPs(namespace).List(context.Background(), metav1.ListOptions{})
if err != nil {
return nil, err
}
return routeList.Items, nil
}

func (c *Client) GetIngressRouteUDP(namespace, name string) (*traefikalphav1.IngressRouteUDP, error) {
return c.Traefik.TraefikV1alpha1().IngressRouteUDPs(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateIngressRouteUDP(namespace string, route *traefikalphav1.IngressRouteUDP) (*traefikalphav1.IngressRouteUDP, error) {
return c.Traefik.TraefikV1alpha1().IngressRouteUDPs(namespace).Create(context.Background(), route, metav1.CreateOptions{})
}

func (c *Client) UpdateIngressRouteUDP(namespace, name string, route *traefikalphav1.IngressRouteUDP) (*traefikalphav1.IngressRouteUDP, error) {
existing, err := c.GetIngressRouteUDP(namespace, name)
if err != nil {
return nil, err
}
route.ResourceVersion = existing.ResourceVersion
return c.Traefik.TraefikV1alpha1().IngressRouteUDPs(namespace).Update(context.Background(), route, metav1.UpdateOptions{})
}

func (c *Client) DeleteIngressRouteUDP(namespace, name string) error {
return c.Traefik.TraefikV1alpha1().IngressRouteUDPs(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── TraefikService ──────────────────────────────────────────────────────────

func (c *Client) GetTraefikServices(namespace string) ([]traefikalphav1.TraefikService, error) {
svcList, err := c.Traefik.TraefikV1alpha1().TraefikServices(namespace).List(context.Background(), metav1.ListOptions{})
if err != nil {
return nil, err
}
return svcList.Items, nil
}

func (c *Client) GetTraefikService(namespace, name string) (*traefikalphav1.TraefikService, error) {
return c.Traefik.TraefikV1alpha1().TraefikServices(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateTraefikService(namespace string, svc *traefikalphav1.TraefikService) (*traefikalphav1.TraefikService, error) {
return c.Traefik.TraefikV1alpha1().TraefikServices(namespace).Create(context.Background(), svc, metav1.CreateOptions{})
}

func (c *Client) UpdateTraefikService(namespace, name string, svc *traefikalphav1.TraefikService) (*traefikalphav1.TraefikService, error) {
existing, err := c.GetTraefikService(namespace, name)
if err != nil {
return nil, err
}
svc.ResourceVersion = existing.ResourceVersion
return c.Traefik.TraefikV1alpha1().TraefikServices(namespace).Update(context.Background(), svc, metav1.UpdateOptions{})
}

func (c *Client) DeleteTraefikService(namespace, name string) error {
return c.Traefik.TraefikV1alpha1().TraefikServices(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── ServersTransports (Standard & TCP) ──────────────────────────────────────

func (c *Client) GetServersTransports(namespace string) ([]traefikalphav1.ServersTransport, error) {
list, err := c.Traefik.TraefikV1alpha1().ServersTransports(namespace).List(context.Background(), metav1.ListOptions{})
if err != nil {
return nil, err
}
return list.Items, nil
}

func (c *Client) GetServersTransport(namespace, name string) (*traefikalphav1.ServersTransport, error) {
return c.Traefik.TraefikV1alpha1().ServersTransports(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateServersTransport(namespace string, obj *traefikalphav1.ServersTransport) (*traefikalphav1.ServersTransport, error) {
return c.Traefik.TraefikV1alpha1().ServersTransports(namespace).Create(context.Background(), obj, metav1.CreateOptions{})
}

func (c *Client) UpdateServersTransport(namespace, name string, obj *traefikalphav1.ServersTransport) (*traefikalphav1.ServersTransport, error) {
existing, err := c.GetServersTransport(namespace, name)
if err != nil {
return nil, err
}
obj.ResourceVersion = existing.ResourceVersion
return c.Traefik.TraefikV1alpha1().ServersTransports(namespace).Update(context.Background(), obj, metav1.UpdateOptions{})
}

func (c *Client) DeleteServersTransport(namespace, name string) error {
return c.Traefik.TraefikV1alpha1().ServersTransports(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

func (c *Client) GetServersTransportsTCP(namespace string) ([]traefikalphav1.ServersTransportTCP, error) {
list, err := c.Traefik.TraefikV1alpha1().ServersTransportTCPs(namespace).List(context.Background(), metav1.ListOptions{})
if err != nil {
return nil, err
}
return list.Items, nil
}

func (c *Client) GetServersTransportTCP(namespace, name string) (*traefikalphav1.ServersTransportTCP, error) {
return c.Traefik.TraefikV1alpha1().ServersTransportTCPs(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateServersTransportTCP(namespace string, obj *traefikalphav1.ServersTransportTCP) (*traefikalphav1.ServersTransportTCP, error) {
return c.Traefik.TraefikV1alpha1().ServersTransportTCPs(namespace).Create(context.Background(), obj, metav1.CreateOptions{})
}

func (c *Client) UpdateServersTransportTCP(namespace, name string, obj *traefikalphav1.ServersTransportTCP) (*traefikalphav1.ServersTransportTCP, error) {
existing, err := c.GetServersTransportTCP(namespace, name)
if err != nil {
return nil, err
}
obj.ResourceVersion = existing.ResourceVersion
return c.Traefik.TraefikV1alpha1().ServersTransportTCPs(namespace).Update(context.Background(), obj, metav1.UpdateOptions{})
}

func (c *Client) DeleteServersTransportTCP(namespace, name string) error {
	return c.Traefik.TraefikV1alpha1().ServersTransportTCPs(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── Middlewares ─────────────────────────────────────────────────────────────

func (c *Client) GetMiddlewares(namespace string) ([]traefikalphav1.Middleware, error) {
	list, err := c.Traefik.TraefikV1alpha1().Middlewares(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

func (c *Client) GetMiddleware(namespace, name string) (*traefikalphav1.Middleware, error) {
	return c.Traefik.TraefikV1alpha1().Middlewares(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateMiddleware(namespace string, obj *traefikalphav1.Middleware) (*traefikalphav1.Middleware, error) {
	return c.Traefik.TraefikV1alpha1().Middlewares(namespace).Create(context.Background(), obj, metav1.CreateOptions{})
}

func (c *Client) UpdateMiddleware(namespace, name string, obj *traefikalphav1.Middleware) (*traefikalphav1.Middleware, error) {
	existing, err := c.GetMiddleware(namespace, name)
	if err != nil {
		return nil, err
	}
	obj.ResourceVersion = existing.ResourceVersion
	return c.Traefik.TraefikV1alpha1().Middlewares(namespace).Update(context.Background(), obj, metav1.UpdateOptions{})
}

func (c *Client) DeleteMiddleware(namespace, name string) error {
	return c.Traefik.TraefikV1alpha1().Middlewares(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── MiddlewareTCP ───────────────────────────────────────────────────────────

func (c *Client) GetMiddlewaresTCP(namespace string) ([]traefikalphav1.MiddlewareTCP, error) {
list, err := c.Traefik.TraefikV1alpha1().MiddlewareTCPs(namespace).List(context.Background(), metav1.ListOptions{})
if err != nil {
return nil, err
}
return list.Items, nil
}

func (c *Client) GetMiddlewareTCP(namespace, name string) (*traefikalphav1.MiddlewareTCP, error) {
return c.Traefik.TraefikV1alpha1().MiddlewareTCPs(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateMiddlewareTCP(namespace string, obj *traefikalphav1.MiddlewareTCP) (*traefikalphav1.MiddlewareTCP, error) {
return c.Traefik.TraefikV1alpha1().MiddlewareTCPs(namespace).Create(context.Background(), obj, metav1.CreateOptions{})
}

func (c *Client) UpdateMiddlewareTCP(namespace, name string, obj *traefikalphav1.MiddlewareTCP) (*traefikalphav1.MiddlewareTCP, error) {
existing, err := c.GetMiddlewareTCP(namespace, name)
if err != nil {
return nil, err
}
obj.ResourceVersion = existing.ResourceVersion
return c.Traefik.TraefikV1alpha1().MiddlewareTCPs(namespace).Update(context.Background(), obj, metav1.UpdateOptions{})
}

func (c *Client) DeleteMiddlewareTCP(namespace, name string) error {
return c.Traefik.TraefikV1alpha1().MiddlewareTCPs(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── Gateway API (GatewayClass) ─────────────────────────────────────────────

func (c *Client) GetGatewayClasses() ([]gatewayv1.GatewayClass, error) {
	list, err := c.Gateway.GatewayV1().GatewayClasses().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

func (c *Client) GetGatewayClass(name string) (*gatewayv1.GatewayClass, error) {
	return c.Gateway.GatewayV1().GatewayClasses().Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateGatewayClass(obj *gatewayv1.GatewayClass) (*gatewayv1.GatewayClass, error) {
	return c.Gateway.GatewayV1().GatewayClasses().Create(context.Background(), obj, metav1.CreateOptions{})
}

func (c *Client) UpdateGatewayClass(name string, obj *gatewayv1.GatewayClass) (*gatewayv1.GatewayClass, error) {
	existing, err := c.GetGatewayClass(name)
	if err != nil {
		return nil, err
	}
	obj.ResourceVersion = existing.ResourceVersion
	return c.Gateway.GatewayV1().GatewayClasses().Update(context.Background(), obj, metav1.UpdateOptions{})
}

func (c *Client) DeleteGatewayClass(name string) error {
	return c.Gateway.GatewayV1().GatewayClasses().Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── Gateway API (Gateway) ──────────────────────────────────────────────────

func (c *Client) GetGateways(namespace string) ([]gatewayv1.Gateway, error) {
	list, err := c.Gateway.GatewayV1().Gateways(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

func (c *Client) GetGateway(namespace, name string) (*gatewayv1.Gateway, error) {
	return c.Gateway.GatewayV1().Gateways(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateGateway(namespace string, obj *gatewayv1.Gateway) (*gatewayv1.Gateway, error) {
	return c.Gateway.GatewayV1().Gateways(namespace).Create(context.Background(), obj, metav1.CreateOptions{})
}

func (c *Client) UpdateGateway(namespace, name string, obj *gatewayv1.Gateway) (*gatewayv1.Gateway, error) {
	existing, err := c.GetGateway(namespace, name)
	if err != nil {
		return nil, err
	}
	obj.ResourceVersion = existing.ResourceVersion
	return c.Gateway.GatewayV1().Gateways(namespace).Update(context.Background(), obj, metav1.UpdateOptions{})
}

func (c *Client) DeleteGateway(namespace, name string) error {
	return c.Gateway.GatewayV1().Gateways(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── Gateway API (HTTPRoute) ────────────────────────────────────────────────

func (c *Client) GetHTTPRoutes(namespace string) ([]gatewayv1.HTTPRoute, error) {
	list, err := c.Gateway.GatewayV1().HTTPRoutes(namespace).List(context.Background(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}
	return list.Items, nil
}

func (c *Client) GetHTTPRoute(namespace, name string) (*gatewayv1.HTTPRoute, error) {
	return c.Gateway.GatewayV1().HTTPRoutes(namespace).Get(context.Background(), name, metav1.GetOptions{})
}

func (c *Client) CreateHTTPRoute(namespace string, obj *gatewayv1.HTTPRoute) (*gatewayv1.HTTPRoute, error) {
	return c.Gateway.GatewayV1().HTTPRoutes(namespace).Create(context.Background(), obj, metav1.CreateOptions{})
}

func (c *Client) UpdateHTTPRoute(namespace, name string, obj *gatewayv1.HTTPRoute) (*gatewayv1.HTTPRoute, error) {
	existing, err := c.GetHTTPRoute(namespace, name)
	if err != nil {
		return nil, err
	}
	obj.ResourceVersion = existing.ResourceVersion
	return c.Gateway.GatewayV1().HTTPRoutes(namespace).Update(context.Background(), obj, metav1.UpdateOptions{})
}

func (c *Client) DeleteHTTPRoute(namespace, name string) error {
	return c.Gateway.GatewayV1().HTTPRoutes(namespace).Delete(context.Background(), name, metav1.DeleteOptions{})
}

// ── Observability ───────────────────────────────────────────────────────────

func (c *Client) GetTelemetryConfig(ctx context.Context, namespace, configMapName string) (map[string]interface{}, error) {
	cm, err := c.K8s.CoreV1().ConfigMaps(namespace).Get(ctx, configMapName, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return map[string]interface{}{}, nil
		}
		return nil, err
	}
	
	raw, ok := cm.Data["traefik.yml"]
	if !ok {
		return map[string]interface{}{}, nil
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &data); err != nil {
		return nil, fmt.Errorf("failed to parse tracking config map %s: %w", configMapName, err)
	}

	return data, nil
}

func (c *Client) UpdateTelemetryConfig(ctx context.Context, namespace, configMapName string, data map[string]interface{}) error {
	cm, err := c.K8s.CoreV1().ConfigMaps(namespace).Get(ctx, configMapName, metav1.GetOptions{})
	if err != nil {
		return err
	}

	raw, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode tracking config map: %w", err)
	}

	if cm.Data == nil {
		cm.Data = make(map[string]string)
	}
	cm.Data["traefik.yml"] = string(raw)

	_, err = c.K8s.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
	return err
}

// ── WebAssembly Plugins ─────────────────────────────────────────────────────

func (c *Client) GetPluginConfig(ctx context.Context, namespace, configMapName string) (map[string]interface{}, error) {
	cm, err := c.K8s.CoreV1().ConfigMaps(namespace).Get(ctx, configMapName, metav1.GetOptions{})
	if err != nil {
		if k8serrors.IsNotFound(err) {
			return map[string]interface{}{}, nil
		}
		return nil, err
	}
	
	raw, ok := cm.Data["plugins.yml"]
	if !ok {
		return map[string]interface{}{}, nil
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &data); err != nil {
		return nil, fmt.Errorf("failed to parse plugin config map %s: %w", configMapName, err)
	}

	return data, nil
}

func (c *Client) UpdatePluginConfig(ctx context.Context, namespace, configMapName string, data map[string]interface{}) error {
	cm, err := c.K8s.CoreV1().ConfigMaps(namespace).Get(ctx, configMapName, metav1.GetOptions{})
	if err != nil {
		return err
	}

	raw, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to encode plugin config map: %w", err)
	}

	if cm.Data == nil {
		cm.Data = make(map[string]string)
	}
	cm.Data["plugins.yml"] = string(raw)

	_, err = c.K8s.CoreV1().ConfigMaps(namespace).Update(ctx, cm, metav1.UpdateOptions{})
	return err
}
