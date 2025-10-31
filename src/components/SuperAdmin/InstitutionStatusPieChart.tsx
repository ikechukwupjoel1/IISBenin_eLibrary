import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10B981', '#EF4444']; // Green for Active, Red for Suspended

interface ChartProps {
  active: number;
  suspended: number;
}

export function InstitutionStatusPieChart({ active, suspended }: ChartProps) {
  const data = [
    { name: 'Active', value: active },
    { name: 'Suspended', value: suspended },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow h-full flex flex-col">
      <h4 className="text-lg font-medium text-gray-900 mb-4">Institution Status</h4>
      <div className="flex-grow">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, 'Institutions']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
