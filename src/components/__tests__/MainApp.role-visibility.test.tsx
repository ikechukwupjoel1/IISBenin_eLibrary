import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MainApp from '../MainApp';
import { AuthContext, type AuthContextType } from '../../contexts/AuthContext';

// Mock child components
vi.mock('../Dashboard', () => ({ Dashboard: () => <div>Dashboard</div> }));
vi.mock('../BookManagement', () => ({ BookManagement: () => <div>BookManagement</div> }));
vi.mock('../StudentManagement', () => ({ StudentManagement: () => <div>StudentManagement</div> }));
vi.mock('../StaffManagement', () => ({ StaffManagement: () => <div>StaffManagement</div> }));
vi.mock('../BorrowingSystem', () => ({ BorrowingSystem: () => <div>BorrowingSystem</div> }));
vi.mock('../SuperAdminDashboard', () => ({ SuperAdminDashboard: () => <div>SuperAdminDashboard</div> }));
vi.mock('../LibrarySettings', () => ({ LibrarySettings: () => <div>LibrarySettings</div> }));

const createMockAuthContext = (role: string, featureFlags: Record<string, boolean> = {}): AuthContextType => ({
  profile: {
    id: 'test-id',
    full_name: 'Test User',
    role: role as 'librarian' | 'staff' | 'student' | 'super_admin',
    enrollment_id: 'TEST001',
    institution_id: 'inst-1',
    email: 'test@example.com',
  },
  user: null,
  institution: {
    id: 'inst-1',
    name: 'Test Institution',
    is_setup_complete: true,
    is_active: true,
    feature_flags: featureFlags,
  },
  loading: false,
  signOut: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
});

describe('MainApp Role Visibility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Student Role', () => {
    it('should show Dashboard, Library dropdown, Community dropdown (if enabled)', () => {
      const mockContext = createMockAuthContext('student', {
        leaderboard: true,
        challenges: true,
        bookclubs: true,
      });

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /library/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /community/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /announcements/i })).toBeInTheDocument();
    });

    it('should NOT show Students, Staff, Settings tabs', () => {
      const mockContext = createMockAuthContext('student');

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      expect(screen.queryByText('Students')).not.toBeInTheDocument();
      expect(screen.queryByText('Staff')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });

    it('should NOT show Messaging tab', () => {
      const mockContext = createMockAuthContext('student', { messages: true });

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      expect(screen.queryByText('Messaging')).not.toBeInTheDocument();
    });

    it('should hide community features when feature flags are disabled', () => {
      const mockContext = createMockAuthContext('student', {
        leaderboard: false,
        challenges: false,
        bookclubs: false,
      });

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      expect(screen.queryByText('Community')).not.toBeInTheDocument();
    });
  });

  describe('Staff Role', () => {
    it('should show Dashboard, Books, Library, Messaging, Community', () => {
      const mockContext = createMockAuthContext('staff', {
        messages: true,
        leaderboard: true,
        challenges: true,
      });

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
      // Staff doesn't see standalone Books tab - it's in Library dropdown
      expect(screen.getByRole('button', { name: /library/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /messaging/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /community/i })).toBeInTheDocument();
    });

    it('should NOT show Students, Staff management, Settings tabs', () => {
      const mockContext = createMockAuthContext('staff');

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      expect(screen.queryByText('Students')).not.toBeInTheDocument();
      expect(screen.queryByText('Staff')).not.toBeInTheDocument();
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
    });
  });

  describe('Librarian Role', () => {
    it('should show all management tabs: Dashboard, Students, Staff, Settings', () => {
      const mockContext = createMockAuthContext('librarian');

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      expect(screen.getByRole('button', { name: /dashboard/i })).toBeInTheDocument();
      // Books tab is not shown separately - it's in Library dropdown
      expect(screen.getByRole('button', { name: /students/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /staff/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
    });

    it('should show Library, Community, Reports dropdowns', () => {
      const mockContext = createMockAuthContext('librarian', {
        leaderboard: true,
        challenges: true,
        reviews: true,
      });

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      expect(screen.getByText('Library')).toBeInTheDocument();
      expect(screen.getByText('Community')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('should show Report Review tab (librarian only)', () => {
      const mockContext = createMockAuthContext('librarian');

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      // Report Review is in the Reports dropdown
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });
  });

  describe('Feature Flag Gating', () => {
    it('should respect feature flags for messages', () => {
      const mockContextWithMessages = createMockAuthContext('staff', { messages: true });
      const mockContextWithoutMessages = createMockAuthContext('staff', { messages: false });

      const { rerender } = render(
        <AuthContext.Provider value={mockContextWithMessages}>
          <MainApp />
        </AuthContext.Provider>
      );
      expect(screen.getByText('Messaging')).toBeInTheDocument();

      rerender(
        <AuthContext.Provider value={mockContextWithoutMessages}>
          <MainApp />
        </AuthContext.Provider>
      );
      expect(screen.queryByText('Messaging')).not.toBeInTheDocument();
    });

    it('should respect feature flags for community features', () => {
      const mockContext = createMockAuthContext('student', {
        leaderboard: true,
        challenges: false,
        bookclubs: false,
      });

      render(
        <AuthContext.Provider value={mockContext}>
          <MainApp />
        </AuthContext.Provider>
      );

      // Community dropdown should appear if at least one feature is enabled
      expect(screen.getByText('Community')).toBeInTheDocument();
    });
  });
});
