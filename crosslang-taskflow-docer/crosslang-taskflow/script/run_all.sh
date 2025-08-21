#!/bin/bash
# ==========================================
# CrossLang TaskFlow Project - Docker Runner
# ==========================================
# Steps:
# 1. Stop & remove old containers/images
# 2. Build new docker images
# 3. Run all services (MongoDB, Auth, Todo, Analytics, Frontend)
# 4. Health check for all services
# ==========================================

# Function: health check
check_health() {
  NAME=$1
  URL=$2
  echo "🔎 Checking $NAME at $URL ..."
  if curl -s --head --request GET $URL | grep "200 OK" > /dev/null; then
     echo "✅ $NAME is healthy!"
  else
     echo "❌ $NAME is NOT healthy (check logs)."
  fi
}

echo "🔍 Removing old containers (if any)..."
docker rm -f mongodb auth_service todo_service analytics_service frontend 2>/dev/null || true

echo "🧹 Cleaning old images (if any)..."
docker rmi -f auth_service:latest todo_service:latest analytics_service:latest frontend:latest 2>/dev/null || true

# MongoDB
echo "🚀 Starting MongoDB..."
docker run -d --name mongodb -p 27017:27017 -v mongo_data:/data/db mongo:6

# Auth Service
echo "📦 Building Auth Service..."
cd auth_service || exit
docker build -t auth_service:latest .
docker run -d --name auth_service --link mongodb:mongodb -p 8001:8001 \
  -e MONGO_URI=mongodb://mongodb:27017 \
  -e DB_NAME=multi_lang_todo \
  -e JWT_SECRET=your_secret_key_here \
  auth_service:latest
cd ..

# Todo Service
echo "📦 Building Todo Service..."
cd todo_service || exit
docker build -t todo_service:latest .
docker run -d --name todo_service --link mongodb:mongodb -p 8002:8002 todo_service:latest
cd ..

# Analytics Service
echo "📦 Building Analytics Service..."
cd analytics_service || exit
docker build -t analytics_service:latest .
docker run -d --name analytics_service --link mongodb:mongodb -p 8003:8003 analytics_service:latest
cd ..

# Frontend
echo "🌐 Building Frontend..."
cd frontend_complete || exit
docker build -t frontend:latest .
docker run -d --name frontend -p 80:80 frontend:latest
cd ..

echo "✅ All services are up and running!"
docker ps

echo ""
echo "👉 Access points:"
echo "   - Auth Service:       http://localhost:8001"
echo "   - Todo Service:       http://localhost:8002"
echo "   - Analytics Service:  http://localhost:8003"
echo ""

# =======================
# Health Check Section
# =======================
sleep 5   # give containers few seconds to boot up

check_health "Auth Service" http://localhost:8001/health
check_health "Todo Service" http://localhost:8002/health
check_health "Analytics Service" http://localhost:8003/health
check_health "Frontend" http://localhost/health

echo " Access the application at:"
echo "   - Frontend (Nginx):   http://localhost"  