package db

import (
	"testing"
)

// setupTestDB initialises an in-memory SQLite database for the duration of the test.
// CGO_ENABLED=1 is required because mattn/go-sqlite3 uses cgo.
func setupTestDB(t *testing.T) {
	t.Helper()
	t.Setenv("TM_DB_PATH", ":memory:")
	InitDB()
	t.Cleanup(func() {
		if DB != nil {
			DB.Close()
			DB = nil
		}
	})
}

func TestInitDB(t *testing.T) {
	setupTestDB(t)
	if DB == nil {
		t.Fatal("expected DB to be non-nil after InitDB")
	}
	// Verify the clusters table exists by querying it.
	_, err := DB.Query("SELECT id FROM clusters LIMIT 0")
	if err != nil {
		t.Fatalf("clusters table not accessible: %v", err)
	}
}

func TestAddAndGetClusters(t *testing.T) {
	setupTestDB(t)

	id, err := AddCluster("prod", "https://api.prod.example:6443", "enc-token-1", "enc-ca-1")
	if err != nil {
		t.Fatalf("AddCluster: %v", err)
	}
	if id == 0 {
		t.Error("expected non-zero ID from AddCluster")
	}

	clusters, err := GetClusters()
	if err != nil {
		t.Fatalf("GetClusters: %v", err)
	}
	if len(clusters) != 1 {
		t.Fatalf("expected 1 cluster, got %d", len(clusters))
	}

	c := clusters[0]
	if c.Name != "prod" {
		t.Errorf("Name = %q, want %q", c.Name, "prod")
	}
	if c.ServerURL != "https://api.prod.example:6443" {
		t.Errorf("ServerURL = %q, want %q", c.ServerURL, "https://api.prod.example:6443")
	}
	if c.EncryptedToken != "enc-token-1" {
		t.Errorf("EncryptedToken = %q, want %q", c.EncryptedToken, "enc-token-1")
	}
	if c.EncryptedCACert != "enc-ca-1" {
		t.Errorf("EncryptedCACert = %q, want %q", c.EncryptedCACert, "enc-ca-1")
	}
}

func TestGetClustersEmpty(t *testing.T) {
	setupTestDB(t)

	clusters, err := GetClusters()
	if err != nil {
		t.Fatalf("GetClusters on empty DB: %v", err)
	}
	if len(clusters) != 0 {
		t.Errorf("expected 0 clusters, got %d", len(clusters))
	}
}

func TestGetClusterByName(t *testing.T) {
	setupTestDB(t)
	AddCluster("staging", "https://api.staging:6443", "tok", "ca")

	c, err := GetClusterByName("staging")
	if err != nil {
		t.Fatalf("GetClusterByName: %v", err)
	}
	if c == nil {
		t.Fatal("expected cluster, got nil")
	}
	if c.Name != "staging" {
		t.Errorf("Name = %q, want %q", c.Name, "staging")
	}
}

func TestGetClusterByNameNotFound(t *testing.T) {
	setupTestDB(t)

	c, err := GetClusterByName("does-not-exist")
	if err != nil {
		t.Fatalf("unexpected error for missing cluster: %v", err)
	}
	if c != nil {
		t.Errorf("expected nil for missing cluster, got %+v", c)
	}
}

func TestDeleteCluster(t *testing.T) {
	setupTestDB(t)

	id, err := AddCluster("to-delete", "https://x:6443", "tok", "ca")
	if err != nil {
		t.Fatalf("AddCluster: %v", err)
	}

	if err := DeleteCluster(id); err != nil {
		t.Fatalf("DeleteCluster: %v", err)
	}

	clusters, err := GetClusters()
	if err != nil {
		t.Fatalf("GetClusters after delete: %v", err)
	}
	if len(clusters) != 0 {
		t.Errorf("expected 0 clusters after delete, got %d", len(clusters))
	}
}

func TestAddClusterDuplicateNameFails(t *testing.T) {
	setupTestDB(t)

	if _, err := AddCluster("dup", "https://x:6443", "tok", "ca"); err != nil {
		t.Fatalf("first AddCluster: %v", err)
	}
	_, err := AddCluster("dup", "https://y:6443", "tok2", "ca2")
	if err == nil {
		t.Error("expected UNIQUE constraint error for duplicate cluster name, got nil")
	}
}

// ── User function tests ──────────────────────────────────────────────────────

func TestCreateAndGetUser(t *testing.T) {
	setupTestDB(t)

	if err := CreateUser("alice", "hashed-password"); err != nil {
		t.Fatalf("CreateUser: %v", err)
	}

	u, err := GetUserByUsername("alice")
	if err != nil {
		t.Fatalf("GetUserByUsername: %v", err)
	}
	if u == nil {
		t.Fatal("expected user, got nil")
	}
	if u.Username != "alice" {
		t.Errorf("Username = %q, want %q", u.Username, "alice")
	}
	if u.PasswordHash != "hashed-password" {
		t.Errorf("PasswordHash = %q, want %q", u.PasswordHash, "hashed-password")
	}
}

