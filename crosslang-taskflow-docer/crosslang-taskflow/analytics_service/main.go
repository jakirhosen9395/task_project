package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var db *mongo.Database

type AnalyticsResponse struct {
	Username  string `json:"username"`
	Completed int    `json:"completed"`
	Pending   int    `json:"pending"`
}

// CORS Middleware - allow all origins
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow all origins
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Length")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using defaults")
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://mongodb:27017"
	}
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "multi_lang_todo"
	}
	port := os.Getenv("PORT")
	if port == "" {
		port = "8003"
	}

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal("MongoDB connection error:", err)
	}
	db = client.Database(dbName)
	fmt.Println("✅ Connected to MongoDB:", dbName)

	// Router
	r := mux.NewRouter()
	r.HandleFunc("/health", healthHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/analytics/{username}", analyticsHandler).Methods("GET", "OPTIONS")

	// Apply CORS middleware
	handler := enableCORS(r)

	fmt.Println("🚀 Analytics Service running on port", port)
	// Bind to 0.0.0.0 so accessible externally
	log.Fatal(http.ListenAndServe("0.0.0.0:"+port, handler))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"service": "Analytics Service",
	})
}

func analyticsHandler(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	username := vars["username"]

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	todosCollection := db.Collection("todos")

	completedCount, err := todosCollection.CountDocuments(ctx, bson.M{"username": username, "completed": true})
	if err != nil {
		http.Error(w, "Error fetching completed count", http.StatusInternalServerError)
		return
	}

	pendingCount, err := todosCollection.CountDocuments(ctx, bson.M{"username": username, "completed": false})
	if err != nil {
		http.Error(w, "Error fetching pending count", http.StatusInternalServerError)
		return
	}

	response := AnalyticsResponse{
		Username:  username,
		Completed: int(completedCount),
		Pending:   int(pendingCount),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
