# ── Stage 1: Build Frontend ───────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# ── Stage 2: Build Backend ────────────────────────────────────────────────────
FROM golang:1.24-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app/backend
COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
RUN CGO_ENABLED=0 GOOS=linux go build -o /traefik-manager ./cmd/server

# ── Stage 3: Final Runtime Image ──────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app
COPY --from=backend-builder /traefik-manager .
COPY --from=frontend-builder /app/frontend/dist ./dist

# The backend reads TM_ADDR by default to know where to bind
ENV TM_ADDR=:8080

EXPOSE 8080

ENTRYPOINT ["/app/traefik-manager"]
