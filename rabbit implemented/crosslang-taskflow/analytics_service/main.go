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
	amqp "github.com/rabbitmq/amqp091-go"
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

type TodoEvent struct {
	Event     string                 `json:"event"`
	Data      map[string]interface{} `json:"data"`
	Timestamp string                 `json:"timestamp"`
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
	rabbitMQURL := os.Getenv("RABBITMQ_URL")
	if rabbitMQURL == "" {
		rabbitMQURL = "amqp://guest:guest@rabbitmq:5672/"
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

	// Start RabbitMQ consumer in a goroutine
	go startRabbitMQConsumer(rabbitMQURL)

	// Router
	r := mux.NewRouter()
	r.HandleFunc("/health", healthHandler).Methods("GET", "OPTIONS")
	r.HandleFunc("/analytics/{username}", analyticsHandler).Methods("GET", "OPTIONS")

	// Apply CORS middleware
	handler := enableCORS(r)

	fmt.Println("🚀 Analytics Service running on port", port)
	log.Fatal(http.ListenAndServe("0.0.0.0:"+port, handler))
}

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
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

	// Get completed todos count
	completedCount, err := db.Collection("todos").CountDocuments(ctx, bson.M{
		"username":  username,
		"completed": true,
	})
	if err != nil {
		http.Error(w, "Error fetching completed todos", http.StatusInternalServerError)
		return
	}

	// Get pending todos count
	pendingCount, err := db.Collection("todos").CountDocuments(ctx, bson.M{
		"username":  username,
		"completed": false,
	})
	if err != nil {
		http.Error(w, "Error fetching pending todos", http.StatusInternalServerError)
		return
	}

	// Prepare response
	response := AnalyticsResponse{
		Username:  username,
		Completed: int(completedCount),
		Pending:   int(pendingCount),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func startRabbitMQConsumer(rabbitMQURL string) {
	// Connect to RabbitMQ
	conn, err := amqp.Dial(rabbitMQURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open a channel: %v", err)
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"todo_events", // name
		true,          // durable
		false,         // delete when unused
		false,         // exclusive
		false,         // no-wait
		nil,           // arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare a queue: %v", err)
	}

	msgs, err := ch.Consume(
		q.Name, // queue
		"",     // consumer
		true,   // auto-ack
		false,  // exclusive
		false,  // no-local
		false,  // no-wait
		nil,    // args
	)
	if err != nil {
		log.Fatalf("Failed to register a consumer: %v", err)
	}

	log.Println("RabbitMQ consumer started. Waiting for messages...")

	for d := range msgs {
		var event TodoEvent
		if err := json.Unmarshal(d.Body, &event); err != nil {
			log.Printf("Error decoding message: %v", err)
			continue
		}

		log.Printf("Received event: %s", event.Event)
		log.Printf("Data: %+v", event.Data)
		log.Printf("Timestamp: %s", event.Timestamp)

		// Process the event
		if err := processEvent(event); err != nil {
			log.Printf("Error processing event: %v", err)
		}
	}
}

func processEvent(event TodoEvent) error {
	username, ok := event.Data["username"].(string)
	if !ok {
		return fmt.Errorf("invalid username in event data")
	}

	switch event.Event {
	case "todo_created":
		log.Printf("New todo created by %s", username)
	case "todo_updated":
		log.Printf("Todo updated by %s", username)
	case "todo_status_changed":
		completed, ok := event.Data["completed"].(bool)
		if !ok {
			return fmt.Errorf("invalid completed status in event data")
		}
		log.Printf("Todo status changed to %v by %s", completed, username)
	case "todo_deleted":
		log.Printf("Todo deleted by %s", username)
	default:
		log.Printf("Unknown event type: %s", event.Event)
	}

	return nil
}
