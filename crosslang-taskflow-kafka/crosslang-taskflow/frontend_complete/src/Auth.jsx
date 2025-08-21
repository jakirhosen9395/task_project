import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true); // true = login, false = signup
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const payload = isLogin 
        ? { username: form.username, password: form.password }
        : form;

      const res = await authAPI.post(endpoint, payload);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.user.username);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || `${isLogin ? 'Login' : 'Signup'} failed`);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Welcome by hiddenclue0</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-80">
        <h2 className="text-xl font-bold mb-4">{isLogin ? 'Login' : 'Signup'}</h2>
        {error && <p className="text-red-500">{error}</p>}

        {!isLogin && (
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border p-2 w-full mb-4"
          />
        )}
        <input
          type="text"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          className="border p-2 w-full mb-4"
        />
        {!isLogin && (
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border p-2 w-full mb-4"
          />
        )}
        <input
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="border p-2 w-full mb-4"
        />

        <button type="submit" className={`px-4 py-2 rounded w-full ${isLogin ? 'bg-blue-500' : 'bg-green-500'} text-white`}>
          {isLogin ? 'Login' : 'Signup'}
        </button>

        <p className="mt-4 text-sm text-gray-600">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            type="button"
            className="text-blue-500 underline"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
          >
            {isLogin ? 'Signup' : 'Login'}
          </button>
        </p>
      </form>
    </div>
  );
}
