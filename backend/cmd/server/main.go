package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/chousour/traefik-manager/internal/api"
	"github.com/chousour/traefik-manager/internal/crypto"
	"github.com/chousour/traefik-manager/internal/db"
	//"github.com/chousour/traefik-manager/internal/provider"
	"github.com/chousour/traefik-manager/internal/provider/k8s"
	"github.com/chousour/traefik-manager/internal/provider/swarm"
)

func main() {
	kubeconfig := flag.String("kubeconfig", "", "absolute path to the kubeconfig file")
	flag.Parse()

	addr := env("TM_ADDR", ":8080")

	// 1. Initialize SQLite Database
	db.InitDB()
	log.Println("Database initialized successfully")

	// 2. Initialize Provider Manager
	providerType := env("TM_PROVIDER", "kubernetes")
	
	//var p provider.Provider
	var kManager *k8s.ManagerImpl
	var err error

	if providerType == "kubernetes" {
		// Instantiate the Local cluster
		localClient, err := k8s.NewClient(*kubeconfig)
		if err != nil {
			log.Fatalf("failed to initialize Kubernetes local client: %v", err)
		}
		
		// Create the Dynamic Manager pool
		kManager = k8s.NewManager(localClient)
		log.Println("Kubernetes Local Manager initialized successfully")

		// Rebuild remote clusters from Database seamlessly on boot
		clusters, dbErr := db.GetClusters()
		if dbErr != nil {
			log.Fatalf("failed to read clusters from sqlite: %v", dbErr)
		}

		loadedCount := 0
		for _, c := range clusters {
			// Decrypt Kubeconfig payload
			rawYaml, cryptoErr := crypto.Decrypt(c.EncryptedKubeconfig)
			if cryptoErr != nil {
				log.Printf("[ERR] Failed to decrypt cluster %s. Did the TM_ENCRYPTION_KEY change? Skipping...", c.Name)
				continue
			}
			
			// Build the client and map it
			if loadErr := kManager.AddCluster(c.ID, c.Name, rawYaml); loadErr != nil {
				log.Printf("[ERR] Failed to authenticate to remote cluster %s: %v", c.Name, loadErr)
				continue
			}
			loadedCount++
		}
		log.Printf("Dynamically authenticated %d remote clusters from SQLite", loadedCount)

	} else if providerType == "swarm" {
		// Not refactoring Swarm for multi-machine yet, just keep existing mock
		_ = swarm.NewClient() 
		log.Println("Docker Swarm provider initialized")
	} else {
		log.Fatalf("unsupported provider: %s", providerType)
	}

	// 3. HTTP API Setup
	// NOTE: We pass kManager to the router now instead of the static Provider
	router := api.NewRouter(kManager)
	
	err = serveStaticFiles(router.(*chi.Mux), "dist")
	if err != nil {
		log.Printf("UI static files not found, serving API only (%v)", err)
	}

	srv := &http.Server{
		Addr:         addr,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 3. Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("server listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-quit
	log.Println("shutting down gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("shutdown error: %v", err)
	}
	log.Println("server stopped")
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	fmt.Printf("using default for %s=%s\n", key, fallback)
	return fallback
}

func serveStaticFiles(r *chi.Mux, publicDir string) error {
	workDir, _ := os.Getwd()
	filesDir := filepath.Join(workDir, publicDir)
	
	if _, err := os.Stat(filesDir); os.IsNotExist(err) {
		return err
	}

	fs := http.FileServer(http.Dir(filesDir))
	
	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		// If path doesn't exist, serve index.html (SPA routing)
		path := filepath.Join(filesDir, req.URL.Path)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			http.ServeFile(w, req, filepath.Join(filesDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, req)
	})

	log.Printf("Serving static assets from %s", filesDir)
	return nil
}
