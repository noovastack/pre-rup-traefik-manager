<div align="center">
  <img src="traefik-manager.jpeg" alt="Pre Rup Traefik Manager" width="220">
  <h1>Pre Rup Traefik Manager</h1>
  <p>A web GUI for managing Traefik Proxy on Kubernetes — no YAML required.</p>
  <p><em>"Pre Rup" (ព្រែរូប) means <strong>Transform Self</strong> in Khmer — named after the <a href="https://apsaraauthority.gov.kh/2021/08/12/pre-rup-temple/">Pre Rup temple</a> of Angkor, Cambodia.</em></p>
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
- Traefik v3 installed with CRDs and Gateway API support
- `kubectl` and `helm` CLI tools

---

### Deploy on k3s (Full Local Setup)

This is the recommended path for a fresh local cluster. It installs everything from scratch.

#### 1. Install Gateway API CRDs

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.1/standard-install.yaml
```

#### 2. Install Traefik via Helm

```bash
helm repo add traefik https://traefik.github.io/charts && helm repo update

helm upgrade --install traefik traefik/traefik \
  --namespace traefik --create-namespace \
  --set providers.kubernetesGateway.enabled=true \
  --set providers.kubernetesGateway.experimentalChannel=true \
  --set providers.kubernetesCRD.enabled=true \
  --set providers.kubernetesIngress.enabled=true \
  --set ingressClass.enabled=true \
  --set ingressClass.isDefaultClass=true \
  --set service.type=NodePort \
  --set "ports.web.nodePort=30080" \
  --set "ports.websecure.nodePort=30443" \
  --wait
```

#### 3. Create the GatewayClass

```bash
kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: local-traefik
spec:
  controllerName: traefik.io/gateway-controller
EOF
```

> **Note:** If you have an `IngressRouteTCP` with `HostSNI(*)`, make sure it targets a dedicated
> entrypoint (e.g. `websecure`) and **not** the `web` entrypoint — otherwise it will intercept all
> HTTP traffic before Traefik can route it.

#### 4. Create required secrets

```bash
kubectl create secret generic traefik-manager-secrets \
  --from-literal=encryptionKey=$(openssl rand -hex 32) \
  --from-literal=jwtSecret=$(openssl rand -hex 32) \
  -n default
```

#### 5. Deploy Traefik Manager

```bash
kubectl apply -f deploy/rbac.yaml
kubectl apply -f deploy/deployment.yaml
```

#### 6. Deploy the frontend and routing

```bash
kubectl apply -f deploy/frontend.yaml
```

Traefik Manager is now accessible at `http://<NODE_IP>:30080`.

#### 7. (Optional) Load the demo workloads

Apply the Angkor Wat demo manifest to populate the Network Map with a realistic topology:

```bash
kubectl apply -f angkor-wat-demo.yaml
```

This creates a Gateway, two HTTPRoutes (with weighted backends and a middleware), an IngressRouteTCP,
and the backing Deployments/Services.

---

### Build from Source (Image not yet published)

If the `ghcr.io/noovastack/traefik-manager` image is not yet publicly available, build and load it locally:

```bash
# Build backend
docker build -t traefik-manager:local ./backend

# Build frontend (build locally then package with nginx)
cd frontend && npm ci && npm run build && cd ..
docker build -t traefik-manager-ui:local \
  -f - ./frontend <<'EOF'
FROM nginx:1.25-alpine
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
EOF

# Load into k3s
docker save traefik-manager:local     | sudo k3s ctr images import -
docker save traefik-manager-ui:local  | sudo k3s ctr images import -
```

Then patch the deployments to use the local images:

```bash
kubectl set image deployment/traefik-manager \
  traefik-manager=docker.io/library/traefik-manager:local -n default
kubectl patch deployment traefik-manager -n default \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"traefik-manager","imagePullPolicy":"Never"}]}}}}'

kubectl set image deployment/traefik-manager-ui \
  traefik-manager-ui=docker.io/library/traefik-manager-ui:local -n default
kubectl patch deployment traefik-manager-ui -n default \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"traefik-manager-ui","imagePullPolicy":"Never","securityContext":{"runAsUser":0}}]}}}}'
```

---

### Deploy with Helm (published chart)

```bash
helm upgrade --install traefik-manager ./charts/traefik-manager \
  --namespace default \
  --create-namespace
```

Open `http://localhost:8080` — default login is `admin` / `admin` (you will be prompted to change it).

---

### Run with Docker Compose

```bash
cp .env.example .env          # set TM_ENCRYPTION_KEY
docker-compose up -d --build
```

Open `http://localhost:8081`.

---

### Local Development

```bash
# Full stack with hot-reload
docker-compose -f docker-compose.dev.yml up -d

# Or run directly
cd backend && go run ./cmd/server       # API on :8080
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

[MIT](LICENSE) — Noova Stack Technology
