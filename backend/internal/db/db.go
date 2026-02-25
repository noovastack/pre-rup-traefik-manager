package db

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

var DB *sql.DB

type ClusterRecord struct {
	ID                  int
	Name                string
	EncryptedKubeconfig string
	CreatedAt           time.Time
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

	// Create tables
	query := `
	CREATE TABLE IF NOT EXISTS clusters (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT UNIQUE NOT NULL,
		encrypted_kubeconfig TEXT NOT NULL,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);`

	if _, err := DB.Exec(query); err != nil {
		log.Fatalf("failed to create clusters table: %v", err)
	}
}

// GetClusters retrieves all clusters from the DB
func GetClusters() ([]ClusterRecord, error) {
	rows, err := DB.Query("SELECT id, name, encrypted_kubeconfig, created_at FROM clusters")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clusters []ClusterRecord
	for rows.Next() {
		var c ClusterRecord
		if err := rows.Scan(&c.ID, &c.Name, &c.EncryptedKubeconfig, &c.CreatedAt); err != nil {
			return nil, err
		}
		clusters = append(clusters, c)
	}
	return clusters, nil
}

// AddCluster securely inserts a new cluster into the DB
func AddCluster(name, encryptedKubeconfig string) (int, error) {
	res, err := DB.Exec("INSERT INTO clusters (name, encrypted_kubeconfig) VALUES (?, ?)", name, encryptedKubeconfig)
	if err != nil {
		return 0, err
	}
	id, err := res.LastInsertId()
	return int(id), err
}

// DeleteCluster removes a cluster by ID
func DeleteCluster(id int) error {
	_, err := DB.Exec("DELETE FROM clusters WHERE id = ?", id)
	return err
}

// GetClusterByName fetches a specific cluster
func GetClusterByName(name string) (*ClusterRecord, error) {
	var c ClusterRecord
	err := DB.QueryRow("SELECT id, name, encrypted_kubeconfig, created_at FROM clusters WHERE name = ?", name).
		Scan(&c.ID, &c.Name, &c.EncryptedKubeconfig, &c.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // not found
		}
		return nil, err
	}
	return &c, nil
}
