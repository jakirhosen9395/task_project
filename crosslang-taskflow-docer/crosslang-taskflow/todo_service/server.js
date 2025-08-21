import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'multi_lang_todo';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const PORT = process.env.PORT || 8002;

let db;
async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✅ Connected to MongoDB: ${DB_NAME}`);
}
connectDB().catch(err => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});

// Middleware to verify JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid or expired token' });
    req.user = decoded;
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Todo Service' });
});

// Get all todos for user
app.get('/todos', verifyJWT, async (req, res) => {
  const todos = await db.collection('todos')
    .find({ username: req.user.sub })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(todos);
});

// Create new todo
app.post('/todos', verifyJWT, async (req, res) => {
  const { title, description, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const newTodo = {
    username: req.user.sub,
    title,
    description: description || '',
    dueDate: dueDate ? new Date(dueDate) : null,
    completed: false,
    createdAt: new Date()
  };
  const result = await db.collection('todos').insertOne(newTodo);
  res.status(201).json({ ...newTodo, _id: result.insertedId });
});

// Update todo (edit title/description/dueDate)
app.put('/todos/:id', verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate } = req.body;
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  const result = await db.collection('todos').findOneAndUpdate(
    { _id: new ObjectId(id), username: req.user.sub },
    { $set: updateData },
    { returnDocument: 'after' }
  );
  if (!result.value) return res.status(404).json({ error: 'Todo not found' });
  res.json(result.value);
});

// ✅ Update completed status (done / not done)
app.patch('/todos/:id/status', verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;

  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be true or false' });
  }

  const result = await db.collection('todos').findOneAndUpdate(
    { _id: new ObjectId(id), username: req.user.sub },
    { $set: { completed } },
    { returnDocument: 'after' }
  );

  if (!result.value) return res.status(404).json({ error: 'Todo not found' });
  res.json(result.value);
});

// Delete todo
app.delete('/todos/:id', verifyJWT, async (req, res) => {
  const { id } = req.params;
  const result = await db.collection('todos').deleteOne({ _id: new ObjectId(id), username: req.user.sub });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Todo not found' });
  res.json({ message: 'Todo deleted successfully' });
});

app.listen(PORT, () => {
  console.log(`🚀 Todo Service running on port ${PORT}`);
});
