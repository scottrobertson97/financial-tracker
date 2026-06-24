// src/components/SpendingChart.tsx

import React, { useEffect } from 'react';
import { Chart, registerables } from 'chart.js';
import { CardProps } from '../ui/Card'; // Assuming a UI component exists for wrapping
import { ChartDataItem } from '../features/dashboard/dashboardService';

// Register all chartable components to make them available globally within the scope of this module
Chart.register(...registerables);

interface SpendingChartProps extends React.ComponentProps<typeof Card> {
  data: ChartDataItem[]; // Array of { label: string, value: number }
}

const SpendingChart: React.FC<SpendingChartProps> = ({ data, className, ...props }) => {
  const chartRef = React.useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Check if we have enough data to render a meaningful chart
    if (!chartRef.current || data.length === 0) {
      return; // Do nothing if no canvas or no data
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) {
        console.error("Could not get rendering context for Chart.js.");
        return;
    }

    // 1. Destroy previous instance before drawing new one (CRITICAL FOR MEMORY LEAKS)
    const chartInstance = Chart.getChart(ctx); // Try to retrieve existing instance if any
    if (chartInstance) {
      chartInstance.destroy();
    }

    // 2. Create New Instance
    const labels = data.map((item) => item.label);
    const values = data.map((item) => item.value);

    // Using a Doughnut chart for clear visual proportion of spending
    const newChart = new Chart(ctx, {
      type: 'doughnut', // Appropriate for showing proportions (category distribution)
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Spent ($)',
          data: values,
          backgroundColor: [
            '#4a90e2', '#50e3c2', '#f5a623', '#d0021b', '#7ed321', // Basic color palette - better to map them programmatically
          ],
          hoverBackgroundColor: [
            '#3c7ac4', '#44b899', '#ce9e20', '#a60215', '#6dbe18',
          ],
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Allows the chart to scale correctly within its container
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'Spending by Category (Doughnut Chart)',
          }
        }
      }
    });

    // 3. Cleanup function: Destroy the chart instance when the component unmounts or dependencies change
    return () => {
      newChart.destroy();
    };
  }, [data]); // Re-run effect whenever 'data' prop changes (dependency tracking)


  return (
    <Card className={className} {...props}>
      <div style={{ height: 300, width: '100%' }}>
        <canvas ref={React.useRef<HTMLCanvasElement>(null)} />
      </div>
    </Card>
  );
};

export default SpendingChart;