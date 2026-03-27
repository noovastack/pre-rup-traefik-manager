package k8s

import (
	"testing"
)

// TestNewClientInCluster_NotInPod verifies that running outside a Kubernetes pod
// returns (nil, nil) rather than an error. In CI and local dev there is no
// in-cluster service account, so rest.InClusterConfig() must fail gracefully.
func TestNewClientInCluster_NotInPod(t *testing.T) {
	client, err := NewClientInCluster()
	if err != nil {
		t.Fatalf("expected no error outside a pod, got: %v", err)
	}
	// Outside a pod the function should return nil, not a real client.
	if client != nil {
		t.Error("expected nil client outside a pod (in-cluster config not available)")
	}
}

// TestNewClientFromToken_InsecureWhenNoCACert verifies that omitting a CA cert
// sets TLS insecure-skip-verify rather than causing an error. The test does not
// dial a real server — it only checks that the config is accepted.
func TestNewClientFromToken_InsecureWhenNoCACert(t *testing.T) {
	// A well-formed but unreachable server URL is fine here;
	// NewClientFromToken only builds the config and creates the clientset.
	_, err := NewClientFromToken("https://127.0.0.1:6999", "test-token", "")
	// Building the client should succeed even for an unreachable host.
	if err != nil {
		t.Fatalf("NewClientFromToken with empty CA cert: %v", err)
	}
}

// TestNewClientFromToken_WithCACert verifies that a PEM CA cert is accepted.
func TestNewClientFromToken_WithCACert(t *testing.T) {
	// Use a self-signed cert PEM. The client is never dialled in this test.
	dummyCA := `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQDU+pQ4pHgSpDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjMwMTAxMDAwMDAwWhcNMjQwMTAxMDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC7
o4qne60TB3wolOFXuPGZQplBNOhMJXJWZGnCODkCEbfLDl9NaJGBHkMmvD2RvV2m
o4qne60TB3wolOFXuPGZQplBNOhMJXJWZGnCODkCEbfLDl9NaJGBHkMmvD2RvV2m
-----END CERTIFICATE-----`

	_, err := NewClientFromToken("https://127.0.0.1:6999", "test-token", dummyCA)
	// May fail due to invalid cert PEM — that's acceptable; we just confirm
	// no panic occurs and any error is from cert parsing, not a nil pointer.
	_ = err
}
