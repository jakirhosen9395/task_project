import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import { Kafka } from 'kafkajs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'multi_lang_todo';
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const PORT = process.env.PORT || 8002;
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || 'kafka:29092';

// Initialize Kafka
const kafka = new Kafka({
  clientId: 'todo-service',
  brokers: [KAFKA_BROKERS],
});

const producer = kafka.producer();
let db;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✅ Connected to MongoDB: ${DB_NAME}`);
}

async function connectKafka() {
  let retries = 5;
  
  while (retries > 0) {
    try {
      await producer.connect();
      console.log('✅ Connected to Kafka');
      return;
    } catch (error) {
      console.error(`❌ Kafka connection attempt failed (${6 - retries}/5):`, error.message);
      retries--;
      
      if (retries === 0) {
        console.error('❌ Failed to connect to Kafka after 5 attempts. Service will continue without Kafka.');
        return;
      }
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, 5 - retries) * 1000));
    }
  }
}

// Initialize connections
connectDB().catch(err => {
  console.error("❌ MongoDB connection error:", err);
  process.exit(1);
});

// Connect to Kafka with retries (don't exit on failure)
connectKafka();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🔄 Gracefully shutting down...');
  try {
    await producer.disconnect();
  } catch (error) {
    console.error('Error disconnecting Kafka producer:', error);
  }
  process.exit(0);
});

// Kafka producer function with connection check
async function publishTodoEvent(eventType, todoData) {
  try {
    // Check if producer is connected before sending
    if (!producer) {
      console.log('⚠️ Kafka producer not initialized, skipping event publication');
      return;
    }

    await producer.send({
      topic: 'todo-events',
      messages: [
        {
          key: todoData.username,
          value: JSON.stringify({
            eventType,
            timestamp: new Date().toISOString(),
            data: todoData
          }),
        },
      ],
    });
    console.log(`📤 Published ${eventType} event for user: ${todoData.username}`);
  } catch (error) {
    console.error('❌ Error publishing to Kafka:', error.message);
    
    // Try to reconnect if the producer is disconnected
    if (error.message.includes('disconnected')) {
      console.log('🔄 Attempting to reconnect to Kafka...');
      connectKafka();
    }
  }
}

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
  
  try {
    const result = await db.collection('todos').insertOne(newTodo);
    const todoWithId = { ...newTodo, _id: result.insertedId };
    
    // Publish todo created event to Kafka
    await publishTodoEvent('TODO_CREATED', todoWithId);
    
    res.status(201).json(todoWithId);
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// Update todo (edit title/description/dueDate)
app.put('/todos/:id', verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { title, description, dueDate } = req.body;
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

  try {
    const result = await db.collection('todos').findOneAndUpdate(
      { _id: new ObjectId(id), username: req.user.sub },
      { $set: updateData },
      { returnDocument: 'after' }
    );
    
    if (!result.value) return res.status(404).json({ error: 'Todo not found' });
    
    // Publish todo updated event to Kafka
    await publishTodoEvent('TODO_UPDATED', result.value);
    
    res.json(result.value);
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// ✅ Update completed status (done / not done)
app.patch('/todos/:id/status', verifyJWT, async (req, res) => {
  const { id } = req.params;
  const { completed } = req.body;
  
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'completed must be true or false' });
  }
  
  try {
    const result = await db.collection('todos').findOneAndUpdate(
      { _id: new ObjectId(id), username: req.user.sub },
      { $set: { completed } },
      { returnDocument: 'after' }
    );
    
    if (!result.value) return res.status(404).json({ error: 'Todo not found' });
    
    // Publish todo status changed event to Kafka
    const eventType = completed ? 'TODO_COMPLETED' : 'TODO_UNCOMPLETED';
    await publishTodoEvent(eventType, result.value);
    
    res.json(result.value);
  } catch (error) {
    console.error('Error updating todo status:', error);
    res.status(500).json({ error: 'Failed to update todo status' });
  }
});

// Delete todo
app.delete('/todos/:id', verifyJWT, async (req, res) => {
  const { id } = req.params;
  
  try {
    // First get the todo to publish the event
    const todo = await db.collection('todos').findOne({ 
      _id: new ObjectId(id), 
      username: req.user.sub 
    });
    
    if (!todo) return res.status(404).json({ error: 'Todo not found' });
    
    const result = await db.collection('todos').deleteOne({ 
      _id: new ObjectId(id), 
      username: req.user.sub 
    });
    
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Todo not found' });
    
    // Publish todo deleted event to Kafka
    await publishTodoEvent('TODO_DELETED', todo);
    
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Todo Service running on port ${PORT}`);
});