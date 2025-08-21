import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ServiceStatus from './ServiceStatus.jsx';
import TodoList from './TodoList.jsx';
import AnalyticsChart from './AnalyticsChart.jsx';

export default function Dashboard() {
  const username = localStorage.getItem('username');
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [analyticsStatus, setAnalyticsStatus] = useState("green"); // ✅ login e default green

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`http://localhost:8003/analytics/${username}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        // Service down hole red
        setAnalyticsStatus("red");
        return;
      }

      const data = await res.json();
      setAnalytics(data);
      setAnalyticsStatus("green"); // ✅ Data update hole green
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setAnalyticsStatus("red"); // API error hole red
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Welcome, {username}</h1>
        <button
          onClick={() => {
            localStorage.clear();
            navigate('/');
          }}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Logout
        </button>
      </div>

      {/* ✅ analyticsStatus prop pathano */}
      <ServiceStatus analyticsStatus={analyticsStatus} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* ✅ TodoList e prop pathano jate list change hole yellow hoy */}
        <TodoList onTodosChange={() => setAnalyticsStatus("yellow")} />

        <div>
          <button
            onClick={fetchAnalytics}
            className="bg-green-500 px-4 py-2 rounded text-white mb-2"
          >
            Show Analytics
          </button>

          <AnalyticsChart data={analytics} />
        </div>
      </div>
    </div>
  );
}
