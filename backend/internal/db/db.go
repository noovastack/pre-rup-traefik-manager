package db

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

type ClusterRecord struct {
	ID              int
	Name            string
	ServerURL       string
	EncryptedToken  string
	EncryptedCACert string
	CreatedAt       time.Time
}

type UserRecord struct {
	ID                   int
	Username             string
	PasswordHash         string
	DisplayName          string
	Email                string
	Role                 string
	MustChangeCredentials bool
	CreatedAt            time.Time
}

func InitDB() {
	dbPath := os.Getenv("TM_DB_PATH")
	if dbPath == "" {
		dbPath = "./traefik-manager.db"
	}

	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		log.Fatalf("failed to create db directory: %v", err)
	}

	var err error
	DB, err = sql.Open("sqlite3", dbPath)
	if err != nil {
		log.Fatalf("failed to open sqlite database: %v", err)
	}

	query := `
	CREATE TABLE IF NOT EXISTS clusters (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT UNIQUE NOT NULL,
		server_url TEXT NOT NULL,
		encrypted_token TEXT NOT NULL,
		encrypted_ca_cert TEXT NOT NULL DEFAULT '',
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		username TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(query); err != nil {
		log.Fatalf("failed to create tables: %v", err)
	}

	MigrateDB()
}

// MigrateDB applies incremental schema changes. Safe to run on every startup.
func MigrateDB() {
	migrations := []string{
		`ALTER TABLE users ADD COLUMN display_name TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN email TEXT NOT NULL DEFAULT ''`,
		`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer'`,
		`ALTER TABLE users ADD COLUMN must_change_credentials INTEGER NOT NULL DEFAULT 0`,
	}
	for _, m := range migrations {
		if _, err := DB.Exec(m); err != nil {
			if !strings.Contains(err.Error(), "duplicate column name") {
				log.Fatalf("db migration failed: %v", err)
			}
		}
	}
}

// GetClusters retrieves all clusters from the DB.
func GetClusters() ([]ClusterRecord, error) {
	rows, err := DB.Query("SELECT id, name, server_url, encrypted_token, encrypted_ca_cert, created_at FROM clusters")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clusters []ClusterRecord
	for rows.Next() {
		var c ClusterRecord
		if err := rows.Scan(&c.ID, &c.Name, &c.ServerURL, &c.EncryptedToken, &c.EncryptedCACert, &c.CreatedAt); err != nil {
			return nil, err
		}
		clusters = append(clusters, c)
	}
	return clusters, nil
}

// AddCluster stores a new cluster's encrypted credentials.
func AddCluster(name, serverURL, encryptedToken, encryptedCACert string) (int, error) {
	res, err := DB.Exec(
		"INSERT INTO clusters (name, server_url, encrypted_token, encrypted_ca_cert) VALUES (?, ?, ?, ?)",
		name, serverURL, encryptedToken, encryptedCACert,
	)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	return int(id), err
}

// DeleteCluster removes a cluster by ID.
func DeleteCluster(id int) error {
	_, err := DB.Exec("DELETE FROM clusters WHERE id = ?", id)
	return err
}

// GetClusterByID fetches a specific cluster by ID.
func GetClusterByID(id int) (*ClusterRecord, error) {
	var c ClusterRecord
	err := DB.QueryRow(
		"SELECT id, name, server_url, encrypted_token, encrypted_ca_cert, created_at FROM clusters WHERE id = ?",
		id,
	).Scan(&c.ID, &c.Name, &c.ServerURL, &c.EncryptedToken, &c.EncryptedCACert, &c.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// GetClusterByName fetches a specific cluster by name.
func GetClusterByName(name string) (*ClusterRecord, error) {
	var c ClusterRecord
	err := DB.QueryRow(
		"SELECT id, name, server_url, encrypted_token, encrypted_ca_cert, created_at FROM clusters WHERE name = ?",
		name,
	).Scan(&c.ID, &c.Name, &c.ServerURL, &c.EncryptedToken, &c.EncryptedCACert, &c.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &c, nil
}

// CountUsers returns the number of users in the database.
func CountUsers() (int, error) {
	var count int
	err := DB.QueryRow("SELECT COUNT(*) FROM users").Scan(&count)
	return count, err
}

// GetUserByUsername fetches a user by username.
func GetUserByUsername(username string) (*UserRecord, error) {
	var u UserRecord
	err := DB.QueryRow(
		"SELECT id, username, password_hash, display_name, email, role, must_change_credentials, created_at FROM users WHERE username = ?",
		username,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.DisplayName, &u.Email, &u.Role, &u.MustChangeCredentials, &u.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// GetUserByID fetches a user by ID.
func GetUserByID(id int) (*UserRecord, error) {
	var u UserRecord
	err := DB.QueryRow(
		"SELECT id, username, password_hash, display_name, email, role, must_change_credentials, created_at FROM users WHERE id = ?",
		id,
	).Scan(&u.ID, &u.Username, &u.PasswordHash, &u.DisplayName, &u.Email, &u.Role, &u.MustChangeCredentials, &u.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return &u, nil
}

// ListUsers returns all users.
func ListUsers() ([]*UserRecord, error) {
	rows, err := DB.Query(
		"SELECT id, username, password_hash, display_name, email, role, must_change_credentials, created_at FROM users ORDER BY created_at ASC",
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*UserRecord
	for rows.Next() {
		var u UserRecord
		if err := rows.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.DisplayName, &u.Email, &u.Role, &u.MustChangeCredentials, &u.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, &u)
	}
	return users, nil
}

// CreateUser inserts a new user record with default role 'viewer'.
func CreateUser(username, passwordHash string) error {
	_, err := DB.Exec(
		"INSERT INTO users (username, password_hash, display_name, email, role) VALUES (?, ?, '', '', 'viewer')",
		username, passwordHash,
	)
	return err
}

// CreateUserFull inserts a new user with all fields specified.
func CreateUserFull(username, passwordHash, displayName, email, role string, mustChangeCredentials bool) error {
	mustChange := 0
	if mustChangeCredentials {
		mustChange = 1
	}
	_, err := DB.Exec(
		"INSERT INTO users (username, password_hash, display_name, email, role, must_change_credentials) VALUES (?, ?, ?, ?, ?, ?)",
		username, passwordHash, displayName, email, role, mustChange,
	)
	return err
}

// SetupCredentials updates username and password and clears the must_change_credentials flag.
func SetupCredentials(id int, username, passwordHash string) error {
	_, err := DB.Exec(
		"UPDATE users SET username = ?, password_hash = ?, must_change_credentials = 0 WHERE id = ?",
		username, passwordHash, id,
	)
	return err
}

// UpdateUserProfile updates display name and email for a user.
func UpdateUserProfile(id int, displayName, email string) error {
	_, err := DB.Exec(
		"UPDATE users SET display_name = ?, email = ? WHERE id = ?",
		displayName, email, id,
	)
	return err
}

// UpdatePassword replaces the password hash for a user.
func UpdatePassword(id int, passwordHash string) error {
	_, err := DB.Exec("UPDATE users SET password_hash = ? WHERE id = ?", passwordHash, id)
	return err
}

// DeleteUser removes a user by ID.
func DeleteUser(id int) error {
	_, err := DB.Exec("DELETE FROM users WHERE id = ?", id)
	return err
}

// UpdateUserRole sets the role for a user.
func UpdateUserRole(id int, role string) error {
	_, err := DB.Exec("UPDATE users SET role = ? WHERE id = ?", role, id)
	return err
}
