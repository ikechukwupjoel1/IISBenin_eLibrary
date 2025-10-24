import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

/**
 * Real-time notification hook for book report status changes
 * Listens for report updates and shows toast notifications to students
 */
export function useReportNotifications() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile || profile.role !== 'student') return;

    // Subscribe to book_reports changes for this user
    const channel = supabase
      .channel('report-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'book_reports',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newReport = payload.new as {
            status: string;
            points_awarded: number;
            title: string;
          };
          const oldReport = payload.old as { status: string };

          // Only notify if status changed
          if (newReport.status !== oldReport.status) {
            switch (newReport.status) {
              case 'approved':
                toast.success(
                  `📚 Book report approved! You earned ${newReport.points_awarded} points!`,
                  {
                    duration: 6000,
                    icon: '🎉',
                  }
                );
                break;

              case 'rejected':
                toast.error(
                  `Your book report "${newReport.title}" was not approved. Please review the feedback.`,
                  {
                    duration: 6000,
                  }
                );
                break;

              case 'revision_needed':
                toast(
                  `📝 Your report "${newReport.title}" needs revisions. Check the feedback!`,
                  {
                    duration: 6000,
                    icon: '✏️',
                  }
                );
                break;
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Report notifications subscription:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [profile]);
}
