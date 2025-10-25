import { QueryClient } from '@tanstack/react-query';

// Create a client with optimized settings for our use case
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Retry failed requests 2 times
      retry: 2,
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
      
      // Refetch on reconnect
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once
      retry: 1,
    },
  },
});

// Query keys factory for consistent cache management
export const queryKeys = {
  // Books
  books: {
    all: ['books'] as const,
    lists: () => [...queryKeys.books.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.books.lists(), { filters }] as const,
    details: () => [...queryKeys.books.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.books.details(), id] as const,
    available: () => [...queryKeys.books.all, 'available'] as const,
    search: (term: string) => [...queryKeys.books.all, 'search', term] as const,
  },
  
  // Students
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.students.lists(), { filters }] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.students.details(), id] as const,
    history: (id: string) => [...queryKeys.students.details(), id, 'history'] as const,
  },
  
  // Staff
  staff: {
    all: ['staff'] as const,
    lists: () => [...queryKeys.staff.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.staff.lists(), { filters }] as const,
    details: () => [...queryKeys.staff.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.staff.details(), id] as const,
  },
  
  // Borrow Records
  borrows: {
    all: ['borrows'] as const,
    lists: () => [...queryKeys.borrows.all, 'list'] as const,
    list: (filters?: string) => [...queryKeys.borrows.lists(), { filters }] as const,
    active: () => [...queryKeys.borrows.all, 'active'] as const,
    overdue: () => [...queryKeys.borrows.all, 'overdue'] as const,
    history: (userId: string) => [...queryKeys.borrows.all, 'history', userId] as const,
  },
  
  // Reading Progress
  readingProgress: {
    all: ['readingProgress'] as const,
    user: (userId: string) => [...queryKeys.readingProgress.all, userId] as const,
    book: (bookId: string) => [...queryKeys.readingProgress.all, 'book', bookId] as const,
  },
  
  // Badges
  badges: {
    all: ['badges'] as const,
    user: (userId: string) => [...queryKeys.badges.all, userId] as const,
  },
  
  // Leaderboard
  leaderboard: {
    all: ['leaderboard'] as const,
    top: (limit?: number) => [...queryKeys.leaderboard.all, { limit }] as const,
  },
  
  // Book Reports
  bookReports: {
    all: ['bookReports'] as const,
    lists: () => [...queryKeys.bookReports.all, 'list'] as const,
    pending: () => [...queryKeys.bookReports.all, 'pending'] as const,
    user: (userId: string) => [...queryKeys.bookReports.all, userId] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    user: (userId: string) => [...queryKeys.notifications.all, userId] as const,
    unread: (userId: string) => [...queryKeys.notifications.all, userId, 'unread'] as const,
  },
  
  // Dashboard Stats
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
  },
};

// Helper function to invalidate related queries
export const invalidateRelatedQueries = {
  // When a book changes, invalidate book lists and details
  onBookChange: (bookId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.books.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.books.available() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    if (bookId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.books.detail(bookId) });
    }
  },
  
  // When a borrow record changes
  onBorrowChange: (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.borrows.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.borrows.active() });
    queryClient.invalidateQueries({ queryKey: queryKeys.borrows.overdue() });
    queryClient.invalidateQueries({ queryKey: queryKeys.books.available() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.borrows.history(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(userId) });
    }
  },
  
  // When reading progress updates
  onProgressChange: (userId: string, bookId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.readingProgress.user(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
    if (bookId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.readingProgress.book(bookId) });
    }
  },
  
  // When a badge is awarded
  onBadgeAwarded: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.badges.user(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(userId) });
  },
  
  // When a student/staff is added or updated
  onUserChange: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.staff.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
  },
  
  // When a book report is submitted or reviewed
  onReportChange: (userId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.bookReports.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.bookReports.pending() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    if (userId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.bookReports.user(userId) });
    }
  },
};

// Prefetch functions for better UX
export const prefetchQueries = {
  // Prefetch books list when hovering over digital library link
  books: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.books.lists(),
      queryFn: async () => {
        const { data } = await import('../lib/supabase').then(m => 
          m.supabase.from('books').select('*').limit(20)
        );
        return data;
      },
    });
  },
  
  // Prefetch leaderboard data
  leaderboard: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.leaderboard.top(10),
      queryFn: async () => {
        const { data } = await import('../lib/supabase').then(m =>
          m.supabase.rpc('get_leaderboard', { p_limit: 10 })
        );
        return data;
      },
    });
  },
};
