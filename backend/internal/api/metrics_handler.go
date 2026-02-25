package api

import (
	"encoding/json"
	"net/http"
	"strings"
	"strconv"

	"github.com/go-chi/chi/v5"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"github.com/chousour/traefik-manager/internal/provider"
)

type MetricsHandler struct {
	manager provider.Manager
}

func NewMetricsHandler(manager provider.Manager) *MetricsHandler {
	return &MetricsHandler{manager: manager}
}

type TraefikMetrics struct {
	ActiveConnections int            `json:"activeConnections"`
	TotalRequests     int            `json:"totalRequests"`
	HTTPCodes         map[string]int `json:"httpCodes"`
}

func (h *MetricsHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.GetMetrics)
	return r
}

func (h *MetricsHandler) GetMetrics(w http.ResponseWriter, r *http.Request) {
	namespace := chi.URLParam(r, "namespace")
	if namespace == "" {
		namespace = "traefik" // Fallback to default install namespace if not in context
	}

	// Find Traefik pod in the requested namespace
	pods, err := h.manager.GetK8s(r).CoreV1().Pods(namespace).List(r.Context(), metav1.ListOptions{
		LabelSelector: "app.kubernetes.io/name=traefik",
	})

	if err != nil || len(pods.Items) == 0 {
		// Fallback to finding it in the "traefik" namespace
		pods, err = h.manager.GetK8s(r).CoreV1().Pods("traefik").List(r.Context(), metav1.ListOptions{
			LabelSelector: "app.kubernetes.io/name=traefik",
		})
	}

	if err != nil || len(pods.Items) == 0 {
		// If we still can't find a Traefik pod, gracefully return 0 metrics
		json.NewEncoder(w).Encode(TraefikMetrics{HTTPCodes: make(map[string]int)})
		return
	}

	pod := pods.Items[0]

	// Fetch raw prometheus metrics directly from the Traefik pod
	// using the pod proxy subresource and appending the metrics port
	req := h.manager.GetK8s(r).CoreV1().RESTClient().Get().
		Namespace(pod.Namespace).
		Resource("pods").
		Name(pod.Name + ":9100").
		SubResource("proxy").
		Suffix("metrics")

	result := req.Do(r.Context())
	rawMetrics, err := result.Raw()

	if err != nil {
		// If we can't fetch metrics (e.g. metrics disabled)
		// we return a graceful empty set instead of a hard error, so the UI doesn't crash.
		json.NewEncoder(w).Encode(TraefikMetrics{HTTPCodes: make(map[string]int)})
		return
	}

	metrics := h.parsePrometheusMetrics(string(rawMetrics))
	json.NewEncoder(w).Encode(metrics)
}

func (h *MetricsHandler) parsePrometheusMetrics(rawData string) TraefikMetrics {
	metrics := TraefikMetrics{
		HTTPCodes: make(map[string]int),
	}

	lines := strings.Split(rawData, "\n")
	for _, line := range lines {
		// Skip comments and empty lines
		if strings.HasPrefix(line, "#") || line == "" {
			continue
		}

		// Example: traefik_entrypoint_open_connections{entrypoint="web"} 4
		if strings.HasPrefix(line, "traefik_entrypoint_open_connections") {
			metrics.ActiveConnections += extractIntValue(line)
			continue
		}

		// Example: traefik_entrypoint_requests_total{code="200",entrypoint="web"} 1250
		if strings.HasPrefix(line, "traefik_entrypoint_requests_total") {
			count := extractIntValue(line)
			metrics.TotalRequests += count

			code := extractLabelValue(line, "code=\"")
			if code != "" {
				metrics.HTTPCodes[code] += count
			}
			continue
		}
	}

	return metrics
}

// Helper to extract the trailing integer value from a prometheus metric line
func extractIntValue(line string) int {
	parts := strings.Fields(line)
	if len(parts) >= 2 {
		// Using Sscanf instead of Atoi because prometheus sometimes returns scientific notation like 1.5e+02
		// or floats even for counters.
		// For simplicity we just cast float to int for the dashboard
		f, err := strconv.ParseFloat(parts[1], 64)
		if err == nil {
			return int(f)
		}
	}
	return 0
}

// Helper to extract a specific label value like code="404"
func extractLabelValue(line, labelPrefix string) string {
	startIdx := strings.Index(line, labelPrefix)
	if startIdx == -1 {
		return ""
	}
	startIdx += len(labelPrefix)
	
	endIdx := strings.Index(line[startIdx:], "\"")
	if endIdx == -1 {
		return ""
	}
	
	return line[startIdx : startIdx+endIdx]
}
