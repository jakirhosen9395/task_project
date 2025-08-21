import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ServiceStatus({ analyticsStatus }) {
  const [status, setStatus] = useState({});

  const services = [
    { name: 'Auth Service', url: import.meta.env.VITE_AUTH_URL + '/health' },
    { name: 'Todo Service', url: import.meta.env.VITE_TODO_URL + '/health' },
    { name: 'Analytics Service', url: import.meta.env.VITE_ANALYTICS_URL + '/health' },
  ];

  useEffect(() => {
    const fetchStatus = async () => {
      let s = {};
      for (let service of services) {
        try {
          const res = await axios.get(service.url);
          const apiStatus = res.data.status ? res.data.status.toLowerCase() : '';
          s[service.name] = apiStatus === 'ok' ? 'green' : 'yellow';
        } catch (err) {
          console.error(`Error checking ${service.name}:`, err.message);
          s[service.name] = 'red';
        }
      }
      setStatus(s);
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getCircleColor = (serviceName) => {
    if (serviceName === 'Analytics Service') {
      // Combine API service health + data freshness
      if (status[serviceName] === 'red') return 'bg-red-500'; // service down
      if (analyticsStatus === 'yellow') return 'bg-yellow-500'; // service up but data outdated
      if (analyticsStatus === 'green') return 'bg-green-500'; // service up and data up-to-date
      return 'bg-gray-400';
    }
    // For Auth & Todo services
    if (status[serviceName] === 'green') return 'bg-green-500';
    if (status[serviceName] === 'yellow') return 'bg-yellow-500';
    if (status[serviceName] === 'red') return 'bg-red-500';
    return 'bg-gray-400';
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-bold mb-2">Service Status</h2>
      <ul>
        {services.map(s => (
          <li key={s.name} className="flex items-center mb-1">
            <span className={`w-3 h-3 rounded-full mr-2 ${getCircleColor(s.name)}`}></span>
            <span>{s.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
