'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WeeklyTrendsChartProps {
  data: Array<{
    day: string;
    present: number;
    late: number;
    absent: number;
  }>;
  range: 'day' | 'week' | 'month';
  onRangeChange: (range: 'day' | 'week' | 'month') => void;
}

export default function WeeklyTrendsChart({ data, range, onRangeChange }: WeeklyTrendsChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Weekly Attendance Trends</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onRangeChange('day')}
            className={`px-3 py-1 text-sm rounded ${
              range === 'day'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Day
          </button>
          <button
            onClick={() => onRangeChange('week')}
            className={`px-3 py-1 text-sm rounded ${
              range === 'week'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => onRangeChange('month')}
            className={`px-3 py-1 text-sm rounded ${
              range === 'month'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Month
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
          <Bar dataKey="late" stackId="a" fill="#f59e0b" name="Late" />
          <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}