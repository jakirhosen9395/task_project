#!/bin/bash
# ==========================================
# CrossLang TaskFlow Project - Docker Cleaner (Safe Order)
# ==========================================
# Stop & remove containers in order:
# 1. Frontend
# 2. Backend services (Auth, Todo, Analytics)
# 3. Database (MongoDB)
# ==========================================

echo "🛑 Stopping and removing containers in order..."

# 1. Frontend
docker rm -f frontend 2>/dev/null || true

# 2. Backend services
docker rm -f auth_service todo_service analytics_service 2>/dev/null || true

# 3. Database
docker rm -f mongodb 2>/dev/null || true

echo "🧹 Removing docker images..."
docker rmi -f frontend:latest auth_service:latest todo_service:latest analytics_service:latest mongo:6 2>/dev/null || true

echo "ℹ️ MongoDB data volume (mongo_data) preserved (not deleted)."
echo "✅ Cleanup finished! Containers removed in correct order, images cleaned, DB data safe."

# Status
echo ""
docker ps -a
docker images
docker volume ls | grep mongo_data || true
