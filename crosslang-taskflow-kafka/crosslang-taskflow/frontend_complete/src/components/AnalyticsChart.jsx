import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function AnalyticsChart({ data }) {
  if (!data) {
    return (
      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-bold mb-2">Analytics</h2>
        <div className="text-gray-500 text-center py-10">
          Click "Show Analytics" to view data
        </div>
      </div>
    );
  }

  const chartData = {
    labels: ['Completed', 'Pending'],
    datasets: [
      {
        data: [data.completed || 0, data.pending || 0],
        backgroundColor: ['#4caf50', '#f44336'],
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        align: 'start',
        labels: {
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label, i) => {
              const value = datasets[0].data[i];
              return {
                text: `${label}: ${value}`,
                fillStyle: datasets[0].backgroundColor[i],
                strokeStyle: datasets[0].backgroundColor[i],
                lineWidth: 1,
                hidden: false,
                index: i
              };
            });
          }
        }
      }
    }
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-lg font-bold mb-2">Analytics</h2>
      <div style={{ width: '250px', height: '250px', margin: '0 auto' }}>
        <Pie data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
