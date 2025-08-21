import React, { useState, useEffect } from 'react';
import { todoAPI } from '../api';

export default function TodoList({ onTodosChange }) {
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const res = await todoAPI.get('/todos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodos(res.data);
      setError('');
    } catch (err) {
      console.error('Error fetching todos:', err);
      setError('Failed to fetch todos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const addTodo = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setLoading(true);
      await todoAPI.post('/todos', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setForm({ title: '', description: '', dueDate: '' });
      await fetchTodos();
      onTodosChange && onTodosChange();
      setError('');
    } catch (err) {
      console.error('Error adding todo:', err);
      setError(err.response?.data?.error || 'Failed to add todo');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, completed) => {
    try {
      // Optimistic UI update
      setTodos(prev =>
        prev.map(todo =>
          todo._id === id ? { ...todo, completed: !completed } : todo
        )
      );

      // Notify parent component about change
      onTodosChange && onTodosChange();

      // Update via API (Kafka will handle analytics update)
      await todoAPI.patch(`/todos/${id}/status`,
        { completed: !completed },
        { headers: { Authorization: `Bearer ${token}` } }
      );

    } catch (err) {
      console.error('Error toggling todo status:', err);
      // Revert optimistic update on error
      setTodos(prev =>
        prev.map(todo =>
          todo._id === id ? { ...todo, completed: completed } : todo
        )
      );
      setError('Failed to update todo status');
    }
  };

  const deleteTodo = async (id) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) {
      return;
    }

    try {
      await todoAPI.delete(`/todos/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await fetchTodos();
      onTodosChange && onTodosChange();
      setError('');
    } catch (err) {
      console.error('Error deleting todo:', err);
      setError('Failed to delete todo');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Todo List</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Add Todo Form */}
      <form onSubmit={addTodo} className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Todo title *"
            className="border border-gray-300 p-3 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
            disabled={loading}
          />
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Description (optional)"
            className="border border-gray-300 p-3 rounded-lg flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={loading}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !form.title.trim()}
            className={`px-6 py-3 rounded-lg text-white font-semibold transition-colors duration-200 ${
              loading || !form.title.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {loading ? 'Adding...' : 'Add Todo'}
          </button>
        </div>
      </form>

      {/* Todo List */}
      {loading && todos.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading todos...</p>
        </div>
      ) : todos.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No todos yet. Add your first todo above!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {todos.map(todo => (
            <div
              key={todo._id}
              onClick={() => toggleStatus(todo._id, todo.completed)}
              className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                todo.completed
                  ? 'bg-gray-50 border-gray-200'
                  : isOverdue(todo.dueDate)
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center flex-1 min-w-0">
                <input
                  type="checkbox"
                  checked={todo.completed}
                  readOnly
                  className="mr-3 pointer-events-none h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${
                    todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {todo.title}
                    {isOverdue(todo.dueDate) && !todo.completed && (
                      <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                        Overdue
                      </span>
                    )}
                  </div>
                  {todo.description && (
                    <p className={`text-sm mt-1 ${
                      todo.completed ? 'line-through text-gray-400' : 'text-gray-600'
                    }`}>
                      {todo.description}
                    </p>
                  )}
                  {todo.dueDate && (
                    <p className={`text-xs mt-1 ${
                      todo.completed ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      Due: {formatDate(todo.dueDate)}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTodo(todo._id);
                }}
                className="ml-3 bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors duration-200"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total: {todos.length}</span>
          <span>Completed: {todos.filter(t => t.completed).length}</span>
          <span>Pending: {todos.filter(t => !t.completed).length}</span>
        </div>
      </div>
    </div>
  );
}