# Analytics Service (Go) — সেটআপ ও টেস্ট (Ubuntu)

**পোর্ট:** `8003`  
**ডাটাবেস:** MongoDB (`multi_lang_todo`)

## 1) নির্ভরতা (Dependencies)
- Go (>=1.21)
- MongoDB চলমান (Docker)

## 2) MongoDB (Docker)
```bash
docker run -d --name mongo -p 27017:27017 -v mongo_data:/data/db mongo:6
```

## 3) এনভায়রনমেন্ট (.env)
```
MONGO_URI=mongodb://localhost:27017
DB_NAME=multi_lang_todo
PORT=8003
```

## 4) ইনস্টল ও রান
```bash
go mod tidy
go run main.go
```

## 5) টেস্ট
```bash
curl http://localhost:8003/health
curl http://localhost:8003/analytics/YOUR_USERNAME
```
