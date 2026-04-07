<div align="center">
  <img src="traefik-manager.jpeg" alt="Pre Rup Traefik Manager" width="220">
  <h1>Pre Rup Traefik Manager</h1>
  <p>A web GUI for managing Traefik Proxy on Kubernetes — no YAML required.</p>
</div>

---

## What It Does

Pre Rup Traefik Manager gives you a visual interface to create, edit, and delete Traefik and Kubernetes Gateway API resources directly in your cluster. The backend is stateless — Kubernetes is always the source of truth.

**Manages:**
- HTTP, TCP, and UDP routing (`IngressRoute`, `IngressRouteTCP`, `IngressRouteUDP`)
- Middlewares (HTTP and TCP)
- TLS options and stores
- Traffic shaping (`TraefikService` — canary, blue/green, mirroring)
- Upstream transports (`ServersTransport`, `ServersTransportTCP`)
- Kubernetes Gateway API (`GatewayClass`, `Gateway`, `HTTPRoute`)
- Observability configuration (OpenTelemetry, Datadog, Prometheus)
- WASM plugins
- Multi-cluster support

## Quick Start

### Prerequisites
- A running Kubernetes cluster (k3s, minikube, EKS, GKE, etc.)
- Traefik v3 installed with CRDs

### Deploy with Helm

```bash
helm upgrade --install traefik-manager ./charts/traefik-manager \
  --namespace traefik-manager \
  --create-namespace
```

```bash
kubectl port-forward svc/traefik-manager -n traefik-manager 8080:8080
```

Open `http://localhost:8080` — default login is `admin` / `admin` (you will be prompted to change it).

### Run with Docker

```bash
cp .env.example .env          # set TM_ENCRYPTION_KEY
docker-compose up -d --build
```

Open `http://localhost:8081`.

### Local Development

```bash
# Full stack with hot-reload
docker-compose -f docker-compose.dev.yml up -d

# Or run directly
cd backend && go run ./cmd/server   # API on :8080
cd frontend && npm install && npm run dev  # UI on :5177
```

## Configuration

| Variable | Default | Description |
|---|---|---|
| `TM_ENCRYPTION_KEY` | auto-generated | 64-char hex key for AES-256-GCM encryption of stored cluster credentials |
| `TM_JWT_SECRET` | derived from above | JWT signing secret |
| `TM_ADMIN_PASSWORD` | `admin` | Initial admin password |
| `TM_DB_PATH` | `./traefik-manager.db` | SQLite database path |
| `TM_ADDR` | `:8080` | Backend bind address |

Generate a secure encryption key:
```bash
openssl rand -hex 32
```

## Architecture

```
React UI  →  Go REST API  →  client-go  →  Kubernetes API  →  Traefik CRDs
```

The Go backend resolves the `X-Cluster-Context` header on every request to route to the correct Kubernetes client. Cluster credentials are stored encrypted in SQLite and loaded into an in-memory pool on startup.

See [ARCHITECTURE.md](ARCHITECTURE.md) for a full breakdown.

## Multi-Cluster

Add remote clusters from the UI — provide the API server URL and a bearer token. Credentials are encrypted at rest with AES-256-GCM. Switch between clusters using the cluster switcher in the sidebar.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) — Chhousour LEOK
