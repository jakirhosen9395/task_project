# Auth Service (Python/Flask) — সেটআপ ও টেস্ট (Ubuntu)

**পোর্ট:** `8001`  
**ডাটাবেস:** MongoDB (`multi_lang_todo`)

## 1) নির্ভরতা (Dependencies)
- Python 3.12 (Ubuntu)
- `python3.12-venv`
- MongoDB চলমান (Docker)

## 2) MongoDB (Docker)
```bash
docker run -d --name mongo -p 27017:27017 -v mongo_data:/data/db mongo:6
```

## 3) এনভায়রনমেন্ট (.env)
```
MONGO_URI=mongodb://localhost:27017
DB_NAME=multi_lang_todo
JWT_SECRET=your_secret_key_here
JWT_EXPIRE_DAYS=7
```

## 4) ইনস্টল ও রান
```bash
sudo apt install python3.12-venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt --break-system-packages
python app.py
```

## 5) হেলথ ও টেস্ট
```bash
curl http://localhost:8001/health
curl -X POST http://localhost:8001/signup -H "Content-Type: application/json" -d '{"name":"Jakir","username":"jakir","email":"jakir@example.com","password":"123456"}'
curl -X POST http://localhost:8001/login  -H "Content-Type: application/json" -d '{"username":"jakir","password":"123456"}'
curl -X GET  http://localhost:8001/me -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## 6) ফ্লো (Flow)
```
/signup → users (bcrypt) → /login → JWT(sub=username) → /me
```
