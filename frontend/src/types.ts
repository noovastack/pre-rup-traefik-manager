// Central type definitions mirroring Kubernetes CRDs.

export interface ObjectMeta {
  name: string;
  namespace: string;
  uid?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
}

export interface IngressRoute {
  metadata: ObjectMeta;
  spec: {
    entryPoints?: string[];
    routes: {
      match: string;
      kind: 'Rule';
      services: {
        name: string;
        namespace?: string;
        port: number;
        scheme?: string;
        passHostHeader?: boolean;
        kind?: string;
      }[];
      middlewares?: {
        name: string;
        namespace?: string;
      }[];
    }[];
    tls?: {
      secretName?: string;
      certResolver?: string;
    };
  };
}

export interface K8sService {
  name: string;
  ports: number[];
}

export interface ApiError {
  error: { code: string; message: string };
}

// Traefik IngressRouteTCP CRD
export interface IngressRouteTCP {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
  };
  spec: {
    entryPoints?: string[];
    routes: Array<{
      match: string;
      services: Array<{
        name: string;
        port: number;
        weight?: number;
      }>;
      middlewares?: Array<{
        name: string;
        namespace?: string;
      }>;
    }>;
    tls?: {
      secretName?: string;
      passthrough?: boolean;
      options?: {
        name: string;
        namespace?: string;
      };
      certResolver?: string;
    };
  };
}

// Traefik IngressRouteUDP CRD
export interface IngressRouteUDP {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
  };
  spec: {
    entryPoints?: string[];
    routes: Array<{
      services: Array<{
        name: string;
        port: number;
        weight?: number;
      }>;
    }>;
  };
}

// Configures advanced load balancing (Canary, Mirroring, Weighted)
export interface TraefikService {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
  };
  spec: {
    weighted?: {
      services: Array<{
        name: string;
        namespace?: string;
        port?: number;
        weight?: number;
        serversTransport?: string;
      }>;
    };
    mirroring?: {
      name: string;
      namespace?: string;
      port?: number;
      mirrors: Array<{
        name: string;
        namespace?: string;
        port?: number;
        percent?: number;
      }>;
    };
  };
}

// Configures backend server communication (TLS, mutual TLS, certificates)
export interface ServersTransport {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
  };
  spec: {
    serverName?: string;
    insecureSkipVerify?: boolean;
    rootCAsSecrets?: string[];
    certificatesSecrets?: string[];
    maxIdleConnsPerHost?: number;
    forwardingTimeouts?: {
      dialTimeout?: string;
      responseHeaderTimeout?: string;
      idleConnTimeout?: string;
    };
  };
}

export interface ServersTransportTCP {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
  };
  spec: {
    serverName?: string;
    insecureSkipVerify?: boolean;
    rootCAsSecrets?: string[];
    certificatesSecrets?: string[];
    dialTimeout?: string;
  };
}

// Traefik MiddlewareTCP CRD
export interface MiddlewareTCP {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
  };
  spec: {
    inFlightConn?: {
      amount: number;
    };
    ipWhiteList?: {
      sourceRange: string[];
    };
  };
}

// ── Gateway API (Standard K8s Objects) ─────────────────────────────────────

export interface GatewayClass {
  metadata: {
    name: string;
    uid?: string;
  };
  spec: {
    controllerName: string;
    description?: string;
  };
}

export interface Gateway {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
  };
  spec: {
    gatewayClassName: string;
    listeners: Array<{
      name: string;
      port: number;
      protocol: string;
      hostname?: string;
    }>;
  };
}

export interface HTTPRoute {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
  };
  spec: {
    parentRefs?: Array<{
      name: string;
      namespace?: string;
    }>;
    hostnames?: string[];
    rules?: Array<{
      matches?: Array<{
        path?: {
          type: string;
          value: string;
        };
      }>;
      backendRefs?: Array<{
        name: string;
        port: number;
        weight?: number;
      }>;
    }>;
  };
}
