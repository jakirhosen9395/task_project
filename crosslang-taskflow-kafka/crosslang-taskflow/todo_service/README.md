# Todo Service (Node/Express) — সেটআপ ও টেস্ট (Ubuntu)

**পোর্ট:** `8002`  
**ডাটাবেস:** MongoDB (`multi_lang_todo`)

## 1) নির্ভরতা (Dependencies)
- Node.js + npm
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
PORT=8002
```

## 4) ইনস্টল ও রান
```bash
npm install
npm start
```

## 5) টেস্ট ফ্লো
# Auth token (from Auth Service), then:
**Create**
```bash
curl -X POST http://localhost:8002/todos -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN_HERE" -d '{"title":"Buy groceries","description":"Milk, eggs, bread","dueDate":"2025-08-20"}'
```
**List**
```bash
curl -X GET  http://localhost:8002/todos -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
**Edit/Complete**
```bash
curl -X PUT http://localhost:8002/todos/TODO_ID_HERE -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN_HERE" -d '{"title":"Buy vegetables","description":"Potato, onion, tomato","completed":true}'
```
**Delete**
```bash
curl -X DELETE http://localhost:8002/todos/TODO_ID_HERE -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

> নোট: যদি আপনার সার্ভারে `PATCH /todos/:id/status` ইমপ্লিমেন্ট থাকে, তাহলে তা-ও ব্যবহার করতে পারেন।
