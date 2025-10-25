/**
 * Custom React Query Hooks for IIS Benin eLibrary
 * Provides caching, automatic refetching, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';
import { queryKeys, invalidateRelatedQueries } from './queryClient';
import type { Book, Student, Staff } from './supabase';

// =====================================================
// BOOKS HOOKS
// =====================================================

// Fetch all books with caching
export const useBooks = (filters?: { status?: string; category?: string }) => {
  return useQuery({
    queryKey: queryKeys.books.list(JSON.stringify(filters)),
    queryFn: async () => {
      let query = supabase.from('books').select('*');
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Book[];
    },
  });
};

// Fetch available books
export const useAvailableBooks = () => {
  return useQuery({
    queryKey: queryKeys.books.available(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .eq('status', 'available')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Book[];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes - available books change frequently
  });
};

// Search books with caching
export const useBookSearch = (searchTerm: string) => {
  return useQuery({
    queryKey: queryKeys.books.search(searchTerm),
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`)
        .limit(50);
      
      if (error) throw error;
      return data as Book[];
    },
    enabled: searchTerm.length >= 2, // Only fetch when search term is 2+ chars
  });
};

// Add book mutation
export const useAddBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookData: Omit<Book, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('books')
        .insert([bookData])
        .select()
        .single();
      
      if (error) throw error;
      return data as Book;
    },
    onSuccess: (newBook) => {
      // Optimistically update the cache
      queryClient.setQueryData<Book[]>(
        queryKeys.books.lists(),
        (old) => old ? [newBook, ...old] : [newBook]
      );
      
      // Invalidate related queries
      invalidateRelatedQueries.onBookChange(newBook.id);
    },
  });
};

// Update book mutation
export const useUpdateBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Book> & { id: string }) => {
      const { data, error } = await supabase
        .from('books')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Book;
    },
    onSuccess: (updatedBook) => {
      // Update cache
      queryClient.setQueryData<Book[]>(
        queryKeys.books.lists(),
        (old) => old?.map(book => book.id === updatedBook.id ? updatedBook : book)
      );
      
      invalidateRelatedQueries.onBookChange(updatedBook.id);
    },
  });
};

// Delete book mutation
export const useDeleteBook = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);
      
      if (error) throw error;
      return bookId;
    },
    onSuccess: (deletedId) => {
      // Remove from cache
      queryClient.setQueryData<Book[]>(
        queryKeys.books.lists(),
        (old) => old?.filter(book => book.id !== deletedId)
      );
      
      invalidateRelatedQueries.onBookChange(deletedId);
    },
  });
};

// =====================================================
// STUDENTS HOOKS
// =====================================================

export const useStudents = () => {
  return useQuery({
    queryKey: queryKeys.students.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Student[];
    },
  });
};

export const useStudentHistory = (studentId: string) => {
  return useQuery({
    queryKey: queryKeys.students.history(studentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('borrow_records')
        .select(`
          *,
          books (
            title,
            author
          )
        `)
        .eq('student_id', studentId)
        .order('borrow_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });
};

// =====================================================
// STAFF HOOKS
// =====================================================

export const useStaff = () => {
  return useQuery({
    queryKey: queryKeys.staff.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Staff[];
    },
  });
};

// =====================================================
// BORROW RECORDS HOOKS
// =====================================================

export const useBorrowRecords = (filters?: { status?: string }) => {
  return useQuery({
    queryKey: queryKeys.borrows.list(JSON.stringify(filters)),
    queryFn: async () => {
      let query = supabase
        .from('borrow_records')
        .select(`
          *,
          books (
            title,
            author
          ),
          students (
            name,
            enrollment_id
          ),
          staff (
            name,
            enrollment_id
          )
        `);
      
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      const { data, error } = await query.order('borrow_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
};

export const useActiveBorrows = () => {
  return useQuery({
    queryKey: queryKeys.borrows.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('borrow_records')
        .select(`
          *,
          books (title, author),
          students (name, enrollment_id),
          staff (name, enrollment_id)
        `)
        .eq('status', 'active')
        .order('borrow_date', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useOverdueBorrows = () => {
  return useQuery({
    queryKey: queryKeys.borrows.overdue(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('borrow_records')
        .select(`
          *,
          books (title, author),
          students (name, enrollment_id),
          staff (name, enrollment_id)
        `)
        .eq('status', 'active')
        .lt('due_date', new Date().toISOString())
        .order('due_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute - check more frequently
  });
};

// =====================================================
// LEADERBOARD HOOKS
// =====================================================

export const useLeaderboard = (limit: number = 10) => {
  return useQuery({
    queryKey: queryKeys.leaderboard.top(limit),
    queryFn: async () => {
      // Try using the optimized RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_leaderboard', { p_limit: limit });
      
      if (!rpcError && rpcData) {
        return rpcData;
      }
      
      // Fallback to regular query if RPC doesn't exist yet
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          enrollment_id,
          borrow_records!left(id),
          reading_streaks!left(current_streak, longest_streak),
          user_badges!left(id)
        `)
        .limit(limit);
      
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - leaderboard changes slowly
  });
};

// =====================================================
// DASHBOARD STATS HOOKS
// =====================================================

export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      // Try using optimized RPC function
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_dashboard_stats');
      
      if (!rpcError && rpcData) {
        return rpcData[0];
      }
      
      // Fallback to multiple queries
      const [books, students, staff, borrows] = await Promise.all([
        supabase.from('books').select('status', { count: 'exact', head: false }),
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('staff').select('id', { count: 'exact', head: true }),
        supabase.from('borrow_records').select('status', { count: 'exact', head: false }),
      ]);
      
      return {
        total_books: books.data?.length || 0,
        available_books: books.data?.filter(b => b.status === 'available').length || 0,
        total_students: students.count || 0,
        total_staff: staff.count || 0,
        active_borrows: borrows.data?.filter(b => b.status === 'active').length || 0,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// =====================================================
// READING PROGRESS HOOKS
// =====================================================

export const useUserReadingProgress = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.readingProgress.user(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reading_progress')
        .select(`
          *,
          books (
            title,
            author,
            page_number
          )
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

// Update reading progress mutation
export const useUpdateReadingProgress = () => {
  return useMutation({
    mutationFn: async ({ userId, bookId, pagesRead }: { 
      userId: string; 
      bookId: string; 
      pagesRead: number 
    }) => {
      const { data, error } = await supabase
        .from('reading_progress')
        .upsert({
          user_id: userId,
          book_id: bookId,
          pages_read: pagesRead,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      invalidateRelatedQueries.onProgressChange(variables.userId, variables.bookId);
    },
  });
};

// =====================================================
// BADGES HOOKS
// =====================================================

export const useUserBadges = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.badges.user(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*')
        .eq('user_id', userId)
        .order('awarded_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes - badges don't change often
  });
};
