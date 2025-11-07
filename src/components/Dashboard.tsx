import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { BookOpen, Users, BookMarked, AlertCircle, UserCog, FileText, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import BackgroundCarousel from './BackgroundCarousel';
import schoolLogo from '../assets/Iisbenin logo.png';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { QuoteOfTheDay } from './QuoteOfTheDay';
import { ReadingProgress } from './ReadingProgress';
import ReadingStreaks from './ReadingStreaks';
import WaitingList from './WaitingList';
import { BookRecommendations } from './BookRecommendations';

type Stats = {
  totalBooks: number;
  borrowedBooks: number;
  totalStudents: number;
  totalStaff: number;
  overdueBooks: number;
  pendingReports: number;
};

type StudentReadingData = {
  student_id: string;
  student_name: string;
  books_read: number;
};

type StaffReadingData = {
  staff_id: string;
  staff_name: string;
  books_read: number;
};

// Type for Supabase query response
type BorrowRecordWithStudent = {
  student_id: string | null;
  students: { name: string } | null;
};

export function Dashboard() {
  const { profile, institution } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    borrowedBooks: 0,
    totalStudents: 0,
    totalStaff: 0,
    overdueBooks: 0,
    pendingReports: 0,
  });
  const [studentReadingData, setStudentReadingData] = useState<StudentReadingData[]>([]);
  const [staffReadingData, setStaffReadingData] = useState<StaffReadingData[]>([]);

  const loadStats = useCallback(async () => {
    if (!profile?.institution_id) {
      setLoading(false);
      return; // Do not load stats if no institution is found
    }

    try {
      // For students, filter overdue books by their student_id
      let overdueQuery = supabase.from('borrow_records').select('id', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('institution_id', profile.institution_id)
        .lt('due_date', new Date().toISOString());

      if (profile?.role === 'student' && profile?.student_id) {
        overdueQuery = overdueQuery.eq('student_id', profile.student_id);
      }

      // Get pending reports count for librarians/staff
      const pendingReportsQuery = (profile?.role === 'librarian' || profile?.role === 'staff')
        ? supabase.from('book_reports').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('institution_id', profile.institution_id)
        : Promise.resolve({ count: 0 });

      const [booksResult, studentsResult, staffResult, borrowedResult, overdueResult, reportsResult] = await Promise.all([
        supabase.from('books').select('id', { count: 'exact', head: true }).eq('institution_id', profile.institution_id),
        supabase.from('students').select('id', { count: 'exact', head: true }).eq('institution_id', profile.institution_id),
        supabase.from('staff').select('id', { count: 'exact', head: true }).eq('institution_id', profile.institution_id),
        supabase.from('books').select('id', { count: 'exact', head: true }).eq('status', 'borrowed').eq('institution_id', profile.institution_id),
        overdueQuery,
        pendingReportsQuery,
      ]);

      // Check for errors
      if (booksResult.error) {
        console.error('Error loading books count:', booksResult.error);
        throw new Error(`Failed to load books: ${booksResult.error.message}`);
      }
      if (studentsResult.error) {
        console.error('Error loading students count:', studentsResult.error);
        throw new Error(`Failed to load students: ${studentsResult.error.message}`);
      }
      if (staffResult.error) {
        console.error('Error loading staff count:', staffResult.error);
        throw new Error(`Failed to load staff: ${staffResult.error.message}`);
      }
      if (borrowedResult.error) {
        console.error('Error loading borrowed books:', borrowedResult.error);
        throw new Error(`Failed to load borrowed books: ${borrowedResult.error.message}`);
      }
      if (overdueResult.error) {
        console.error('Error loading overdue books:', overdueResult.error);
        throw new Error(`Failed to load overdue books: ${overdueResult.error.message}`);
      }

      // Debug logging to inspect raw query results
      console.log('Dashboard loadStats results:', {
        booksResult,
        studentsResult,
        staffResult,
        borrowedResult,
        overdueResult,
        reportsResult,
      });

      setStats({
        totalBooks: booksResult.count || 0,
        borrowedBooks: borrowedResult.count || 0,
        totalStudents: studentsResult.count || 0,
        totalStaff: staffResult.count || 0,
        overdueBooks: overdueResult.count || 0,
        pendingReports: reportsResult.count || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard statistics';
      toast.error(errorMessage);
      // Set default values on error
      setStats({
        totalBooks: 0,
        borrowedBooks: 0,
        totalStudents: 0,
        totalStaff: 0,
        overdueBooks: 0,
        pendingReports: 0,
      });
    }
  }, [profile?.role, profile?.student_id, profile?.institution_id]);

  const loadStudentReadingData = useCallback(async () => {
    try {
      const { data: borrowRecords, error } = await supabase
        .from('borrow_records')
        .select(`
          student_id,
          students (
            name
          )
        `)
        .eq('status', 'completed');

      if (error) {
        console.error('Error loading student reading data:', error);
        throw new Error(`Failed to load reading data: ${error.message}`);
      }

      if (!borrowRecords) {
        setStudentReadingData([]);
        return;
      }

      const studentMap = new Map<string, { name: string; count: number }>();

      // Type-safe iteration with proper null checks
      (borrowRecords as BorrowRecordWithStudent[]).forEach((record) => {
        // Skip records with missing data
        if (!record.student_id || !record.students?.name) {
          return;
        }

        const existing = studentMap.get(record.student_id);
        if (existing) {
          existing.count++;
        } else {
          studentMap.set(record.student_id, {
            name: record.students.name,
            count: 1,
          });
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
    } catch (error) {
      console.error('Error in loadStudentReadingData:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load student reading data';
      toast.error(errorMessage);
      setStudentReadingData([]);
    }
  }, []);

  const loadStaffReadingData = useCallback(async () => {
    // Note: Staff don't have borrow_records in the current schema
    // This is a placeholder for future implementation if staff borrowing is added
    // For now, we'll return empty data
    setStaffReadingData([]);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        await Promise.all([
          loadStats(),
          loadStudentReadingData(),
          loadStaffReadingData()
        ]);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [loadStats, loadStudentReadingData, loadStaffReadingData]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadStats(),
        loadStudentReadingData(),
        loadStaffReadingData()
      ]);
      toast.success('Dashboard refreshed successfully');
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      toast.error('Failed to refresh dashboard');
    } finally {
      setRefreshing(false);
    }
  };

  // Memoize stat cards array to prevent unnecessary re-renders
  const allStatCards = useMemo(() => [
    {
      title: 'Total Books',
      value: stats.totalBooks,
      icon: BookOpen,
      gradient: 'from-blue-500 to-blue-600',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      roles: ['librarian', 'staff', 'student'],
    },
    {
      title: 'Borrowed Books',
      value: stats.borrowedBooks,
      icon: BookMarked,
      gradient: 'from-green-500 to-green-600',
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      roles: ['librarian', 'staff', 'student'],
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      gradient: 'from-slate-500 to-slate-600',
      color: 'bg-slate-500',
      bgColor: 'bg-slate-50',
      roles: ['librarian', 'staff'],
    },
    {
      title: 'Total Staff',
      value: stats.totalStaff,
      icon: UserCog,
      gradient: 'from-teal-500 to-teal-600',
      color: 'bg-teal-500',
      bgColor: 'bg-teal-50',
      roles: ['librarian'], // Only librarians can see staff count
    },
    {
      title: profile?.role === 'student' ? 'My Overdue Books' : 'Overdue Books',
      value: stats.overdueBooks,
      icon: AlertCircle,
      gradient: 'from-red-500 to-red-600',
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      roles: ['librarian', 'staff', 'student'], // Students can see their own overdue books
    },
    {
      title: 'Pending Reports',
      value: stats.pendingReports,
      icon: FileText,
      gradient: 'from-indigo-500 to-indigo-600',
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      roles: ['librarian', 'staff'],
    },
  ], [stats, profile?.role]);

  // Filter stat cards based on user role - memoized to prevent unnecessary re-renders
  const statCards = useMemo(() => 
    allStatCards.filter(card => 
      profile?.role && card.roles.includes(profile.role)
    ),
    [profile?.role, allStatCards]
  );

  // Division by zero protection
  const maxBooksRead = Math.max(...studentReadingData.map(s => s.books_read), 1);
  const safePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.min((value / total) * 100, 100);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="relative min-h-screen">
        <BackgroundCarousel />
        <div className="relative z-10 p-3 sm:p-4 md:p-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-lg">
            <img src={schoolLogo} alt="IISBenin Logo" className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain" />
            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">Dashboard Overview</h2>
          </div>
          <LoadingSkeleton type="dashboard" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <BackgroundCarousel />
      <div className="relative z-10 space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">
        {/* Header - Mobile Responsive */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-lg">
          <div className="flex items-center gap-2 sm:gap-4">
            <img src={institution?.theme_settings?.logo_url || schoolLogo} alt={institution?.name || 'Logo'} className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain flex-shrink-0" />
            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900">{institution?.name || 'Dashboard'} Overview</h2>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors min-h-[44px]"
            aria-label="Refresh dashboard"
            title="Refresh dashboard data"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <QuoteOfTheDay />
        
        {/* Stats Cards - Mobile Responsive Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-200 shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer active:scale-95">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className={`bg-gradient-to-br ${card.gradient} p-2 sm:p-3 rounded-lg shadow-md`}>
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">{card.title}</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
            );
          })}
        </div>

        {/* Reading Progress & Streaks Widgets - Only for Students and Staff */}
        {profile?.id && (profile.role === 'student' || profile.role === 'staff') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-2xl">
              <ReadingProgress />
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-2xl">
              <ReadingStreaks userId={profile.id} />
            </div>
          </div>
        )}

        {/* Waiting List & Recommendations */}
        {profile?.id && (profile.role === 'student' || profile.role === 'staff') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-2xl">
              <WaitingList />
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-6 transition-all duration-300 hover:shadow-2xl">
              <BookRecommendations />
            </div>
          </div>
        )}

        {/* Top Reading Students Chart - Mobile Responsive */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center gap-2 mb-4 sm:mb-6">
            <BookMarked className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Top Reading Students</h3>
          </div>

          {studentReadingData.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {studentReadingData.map((student, index) => (
                <div key={student.student_id} className="space-y-2 transition-all duration-200 hover:translate-x-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-xs sm:text-sm shadow-md flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{student.student_name}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                      {student.books_read} {student.books_read === 1 ? 'book' : 'books'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                      style={{ width: `${safePercentage(student.books_read, maxBooksRead)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 text-gray-500">
              <BookOpen className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-base sm:text-lg font-medium">No reading data yet</p>
              <p className="text-xs sm:text-sm mt-1 px-4">Students' reading activity will appear here once they complete borrowing books</p>
            </div>
          )}
        </div>

        {/* Top Reading Staff Chart - Mobile Responsive */}
        {profile?.role && (profile.role === 'librarian' || profile.role === 'staff') && (
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4 sm:mb-6">
              <UserCog className="h-5 w-5 sm:h-6 sm:w-6 text-teal-600 flex-shrink-0" />
              <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">Top Reading Staff</h3>
            </div>

            {staffReadingData.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {staffReadingData.map((staff, index) => (
                  <div key={staff.staff_id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-100 text-teal-700 font-semibold text-xs sm:text-sm flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="font-medium text-gray-900 text-sm sm:text-base truncate">{staff.staff_name}</span>
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                        {staff.books_read} {staff.books_read === 1 ? 'book' : 'books'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-blue-500 h-2 sm:h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(staff.books_read / Math.max(...staffReadingData.map(s => s.books_read), 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12 text-gray-500">
                <UserCog className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
                <p className="text-base sm:text-lg font-medium">No reading data yet</p>
                <p className="text-xs sm:text-sm mt-1 px-4">Staff reading activity will appear here once they complete borrowing books</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