func TestGetUserByUsernameNotFound(t *testing.T) {
	setupTestDB(t)

	u, err := GetUserByUsername("nobody")
	if err != nil {
		t.Fatalf("unexpected error for missing user: %v", err)
	}
	if u != nil {
		t.Errorf("expected nil for missing user, got %+v", u)
	}
}

func TestCountUsers_Empty(t *testing.T) {
	setupTestDB(t)

	n, err := CountUsers()
	if err != nil {
		t.Fatalf("CountUsers: %v", err)
	}
	if n != 0 {
		t.Errorf("expected 0 users, got %d", n)
	}
}

func TestCountUsers_AfterCreate(t *testing.T) {
	setupTestDB(t)

	CreateUser("u1", "h1")
	CreateUser("u2", "h2")

	n, err := CountUsers()
	if err != nil {
		t.Fatalf("CountUsers: %v", err)
	}
	if n != 2 {
		t.Errorf("expected 2 users, got %d", n)
	}
}

func TestCreateUser_DuplicateUsernameFails(t *testing.T) {
	setupTestDB(t)

	if err := CreateUser("bob", "hash"); err != nil {
		t.Fatalf("first CreateUser: %v", err)
	}
	if err := CreateUser("bob", "hash2"); err == nil {
		t.Error("expected UNIQUE constraint error for duplicate username, got nil")
	}
}

func TestAddClusterEmptyCACert(t *testing.T) {
	setupTestDB(t)

	id, err := AddCluster("no-ca", "https://z:6443", "tok", "")
	if err != nil {
		t.Fatalf("AddCluster with empty CA cert: %v", err)
	}

	c, _ := GetClusterByName("no-ca")
	if c == nil {
		t.Fatal("cluster not found")
	}
	if c.ID != id {
		t.Errorf("ID mismatch: got %d, want %d", c.ID, id)
	}
	if c.EncryptedCACert != "" {
		t.Errorf("expected empty CA cert, got %q", c.EncryptedCACert)
	}
}

func TestGetClusterByID(t *testing.T) {
	setupTestDB(t)
	id, _ := AddCluster("by-id", "https://test:6443", "tok", "ca")
	
	c, err := GetClusterByID(id)
	if err != nil || c == nil {
		t.Fatalf("GetClusterByID: %v", err)
	}
	if c.Name != "by-id" {
		t.Errorf("Name = %q, want by-id", c.Name)
	}

	c2, err := GetClusterByID(99999)
	if err != nil {
		t.Errorf("expected no error for missing cluster ID, got %v", err)
	}
	if c2 != nil {
		t.Errorf("expected nil for missing cluster")
	}
}

func TestUserManagementComprehensive(t *testing.T) {
	setupTestDB(t)

	err := CreateUserFull("fulluser", "hash2", "Full User", "full@test.com", "admin", true)
	if err != nil {
		t.Fatalf("CreateUserFull failed: %v", err)
	}

	users, err := ListUsers()
	if err != nil || len(users) != 1 {
		t.Fatalf("ListUsers failed or count mismatch")
	}

	fullUser := users[0]
	u, err := GetUserByID(fullUser.ID)
	if err != nil || u == nil {
		t.Fatalf("GetUserByID failed")
	}
	if u.Role != "admin" || !u.MustChangeCredentials {
		t.Errorf("invalid mapping of UserRecord fields")
	}

	uNotFound, err := GetUserByID(9999)
	if err != nil {
		t.Errorf("expected no error for not found ID, got %v", err)
	}
	if uNotFound != nil {
		t.Errorf("expected nil result")
	}

	err = SetupCredentials(fullUser.ID, "fulluser_new", "hash_new")
	if err != nil {
		t.Errorf("SetupCredentials failed: %v", err)
	}
	u, _ = GetUserByID(fullUser.ID)
	if u.Username != "fulluser_new" || u.PasswordHash != "hash_new" || u.MustChangeCredentials {
		t.Errorf("SetupCredentials did not apply correctly")
	}

	err = UpdateUserProfile(fullUser.ID, "New Name", "new@test.com")
	if err != nil {
		t.Errorf("UpdateUserProfile failed")
	}

	err = UpdatePassword(fullUser.ID, "hash3")
	if err != nil {
		t.Errorf("UpdatePassword failed")
	}

	err = UpdateUserRole(fullUser.ID, "viewer")
	if err != nil {
		t.Errorf("UpdateUserRole failed")
	}
	u, _ = GetUserByID(fullUser.ID)
	if u.Role != "viewer" {
		t.Errorf("UpdateUserRole did not apply")
	}

	err = DeleteUser(fullUser.ID)
	if err != nil {
		t.Errorf("DeleteUser failed")
	}
}
