package api

import (
	"encoding/json"
	"testing"

	"github.com/noovastack/traefik-manager/internal/db"
)

func setupClusterDB(t *testing.T) {
	t.Helper()
	t.Setenv("TM_DB_PATH", ":memory:")
	t.Setenv("TM_ENCRYPTION_KEY", "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20")
	db.InitDB()
	t.Cleanup(func() {
		if db.DB != nil {
			db.DB.Close()
			db.DB = nil
		}
	})
}

func TestClusterHandler_List_Empty(t *testing.T) {
	setupClusterDB(t)
	h := NewClusterHandler(&mockManager{})

	r := newJSONRequest("GET", "/clusters/", "", "")
	r = withChiParams(r, map[string]string{})
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	var resp []interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("parse response: %v", err)
	}
	if len(resp) != 0 {
		t.Errorf("expected empty list, got %d items", len(resp))
	}
}

func TestClusterHandler_Create_MissingFields(t *testing.T) {
	setupClusterDB(t)
	h := NewClusterHandler(&mockManager{})

	r := newJSONRequest("POST", "/clusters/", `{"name":"test"}`, "")
	w := serve(h.Create, r)

	assertStatus(t, w, 400)
	assertContains(t, w, "VALIDATION_FAILED")
}

func TestClusterHandler_Create_InvalidJSON(t *testing.T) {
	setupClusterDB(t)
	h := NewClusterHandler(&mockManager{})

	r := newJSONRequest("POST", "/clusters/", `not json`, "")
	w := serve(h.Create, r)

	assertStatus(t, w, 400)
	assertContains(t, w, "INVALID_JSON")
}

func TestClusterHandler_Delete_NotFound(t *testing.T) {
	setupClusterDB(t)
	h := NewClusterHandler(&mockManager{})

	r := newJSONRequest("DELETE", "/clusters/999", "", "")
	r = withChiParams(r, map[string]string{"id": "999"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 404)
	assertContains(t, w, "NOT_FOUND")
}

func TestClusterHandler_Delete_InvalidID(t *testing.T) {
	setupClusterDB(t)
	h := NewClusterHandler(&mockManager{})

	r := newJSONRequest("DELETE", "/clusters/abc", "", "")
	r = withChiParams(r, map[string]string{"id": "abc"})
	w := serve(h.Delete, r)

	assertStatus(t, w, 400)
	assertContains(t, w, "INVALID_ID")
}

func TestClusterHandler_List_WithEntries(t *testing.T) {
	setupClusterDB(t)
	db.AddCluster("prod", "https://k8s.example.com:6443", "enc-tok", "enc-ca")
	h := NewClusterHandler(&mockManager{})

	r := newJSONRequest("GET", "/clusters/", "", "")
	w := serve(h.List, r)

	assertStatus(t, w, 200)
	assertContains(t, w, "prod")
	assertContains(t, w, "https://k8s.example.com:6443")
}
