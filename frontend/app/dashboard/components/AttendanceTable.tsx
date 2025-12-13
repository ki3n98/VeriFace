'use client';

import { useState } from 'react';

interface AttendanceRecord {
  id: number;
  studentName: string;
  studentId: string;
  class: string;
  checkInTime: string;
  status: 'on_time' | 'late' | 'absent' | 'excused';
  faceMatch: number | null;
  avatar: string;
}

interface AttendanceTableProps {
  data: AttendanceRecord[];
  onStatusUpdate: (id: number, newStatus: string) => void;
}

export default function AttendanceTable({ data, onStatusUpdate }: AttendanceTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const statusOptions = [
    { value: 'on_time', label: 'On Time', color: 'bg-green-100 text-green-800' },
    { value: 'late', label: 'Late', color: 'bg-orange-100 text-orange-800' },
    { value: 'absent', label: 'Absent', color: 'bg-red-100 text-red-800' },
    { value: 'excused', label: 'Excused', color: 'bg-gray-100 text-gray-800' },
  ];

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0;
    
    const aValue = a[sortConfig.key as keyof AttendanceRecord];
    const bValue = b[sortConfig.key as keyof AttendanceRecord];
    
    // Handle null values
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const filteredData = sortedData.filter(item => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesSearch = 
      item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${option?.color || 'bg-gray-100 text-gray-800'}`}>
        {option?.label || status}
      </span>
    );
  };

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg flex-1 max-w-md"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="all">All Statuses</option>
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('studentName')}
              >
                Student {sortConfig?.key === 'studentName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('studentId')}
              >
                Student ID {sortConfig?.key === 'studentId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Class
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('checkInTime')}
              >
                Check-in Time {sortConfig?.key === 'checkInTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('status')}
              >
                Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('faceMatch')}
              >
                Face Match {sortConfig?.key === 'faceMatch' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {record.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                      <div className="text-xs text-gray-500">{record.studentId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.studentId}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.class}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.checkInTime}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <select
                    value={record.status}
                    onChange={(e) => onStatusUpdate(record.id, e.target.value)}
                    className="text-sm border-0 bg-transparent focus:outline-none focus:ring-0 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {statusOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {record.faceMatch !== null ? (
                    <span className={record.faceMatch >= 95 ? 'text-green-600' : 'text-orange-600'}>
                      {record.faceMatch.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No attendance records found
          </div>
        )}
      </div>
    </div>
  );
}