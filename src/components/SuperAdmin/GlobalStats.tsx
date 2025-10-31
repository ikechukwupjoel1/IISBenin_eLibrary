import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Building, Users, BookOpen, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';

type GlobalStatsData = {
  institutions: number;
  students: number;
  staff: number;
  books: number;
};

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: number, icon: React.ElementType, color: string }) => (
  <div className="bg-white p-6 rounded-lg shadow">
    <div className="flex items-center">
      <div className={`p-3 rounded-full mr-4 ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

export function GlobalStats() {
  const [stats, setStats] = useState<GlobalStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_global_stats');

        if (error) throw error;

        // The RPC returns a single JSON object with all the counts
        setStats(data);

      } catch (error) {
        console.error("Error fetching global stats:", error);
        toast.error("Could not load platform statistics.");
      }
      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading || !stats) {
    return <div>Loading global stats...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Institutions" value={stats.institutions} icon={Building} color="bg-blue-500" />
        <StatCard title="Total Students" value={stats.students} icon={Users} color="bg-green-500" />
        <StatCard title="Total Staff" value={stats.staff} icon={UserCog} color="bg-yellow-500" />
        <StatCard title="Total Books" value={stats.books} icon={BookOpen} color="bg-indigo-500" />
      </div>
    </div>
  );
}
