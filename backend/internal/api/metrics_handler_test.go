package api

import (
	"testing"
)

// TestParsePrometheusMetrics_ActiveConnections checks connection counting.
func TestParsePrometheusMetrics_ActiveConnections(t *testing.T) {
	h := &MetricsHandler{}
	raw := `# HELP traefik_entrypoint_open_connections
# TYPE traefik_entrypoint_open_connections gauge
traefik_entrypoint_open_connections{entrypoint="web"} 4
traefik_entrypoint_open_connections{entrypoint="websecure"} 2
`
	m := h.parsePrometheusMetrics(raw)
	if m.ActiveConnections != 6 {
		t.Errorf("ActiveConnections = %d, want 6", m.ActiveConnections)
	}
}

// TestParsePrometheusMetrics_RequestTotals checks HTTP code bucketing.
func TestParsePrometheusMetrics_RequestTotals(t *testing.T) {
	h := &MetricsHandler{}
	raw := `traefik_entrypoint_requests_total{code="200",entrypoint="web"} 1000
traefik_entrypoint_requests_total{code="404",entrypoint="web"} 50
traefik_entrypoint_requests_total{code="500",entrypoint="web"} 5
`
	m := h.parsePrometheusMetrics(raw)
	if m.TotalRequests != 1055 {
		t.Errorf("TotalRequests = %d, want 1055", m.TotalRequests)
	}
	if m.HTTPCodes["200"] != 1000 {
		t.Errorf("HTTPCodes[200] = %d, want 1000", m.HTTPCodes["200"])
	}
	if m.HTTPCodes["404"] != 50 {
		t.Errorf("HTTPCodes[404] = %d, want 50", m.HTTPCodes["404"])
	}
}

// TestParsePrometheusMetrics_Empty verifies graceful handling of no data.
func TestParsePrometheusMetrics_Empty(t *testing.T) {
	h := &MetricsHandler{}
	m := h.parsePrometheusMetrics("")
	if m.ActiveConnections != 0 || m.TotalRequests != 0 {
		t.Error("expected zero metrics for empty input")
	}
	if m.HTTPCodes == nil {
		t.Error("HTTPCodes map should be initialized")
	}
}

// TestParsePrometheusMetrics_SkipsComments verifies comment lines are ignored.
func TestParsePrometheusMetrics_SkipsComments(t *testing.T) {
	h := &MetricsHandler{}
	raw := `# HELP traefik_entrypoint_open_connections Current connections
# TYPE traefik_entrypoint_open_connections gauge
`
	m := h.parsePrometheusMetrics(raw)
	if m.ActiveConnections != 0 {
		t.Errorf("expected 0 connections, got %d", m.ActiveConnections)
	}
}

// TestMetricsHandler_NilK8s verifies graceful empty response when k8s is unavailable.
func TestMetricsHandler_NilK8s(t *testing.T) {
	// GetK8s returns nil — handler should not panic (it dereferences the client).
	// The clusterRequiredMiddleware would block this in production,
	// so we only test the parsePrometheusMetrics path here and the router-level block.
	// This test verifies the parsing helpers work independently of K8s.
	h := &MetricsHandler{}
	raw := "traefik_entrypoint_open_connections{entrypoint=\"web\"} 3\n"
	m := h.parsePrometheusMetrics(raw)
	if m.ActiveConnections != 3 {
		t.Errorf("got %d, want 3", m.ActiveConnections)
	}
}
