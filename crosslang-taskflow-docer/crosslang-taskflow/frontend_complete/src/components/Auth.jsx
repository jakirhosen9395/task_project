import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/login' : '/signup';
      const res = await authAPI.post(endpoint, form);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.user.username);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      
      {/* Left Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-10 text-center">
        <h2 className="text-6xl font-extrabold text-gray-800 mb-6">CrossLang TaskFlow</h2>
        <p className="text-xl text-gray-700 leading-relaxed max-w-2xl mb-6">
          A powerful multi-service Todo Management Application built using <strong>Python</strong>, <strong>Node.js</strong>, and <strong>Go</strong>. 
          This project leverages <strong>MongoDB</strong> for database management and <strong>JWT</strong> for secure authentication. 
          Integrated with <strong>RabbitMQ</strong>, <strong>Memcached</strong>, and <strong>Kafka</strong> for advanced messaging, caching, 
          and streaming capabilities. Containerized and deployable with <strong>Docker</strong> for easy scaling and management.
        </p>
        <p className="italic text-gray-600 text-lg">Author: "hiddenclue0"</p>
      </div>

      {/* Divider - smaller height */}
      <div className="w-px bg-gray-400 self-center h-64"></div>

      {/* Right Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-10">
        <form 
          onSubmit={handleSubmit} 
          className="w-full max-w-sm"
        >
          <h2 className="text-3xl font-bold text-center mb-6 text-gray-700">
            {isLogin ? 'Login to Your Account' : 'Create a New Account'}
          </h2>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border border-gray-300 p-3 w-full rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border border-gray-300 p-3 w-full rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </>
          )}

          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="border border-gray-300 p-3 w-full rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {/* Password Input */}
          <div className="relative mb-6">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border border-gray-300 p-3 w-full rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <span
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>

          <button 
            type="submit" 
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-lg w-full font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
          >
            {isLogin ? 'Login' : 'Signup'}
          </button>

          <button
            type="button"
            className="mt-4 text-sm text-blue-600 cursor-pointer hover:underline block text-center"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'No account? Signup here' : 'Already have an account? Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
