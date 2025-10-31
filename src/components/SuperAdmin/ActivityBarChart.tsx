import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ActivityDataPoint {
  date: string;
  new_students: number;
  new_staff: number;
  borrows: number;
  book_reports: number;
}

interface ChartProps {
  data: ActivityDataPoint[];
}

export function ActivityBarChart({ data }: ChartProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
      <h4 className="text-lg font-medium text-gray-900 mb-4">Activity Over Time</h4>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="new_students" fill="#8884d8" name="New Students" />
            <Bar dataKey="new_staff" fill="#82ca9d" name="New Staff" />
            <Bar dataKey="borrows" fill="#ffc658" name="Borrows" />
            <Bar dataKey="book_reports" fill="#ff7300" name="Book Reports" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
