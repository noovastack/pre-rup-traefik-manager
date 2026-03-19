# Contributing to Traefik Manager

Thank you for your interest in contributing!

## Prerequisites

- Go 1.24+
- Node.js 20+
- Docker & Docker Compose
- A Kubernetes cluster (or [kind](https://kind.sigs.k8s.io/) for local testing)

## Local Development

The fastest way to get a working dev environment is Docker Compose:

```bash
docker-compose -f docker-compose.dev.yml up -d --build
# Frontend: http://localhost:5177  (Vite HMR)
# Backend:  http://localhost:8080  (Air hot-reload)
```

Or run each service manually:

```bash
# Backend
cd backend
go run ./cmd/server

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Running Tests

```bash
# Backend
cd backend && go test ./...

# Frontend
cd frontend && npm test
```

## Submitting Changes

1. Fork the repository and create a branch from `main`.
2. Make your changes, ensuring tests pass.
3. Run `go vet ./...` and `npm run lint` to catch issues.
4. Open a pull request against `main` with a clear description of what and why.

## Code Style

- **Go:** standard `gofmt` formatting; no external linter config required.
- **TypeScript/React:** ESLint config in `frontend/eslint.config.js`.

## Architecture Overview

See [CLAUDE.md](CLAUDE.md) for a detailed description of the request flow, backend structure, and frontend structure.
