'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface TodayDistributionChartProps {
  data: {
    present: number;
    late: number;
    absent: number;
  };
  onSegmentClick: (status: string | null) => void;
}

const COLORS = {
  present: '#10b981',
  late: '#f59e0b',
  absent: '#ef4444',
};

export default function TodayDistributionChart({ data, onSegmentClick }: TodayDistributionChartProps) {
  const total = data.present + data.late + data.absent;
  
  const chartData = [
    { name: 'Present', value: data.present, percentage: ((data.present / total) * 100).toFixed(1) },
    { name: 'Late', value: data.late, percentage: ((data.late / total) * 100).toFixed(1) },
    { name: 'Absent', value: data.absent, percentage: ((data.absent / total) * 100).toFixed(1) },
  ];

  const statusMap: Record<string, string> = {
    'Present': 'on_time',
    'Late': 'late',
    'Absent': 'absent',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }) => `${name}: ${value} (${percent! * 100}%)`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            onClick={(entry) => onSegmentClick(statusMap[entry.name] || null)}
            style={{ cursor: 'pointer' }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}