import React, { useState, useEffect } from 'react';
import { todoAPI } from '../api';

export default function TodoList({ onTodosChange }) { 
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState({ title: '', description: '' });
  const token = localStorage.getItem('token');

  const fetchTodos = async () => {
    const res = await todoAPI.get('/todos', { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    setTodos(res.data);
  };

  useEffect(() => { fetchTodos(); }, []);

  const addTodo = async () => {
    await todoAPI.post('/todos', form, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    setForm({ title: '', description: '' });
    fetchTodos();
    onTodosChange && onTodosChange();
  };

  const toggleStatus = async (id, completed) => {
    onTodosChange && onTodosChange();

    // Instant UI update
    setTodos(prev =>
      prev.map(todo =>
        todo._id === id ? { ...todo, completed: !completed } : todo
      )
    );

    // Update Todo Service
    await todoAPI.patch(`/todos/${id}/status`, 
      { completed: !completed }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // Notify Analytics Service
    await fetch(`http://localhost:8003/analytics/todo-status-change`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ todoId: id, completed: !completed })
    });
  };

  const deleteTodo = async (id) => {
    await todoAPI.delete(`/todos/${id}`, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
    fetchTodos();
    onTodosChange && onTodosChange();
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-bold mb-2">Todo List</h2>
      <div className="flex mb-4">
        <input 
          value={form.title} 
          onChange={(e) => setForm({ ...form, title: e.target.value })} 
          placeholder="Title" 
          className="border p-2 mr-2 flex-1"
        />
        <input 
          value={form.description} 
          onChange={(e) => setForm({ ...form, description: e.target.value })} 
          placeholder="Description" 
          className="border p-2 mr-2 flex-1"
        />
        <button onClick={addTodo} className="bg-blue-500 text-white px-4 py-2 rounded">
          Add
        </button>
      </div>
      <ul>
        {todos.map(todo => (
          <li 
            key={todo._id} 
            onClick={() => toggleStatus(todo._id, todo.completed)} // পুরো আইটেমে ক্লিক
            className={`flex justify-between items-center border-b py-2 bg-white cursor-pointer ${
              todo.completed ? "line-through text-gray-500" : "text-black"
            }`}
          >
            <div className="flex items-center">
              <input 
                type="checkbox" 
                checked={todo.completed} 
                readOnly // চেকবক্স আলাদা ইভেন্ট নেবে না
                className="mr-2 pointer-events-none"
              />
              <strong>{todo.title}</strong> - {todo.description}
            </div>
            <button 
              onClick={(e) => { 
                e.stopPropagation(); // ডিলিটে ক্লিক করলে টগল হবে না
                deleteTodo(todo._id);
              }} 
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
