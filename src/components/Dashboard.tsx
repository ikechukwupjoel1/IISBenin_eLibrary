import React, { useEffect, useState } from 'react';
import { BookOpen, Users, BookMarked, AlertCircle, UserCog } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackgroundCarousel from './BackgroundCarousel';
import schoolLogo from '../assets/Iisbenin logo.png';

type Stats = {
  totalBooks: number;
  borrowedBooks: number;
  totalStudents: number;
  totalStaff: number;
  overdueBooks: number;
};

type StudentReadingData = {
  student_id: string;
  student_name: string;
  books_read: number;
};

export function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    borrowedBooks: 0,
    totalStudents: 0,
    totalStaff: 0,
    overdueBooks: 0,
  });
  const [studentReadingData, setStudentReadingData] = useState<StudentReadingData[]>([]);
  const [debugStaffResult, setDebugStaffResult] = useState<any>(null);

  useEffect(() => {
    loadStats();
    loadStudentReadingData();
  }, []);

  const loadStats = async () => {
    const [booksResult, studentsResult, staffResult, borrowedResult, overdueResult] = await Promise.all([
      supabase.from('books').select('id', { count: 'exact', head: true }),
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.from('staff').select('id', { count: 'exact', head: true }),
      supabase.from('books').select('id', { count: 'exact', head: true }).eq('status', 'borrowed'),
      supabase.from('borrow_records').select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('due_date', new Date().toISOString()),
    ]);

    setDebugStaffResult(staffResult); // Set debug state

    // Debug logging to inspect raw query results and any errors
    console.log('Dashboard loadStats results:', {
      booksResult,
      studentsResult,
      staffResult,
      borrowedResult,
      overdueResult,
    });
    console.log('staffResult details:', staffResult);

    setStats({
      totalBooks: booksResult.count || 0,
      borrowedBooks: borrowedResult.count || 0,
      totalStudents: studentsResult.count || 0,
      totalStaff: staffResult.count || 0,
      overdueBooks: overdueResult.count || 0,
    });
  };

  const loadStudentReadingData = async () => {
    const { data: borrowRecords, error } = await supabase
      .from('borrow_records')
      .select(`
        student_id,
        students (
          name
        )
      `)
      .eq('status', 'completed');

    if (error || !borrowRecords) {
      return;
    }

    const studentMap = new Map<string, { name: string; count: number }>();

    borrowRecords.forEach((record: any) => {
      if (record.student_id && record.students) {
        const existing = studentMap.get(record.student_id);
        if (existing) {
          existing.count++;
        } else {
          studentMap.set(record.student_id, {
            name: record.students.name,
            count: 1,
          });
        }
      }
    });

    const readingData: StudentReadingData[] = Array.from(studentMap.entries())
      .map(([id, data]) => ({
        student_id: id,
        student_name: data.name,
        books_read: data.count,
      }))
      .sort((a, b) => b.books_read - a.books_read)
      .slice(0, 10);

    setStudentReadingData(readingData);
  };

  const statCards = [
    {
      title: 'Total Books',
      value: stats.totalBooks,
      icon: BookOpen,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Borrowed Books',
      value: stats.borrowedBooks,
      icon: BookMarked,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'bg-slate-500',
      bgColor: 'bg-slate-50',
    },
    {
      title: 'Total Staff',
      value: stats.totalStaff,
      icon: UserCog,
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
    },
    {
      title: 'Overdue Books',
      value: stats.overdueBooks,
      icon: AlertCircle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
    },
  ];

  const maxBooksRead = Math.max(...studentReadingData.map(s => s.books_read), 1);

  return (
    <div className="relative min-h-screen">
      <BackgroundCarousel />
      <div className="relative z-10 space-y-6 p-6">
        <div className="flex items-center gap-4 mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
          <img src={schoolLogo} alt="IISBenin Logo" className="w-16 h-16 object-contain" />
          <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
        </div>
        {debugStaffResult && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
            <p className="font-bold">Debug Staff Result:</p>
            <pre>{JSON.stringify(debugStaffResult, null, 2)}</pre>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="bg-white/95 backdrop-blur-sm rounded-xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm font-medium mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookMarked className="h-6 w-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">Top Reading Students</h3>
          </div>

          {studentReadingData.length > 0 ? (
            <div className="space-y-4">
              {studentReadingData.map((student, index) => (
                <div key={student.student_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900">{student.student_name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {student.books_read} {student.books_read === 1 ? 'book' : 'books'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(student.books_read / maxBooksRead) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No reading data yet</p>
              <p className="text-sm mt-1">Students' reading activity will appear here once they complete borrowing books</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
