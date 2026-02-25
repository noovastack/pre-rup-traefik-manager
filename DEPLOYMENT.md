# Deployment Guide

Traefik Manager is designed to be highly portable and can run in various environments. It relies on direct access to the underlying orchestrator's API (e.g., Kubernetes via `client-go` or Docker Daemon via `socket-proxy`).

Below are the instructions for deploying Traefik Manager to our currently supported environments.

---

## 1. Kubernetes (Recommended)

The most robust way to run Traefik Manager is directly inside your Kubernetes cluster. It will use a dedicated `ServiceAccount` to securely read and write Traefik Custom Resources and Gateway API resources.

### Option A: Helm (Easiest)
We maintain a custom Helm chart for simple, templated deployment.

```bash
# From the root of the repository
helm upgrade --install traefik-manager ./charts/traefik-manager \
  --namespace traefik-manager \
  --create-namespace \
  --set service.type=ClusterIP \
  --set service.port=8080
```

To access the UI locally:
```bash
kubectl port-forward svc/traefik-manager -n traefik-manager 8080:8080
```
Open `http://localhost:8080` in your browser.

### Option B: Raw Manifests
If you prefer not to use Helm, we provide raw `Deployment` and `RBAC` manifests.

```bash
# Create the namespace and apply RBAC permissions
kubectl apply -f deploy/rbac.yaml

# Deploy the application
kubectl apply -f deploy/deployment.yaml
```

---

## 2. Docker Compose

If you are not running Kubernetes, or if you simply want to test the application logic connected to a local Docker sock or a remote Kubeconfig without a full cluster deployment, you can use Docker Compose.

### Option A: Standard Deployment
This spins up Traefik Manager using the pre-configured `docker-compose.yml`. It builds the React and Go binaries natively and serves them.

```bash
# Start the stack in detached mode
docker-compose up -d --build
```
The UI will be accessible at `http://localhost:8081` (port-forwarded by the included local Traefik container).

### Option B: Local Hot-Reloading (Development Environment)
If you are actively writing code for Traefik Manager, use the dedicated development Compose file. This bypasses static image compilation in favor of ephemeral `node:20-alpine` and `golang:alpine` containers with live volume mounts.

It leverages `vite` for frontend Hot Module Replacement (HMR) and `air` for instantaneous Go backend recompilation on save.

```bash
# Start the development stack
docker-compose -f docker-compose.dev.yml up -d --build
```

- **Frontend UI:** `http://localhost:5177`
- **Backend API:** `http://localhost:8080`

**Environment Variables:**
To connect this local development stack to a real remote Kubernetes cluster, provide a valid KUBECONFIG file mapped to the backend container, or export the `KUBECONFIG` variable to your host before spinning up the stack if modifying the `docker-compose.dev.yml` volumes.
