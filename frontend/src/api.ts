// Thin API client that wraps fetch with error handling.

import type { 
  IngressRoute, K8sService, IngressRouteTCP, IngressRouteUDP, 
  TraefikService, ServersTransport, ServersTransportTCP, MiddlewareTCP,
  GatewayClass, Gateway, HTTPRoute 
} from './types';

const BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('tm_token');
  const activeCluster = localStorage.getItem('tm_cluster') || 'local';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Cluster-Context': activeCluster,
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    localStorage.removeItem('tm_token');
    window.dispatchEvent(new Event('auth_unauthorized'));
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const msg = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export const authApi = {
  login: (username: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
};

// ── Clusters ───────────────────────────────────────────────────────────────

export interface ClusterHealth {
  kubernetesVersion: string;
  platform: string;
  nodes: { ready: number; total: number };
  pods: { total: number; running: number; pending: number; failed: number };
}

export const clusterApi = {
  getClusters: () => request<any[]>('/clusters').then(d => d || []),
  getClusterHealth: () => request<ClusterHealth>('/cluster/health'),
  createCluster: (name: string, serverUrl: string, token: string, caCert?: string) =>
    request<any>('/clusters', {
      method: 'POST',
      body: JSON.stringify({ name, serverUrl, token, caCert: caCert ?? '' })
    }),
  deleteCluster: (id: number) => 
    request<void>(`/clusters/${id}`, { method: 'DELETE' })
};

// ── Kubernetes Resources ───────────────────────────────────────────────────

export const k8sApi = {
  getNamespaces: () => request<string[]>('/namespaces').then(d => d || []),
  getServices: (namespace: string) => request<K8sService[]>(`/namespaces/${namespace}/services`).then(d => d || []),
  getEndpoints: (namespace: string, service: string) => request<{name: string}[]>(`/namespaces/${namespace}/services/${service}/endpoints`).then(d => d || []),
  getMiddlewares: (namespace: string) => request<any[]>(`/namespaces/${namespace}/middlewares`).then(d => d || []),
  deleteMiddleware: (namespace: string, name: string) => 
    request<void>(`/namespaces/${namespace}/middlewares/${name}`, { method: 'DELETE' }),
  createMiddleware: (namespace: string, body: any) =>
    request<any>(`/namespaces/${namespace}/middlewares`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateMiddleware: (namespace: string, name: string, body: any) =>
    request<any>(`/namespaces/${namespace}/middlewares/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  getTlsOptions: (namespace: string) => request<any[]>(`/namespaces/${namespace}/tlsoptions`).then(d => d || []),
  deleteTlsOption: (namespace: string, name: string) => 
    request<void>(`/namespaces/${namespace}/tlsoptions/${name}`, { method: 'DELETE' }),
  createTlsOption: (namespace: string, body: any) =>
    request<any>(`/namespaces/${namespace}/tlsoptions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateTlsOption: (namespace: string, name: string, body: any) =>
    request<any>(`/namespaces/${namespace}/tlsoptions/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  getIngressRoutes: (namespace: string) => 
    request<IngressRoute[]>(`/namespaces/${namespace}/ingressroutes`).then(d => d || []),
  getIngressRoute: (namespace: string, name: string) => 
    request<IngressRoute>(`/namespaces/${namespace}/ingressroutes/${name}`),
  createIngressRoute: (namespace: string, body: IngressRoute) =>
    request<IngressRoute>(`/namespaces/${namespace}/ingressroutes`, { 
      method: 'POST', body: JSON.stringify(body) 
    }),
  updateIngressRoute: (namespace: string, name: string, body: IngressRoute) =>
    request<IngressRoute>(`/namespaces/${namespace}/ingressroutes/${name}`, { 
      method: 'PUT', body: JSON.stringify(body) 
    }),
  deleteIngressRoute: (namespace: string, name: string) =>
    request<void>(`/namespaces/${namespace}/ingressroutes/${name}`, { method: 'DELETE' }),

  // -- IngressRouteTCP endpoints --
  getIngressRouteTCPs: (namespace: string) => 
    request<IngressRouteTCP[]>(`/namespaces/${namespace}/ingressroutetcps`).then(d => d || []),
  createIngressRouteTCP: (namespace: string, body: IngressRouteTCP) =>
    request<IngressRouteTCP>(`/namespaces/${namespace}/ingressroutetcps`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateIngressRouteTCP: (namespace: string, name: string, body: IngressRouteTCP) =>
    request<IngressRouteTCP>(`/namespaces/${namespace}/ingressroutetcps/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteIngressRouteTCP: (namespace: string, name: string) =>
    request<void>(`/namespaces/${namespace}/ingressroutetcps/${name}`, {
      method: 'DELETE',
    }),

  // -- IngressRouteUDP endpoints --
  getIngressRouteUDPs: (namespace: string) => 
    request<IngressRouteUDP[]>(`/namespaces/${namespace}/ingressrouteudps`).then(d => d || []),
  createIngressRouteUDP: (namespace: string, body: IngressRouteUDP) =>
    request<IngressRouteUDP>(`/namespaces/${namespace}/ingressrouteudps`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateIngressRouteUDP: (namespace: string, name: string, body: IngressRouteUDP) =>
    request<IngressRouteUDP>(`/namespaces/${namespace}/ingressrouteudps/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteIngressRouteUDP: (namespace: string, name: string) =>
    request<void>(`/namespaces/${namespace}/ingressrouteudps/${name}`, {
      method: 'DELETE',
    }),

  // -- TraefikService endpoints --
  getTraefikServices: (namespace: string) => 
    request<TraefikService[]>(`/namespaces/${namespace}/traefikservices`).then(d => d || []),
  createTraefikService: (namespace: string, body: TraefikService) =>
    request<TraefikService>(`/namespaces/${namespace}/traefikservices`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateTraefikService: (namespace: string, name: string, body: TraefikService) =>
    request<TraefikService>(`/namespaces/${namespace}/traefikservices/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteTraefikService: (namespace: string, name: string) =>
    request<void>(`/namespaces/${namespace}/traefikservices/${name}`, {
      method: 'DELETE',
    }),

  // -- ServersTransport endpoints --
  getServersTransports: (namespace: string) =>
    request<ServersTransport[]>(`/namespaces/${namespace}/serverstransports`).then(d => d || []),
  createServersTransport: (namespace: string, body: ServersTransport) =>
    request<ServersTransport>(`/namespaces/${namespace}/serverstransports`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateServersTransport: (namespace: string, name: string, body: ServersTransport) =>
    request<ServersTransport>(`/namespaces/${namespace}/serverstransports/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteServersTransport: (namespace: string, name: string) =>
    request<void>(`/namespaces/${namespace}/serverstransports/${name}`, {
      method: 'DELETE',
    }),

  // -- ServersTransportTCP endpoints --
  getServersTransportsTCP: (namespace: string) =>
    request<ServersTransportTCP[]>(`/namespaces/${namespace}/serverstransporttcps`).then(d => d || []),
  createServersTransportTCP: (namespace: string, body: ServersTransportTCP) =>
    request<ServersTransportTCP>(`/namespaces/${namespace}/serverstransporttcps`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateServersTransportTCP: (namespace: string, name: string, body: ServersTransportTCP) =>
    request<ServersTransportTCP>(`/namespaces/${namespace}/serverstransporttcps/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteServersTransportTCP: (namespace: string, name: string) =>
    request<void>(`/namespaces/${namespace}/serverstransporttcps/${name}`, {
      method: 'DELETE',
    }),

  // -- MiddlewareTCP endpoints --
  getMiddlewaresTCP: (namespace: string) =>
    request<MiddlewareTCP[]>(`/namespaces/${namespace}/middlewaretcps`).then(d => d || []),
  createMiddlewareTCP: (namespace: string, body: MiddlewareTCP) =>
    request<MiddlewareTCP>(`/namespaces/${namespace}/middlewaretcps`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateMiddlewareTCP: (namespace: string, name: string, body: MiddlewareTCP) =>
    request<MiddlewareTCP>(`/namespaces/${namespace}/middlewaretcps/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  deleteMiddlewareTCP: (namespace: string, name: string) =>
    request<void>(`/namespaces/${namespace}/middlewaretcps/${name}`, {
      method: 'DELETE',
    }),

  // -- Metrics endpoints --
  getMetrics: (namespace: string) =>
    request<any>(`/namespaces/${namespace}/metrics`),

  // ── Gateway API Endpoints ────────────────────────────────────────────────
  getGatewayClasses: () =>
    request<GatewayClass[]>('/gatewayclasses').then(d => d || []),
  getGatewayClass: (name: string) =>
    request<GatewayClass>(`/gatewayclasses/${name}`),
  createGatewayClass: (body: GatewayClass) =>
    request<GatewayClass>('/gatewayclasses', { method: 'POST', body: JSON.stringify(body) }),
  updateGatewayClass: (name: string, body: GatewayClass) =>
    request<GatewayClass>(`/gatewayclasses/${name}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteGatewayClass: (name: string) =>
    request<void>(`/gatewayclasses/${name}`, { method: 'DELETE' }),

  getGateways: (namespace: string) =>
    request<Gateway[]>(`/namespaces/${namespace}/gateways`).then(d => d || []),
  getGateway: (namespace: string, name: string) =>
    request<Gateway>(`/namespaces/${namespace}/gateways/${name}`),
  createGateway: (namespace: string, body: Gateway) =>
    request<Gateway>(`/namespaces/${namespace}/gateways`, { method: 'POST', body: JSON.stringify(body) }),
  updateGateway: (namespace: string, name: string, body: Gateway) =>
    request<Gateway>(`/namespaces/${namespace}/gateways/${name}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteGateway: (namespace: string, name: string) =>
    request<void>(`/namespaces/${namespace}/gateways/${name}`, { method: 'DELETE' }),

  getHTTPRoutes: (namespace: string) =>
    request<HTTPRoute[]>(`/namespaces/${namespace}/httproutes`).then(d => d || []),
  getHTTPRoute: (namespace: string, name: string) =>
    request<HTTPRoute>(`/namespaces/${namespace}/httproutes/${name}`),
  createHTTPRoute: (namespace: string, body: HTTPRoute) =>
    request<HTTPRoute>(`/namespaces/${namespace}/httproutes`, { method: 'POST', body: JSON.stringify(body) }),
  updateHTTPRoute: (namespace: string, name: string, body: HTTPRoute) =>
    request<HTTPRoute>(`/namespaces/${namespace}/httproutes/${name}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteHTTPRoute: (namespace: string, name: string) =>
    request<void>(`/namespaces/${namespace}/httproutes/${name}`, { method: 'DELETE' }),

  // ── Observability ────────────────────────────────────────────────────────
  getTelemetryConfig: (namespace: string, name: string) =>
    request<any>(`/namespaces/${namespace}/observability/${name}`),
  updateTelemetryConfig: (namespace: string, name: string, body: any) =>
    request<any>(`/namespaces/${namespace}/observability/${name}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // ── WebAssembly Plugins ──────────────────────────────────────────────────
  getPluginConfig: (namespace: string) =>
    request<any>(`/namespaces/${namespace}/plugins`),
  updatePluginConfig: (namespace: string, body: any) =>
    request<any>(`/namespaces/${namespace}/plugins`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
};
