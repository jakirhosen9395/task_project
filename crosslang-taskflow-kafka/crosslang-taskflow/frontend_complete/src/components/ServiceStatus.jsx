import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ServiceStatus({ analyticsStatus }) {
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);

  const services = [
    { 
      name: 'Auth Service', 
      url: `${import.meta.env.VITE_AUTH_URL}/health`,
      key: 'auth'
    },
    { 
      name: 'Todo Service', 
      url: `${import.meta.env.VITE_TODO_URL}/health`,
      key: 'todo'
    },
    { 
      name: 'Analytics Service', 
      url: `${import.meta.env.VITE_ANALYTICS_URL}/health`,
      key: 'analytics'
    },
  ];

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true);
      const newStatus = {};
      
      const promises = services.map(async (service) => {
        try {
          const res = await axios.get(service.url, {
            timeout: 5000 // 5 second timeout
          });
          
          const apiStatus = res.data?.status ? res.data.status.toLowerCase() : '';
          newStatus[service.key] = apiStatus === 'ok' ? 'green' : 'yellow';
        } catch (err) {
          console.error(`Error checking ${service.name}:`, err.message);
          newStatus[service.key] = 'red';
        }
      });

      await Promise.all(promises);
      setStatus(newStatus);
      setLoading(false);
    };

    // Initial fetch
    fetchStatus();
    
    // Set up interval to check every 10 seconds (reduced from 5 seconds for better performance)
    const interval = setInterval(fetchStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const getCircleColor = (serviceKey) => {
    if (loading) return 'bg-gray-300 animate-pulse';
    
    if (serviceKey === 'analytics') {
      // For Analytics Service: combine API health + data freshness
      if (status[serviceKey] === 'red') return 'bg-red-500'; // service down
      if (analyticsStatus === 'yellow') return 'bg-yellow-500'; // service up but data outdated
      if (analyticsStatus === 'green') return 'bg-green-500'; // service up and data fresh
      return 'bg-gray-400';
    }
    
    // For Auth & Todo services
    switch (status[serviceKey]) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (serviceKey) => {
    if (loading) return 'Checking...';
    
    if (serviceKey === 'analytics') {
      if (status[serviceKey] === 'red') return 'Service Down';
      if (analyticsStatus === 'yellow') return 'Data Outdated';
      if (analyticsStatus === 'green') return 'Healthy';
      return 'Unknown';
    }
    
    switch (status[serviceKey]) {
      case 'green': return 'Healthy';
      case 'yellow': return 'Warning';
      case 'red': return 'Down';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Service Status</h2>
      <div className="space-y-3">
        {services.map((service, index) => (
          <div key={service.key} className="flex items-center justify-between">
            <div className="flex items-center">
              <span 
                className={`w-4 h-4 rounded-full mr-3 ${getCircleColor(service.key)}`}
                title={getStatusText(service.key)}
              ></span>
              <span className="font-medium text-gray-700">{service.name}</span>
            </div>
            <span 
              className={`text-sm px-2 py-1 rounded ${
                getCircleColor(service.key).includes('green') ? 'bg-green-100 text-green-800' :
                getCircleColor(service.key).includes('yellow') ? 'bg-yellow-100 text-yellow-800' :
                getCircleColor(service.key).includes('red') ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}
            >
              {getStatusText(service.key)}
            </span>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-600 mb-2">Status Legend:</p>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            <span>Healthy</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></span>
            <span>Warning/Outdated</span>
          </div>
          <div className="flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
            <span>Down/Error</span>
          </div>
        </div>
      </div>
    </div>
  );
}