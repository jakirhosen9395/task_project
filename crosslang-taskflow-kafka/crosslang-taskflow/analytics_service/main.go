package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/Shopify/sarama"
	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	db           *mongo.Database
	analyticsCache sync.Map // In-memory cache for analytics
)

type AnalyticsResponse struct {
	Username  string `json:"username"`
	Completed int    `json:"completed"`
	Pending   int    `json:"pending"`
}

type TodoEvent struct {
	EventType string      `json:"eventType"`
	Timestamp string      `json:"timestamp"`
	Data      interface{} `json:"data"`
}

type TodoData struct {
	ID          string `json:"_id"`
	Username    string `json:"username"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Completed   bool   `json:"completed"`
}

// Consumer Group Handler
type ConsumerGroupHandler struct{}

func (h *ConsumerGroupHandler) Setup(_ sarama.ConsumerGroupSession) error   { return nil }
func (h *ConsumerGroupHandler) Cleanup(_ sarama.ConsumerGroupSession) error { return nil }
func (h *ConsumerGroupHandler) ConsumeClaim(sess sarama.ConsumerGroupSession, claim sarama.ConsumerGroupClaim) error {
	for msg := range claim.Messages() {
		var todoEvent TodoEvent
		if err := json.Unmarshal(msg.Value, &todoEvent); err != nil {
			log.Printf("Error unmarshaling message: %v", err)
			continue
		}

		// Process the event
		go processTodoEvent(todoEvent)

		// Mark message as processed
		sess.MarkMessage(msg, "")
	}
	return nil
}

func processTodoEvent(event TodoEvent) {
	log.Printf("📥 Processing event: %s at %s", event.EventType, event.Timestamp)
	
	// Extract todo data
	todoDataBytes, _ := json.Marshal(event.Data)
	var todoData TodoData
	if err := json.Unmarshal(todoDataBytes, &todoData); err != nil {
		log.Printf("Error parsing todo data: %v", err)
		return
	}

	// Invalidate cache for this user to force refresh on next request
	analyticsCache.Delete(todoData.Username)
	
	log.Printf("✅ Processed %s event for user: %s", event.EventType, todoData.Username)
}

func startKafkaConsumer(kafkaBrokers string) {
	config := sarama.NewConfig()
	config.Version = sarama.V2_6_0_0
	config.Consumer.Group.Rebalance.Strategy = sarama.BalanceStrategyRoundRobin
	config.Consumer.Offsets.Initial = sarama.OffsetNewest
	config.Consumer.Group.Session.Timeout = 10 * time.Second
	config.Consumer.Group.Heartbeat.Interval = 3 * time.Second
	config.Consumer.Return.Errors = true

	// Retry connection with exponential backoff
	var consumerGroup sarama.ConsumerGroup
	var err error
	
	for retries := 0; retries < 5; retries++ {
		consumerGroup, err = sarama.NewConsumerGroup([]string{kafkaBrokers}, "analytics-service", config)
		if err == nil {
			log.Println("✅ Connected to Kafka consumer group")
			break
		}
		
		log.Printf("❌ Failed to connect to Kafka (attempt %d/5): %v", retries+1, err)
		time.Sleep(time.Duration(1<<retries) * time.Second) // Exponential backoff
	}
	
	if err != nil {
		log.Printf("❌ Failed to connect to Kafka after 5 attempts. Service will continue without Kafka consumer.")
		return
	}

	// Handle graceful shutdown
	sigterm := make(chan os.Signal, 1)
	signal.Notify(sigterm, syscall.SIGINT, syscall.SIGTERM)

	ctx, cancel := context.WithCancel(context.Background())
	wg := &sync.WaitGroup{}
	wg.Add(1)

	// Error handling goroutine
	go func() {
		for err := range consumerGroup.Errors() {
			log.Printf("❌ Consumer error: %v", err)
		}
	}()

	go func() {
		defer wg.Done()
		handler := &ConsumerGroupHandler{}
		
		for {
			if err := consumerGroup.Consume(ctx, []string{"todo-events"}, handler); err != nil {
				log.Printf("❌ Error from consumer: %v", err)
				
				// If it's a connection error, try to reconnect
				if ctx.Err() != nil {
					return
				}
				
				// Wait before retrying
				time.Sleep(5 * time.Second)
			}
			
			if ctx.Err() != nil {
				return
			}
		}
	}()

	log.Println("✅ Kafka consumer started")

	<-sigterm
	log.Println("🔄 Shutting down Kafka consumer...")
	cancel()
	wg.Wait()
	
	if err := consumerGroup.Close(); err != nil {
		log.Printf("Error closing consumer group: %v", err)
	}
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

func getAnalyticsFromDB(username string) (*AnalyticsResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	todosCollection := db.Collection("todos")

	completedCount, err := todosCollection.CountDocuments(ctx, bson.M{"username": username, "completed": true})
	if err != nil {
		return nil, err
	}

	pendingCount, err := todosCollection.CountDocuments(ctx, bson.M{"username": username, "completed": false})
	if err != nil {
		return nil, err
	}

	return &AnalyticsResponse{
		Username:  username,
		Completed: int(completedCount),
		Pending:   int(pendingCount),
	}, nil
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
	kafkaBrokers := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "kafka:29092"
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

	// Start Kafka consumer in a goroutine
	go startKafkaConsumer(kafkaBrokers)

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

	// Check cache first
	if cached, found := analyticsCache.Load(username); found {
		if analytics, ok := cached.(*AnalyticsResponse); ok {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("X-Cache", "HIT")
			json.NewEncoder(w).Encode(analytics)
			return
		}
	}

	// Get from database
	analytics, err := getAnalyticsFromDB(username)
	if err != nil {
		http.Error(w, "Error fetching analytics", http.StatusInternalServerError)
		return
	}

	// Cache the result
	analyticsCache.Store(username, analytics)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Cache", "MISS")
	json.NewEncoder(w).Encode(analytics)
}