import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceStatus from './ServiceStatus.jsx';
import TodoList from './TodoList.jsx';
import AnalyticsChart from './AnalyticsChart.jsx';

export default function Dashboard() {
  const username = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [analyticsStatus, setAnalyticsStatus] = useState("green");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!token || !username) {
      navigate('/');
    }
  }, [token, username, navigate]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${import.meta.env.VITE_ANALYTICS_URL}/analytics/${username}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Token expired, redirect to login
          localStorage.clear();
          navigate('/');
          return;
        }
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setAnalytics(data);
      setAnalyticsStatus("green");
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setError(error.message);
      setAnalyticsStatus("red");
    } finally {
      setLoading(false);
    }
  };

  const handleTodosChange = () => {
    setAnalyticsStatus("yellow"); // Data may be outdated
    // Auto-refresh analytics after a short delay to allow Kafka to process
    setTimeout(() => {
      fetchAnalytics();
    }, 1000);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (!token || !username) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="p-4 min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Welcome, {username}</h1>
          <p className="text-gray-600 mt-1">Manage your tasks and view analytics</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors duration-200 font-semibold"
        >
          Logout
        </button>
      </div>

      <ServiceStatus analyticsStatus={analyticsStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg shadow-md">
          <TodoList onTodosChange={handleTodosChange} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Analytics Dashboard</h2>
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className={`px-4 py-2 rounded-lg text-white font-semibold transition-colors duration-200 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {loading ? 'Loading...' : 'Refresh Analytics'}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Error:</strong> {error}
            </div>
          )}

          <AnalyticsChart data={analytics} />
        </div>
      </div>
    </div>
  );
}