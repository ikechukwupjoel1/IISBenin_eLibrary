/**
 * Activity Type System
 * 
 * This file provides a centralized system for managing activity types
 * across the application. It ensures type safety and consistency.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  UserPlus,
  Power,
  PowerOff,
  UserMinus,
  UserCheck,
  UserX,
  ToggleLeft,
  BookPlus,
  BookOpen,
  BookCheck,
  Trash2,
  DollarSign,
  AlertTriangle,
  Shield,
  Settings,
  Upload,
  Download,
  Eye,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  Key,
  Lock,
  Unlock,
  RefreshCw,
  Database,
  Users
} from 'lucide-react';

// =====================================================
// ACTIVITY TYPE DEFINITIONS
// =====================================================

export type ActivityCategory = 
  | 'institution'
  | 'librarian'
  | 'user'
  | 'book'
  | 'digital_library'
  | 'feature'
  | 'bulk_action'
  | 'payment'
  | 'security'
  | 'system'
  | 'report'
  | 'notification';

export type ActivityType =
  // Institutions
  | 'institution_created'
  | 'institution_updated'
  | 'institution_suspended'
  | 'institution_reactivated'
  | 'institution_deleted'
  // Librarians
  | 'librarian_invited'
  | 'librarian_registered'
  | 'librarian_removed'
  // Users
  | 'user_registered'
  | 'user_suspended'
  | 'user_reactivated'
  | 'user_deleted'
  // Books
  | 'book_added'
  | 'book_removed'
  | 'book_updated'
  | 'book_borrowed'
  | 'book_returned'
  | 'book_reserved'
  // Digital Library
  | 'digital_content_uploaded'
  | 'digital_content_downloaded'
  | 'digital_content_viewed'
  // Features
  | 'feature_toggled'
  | 'feature_enabled'
  | 'feature_disabled'
  // Bulk Actions
  | 'bulk_action_executed'
  | 'bulk_user_import'
  | 'bulk_book_import'
  | 'bulk_email_sent'
  // Payments
  | 'payment_received'
  | 'payment_failed'
  | 'subscription_changed'
  | 'subscription_expired'
  | 'subscription_renewed'
  // Security
  | 'impersonation_started'
  | 'impersonation_ended'
  | 'backup_created'
  | 'security_alert'
  | 'password_reset'
  | 'login_failed'
  | 'account_locked'
  // System
  | 'system_setting_changed'
  | 'system_maintenance'
  | 'system_upgrade'
  | 'api_key_generated'
  | 'api_key_revoked'
  // Reports
  | 'report_generated'
  | 'report_exported'
  | 'report_scheduled'
  // Notifications
  | 'notification_sent'
  | 'email_sent'
  | 'sms_sent';

// =====================================================
// ACTIVITY CONFIGURATION
// =====================================================

interface ActivityConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  category: ActivityCategory;
  label: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export const ACTIVITY_CONFIG: Record<ActivityType, ActivityConfig> = {
  // Institutions
  institution_created: {
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'institution',
    label: 'Institution Created',
    priority: 'medium'
  },
  institution_updated: {
    icon: Building2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    category: 'institution',
    label: 'Institution Updated',
    priority: 'low'
  },
  institution_suspended: {
    icon: PowerOff,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    category: 'institution',
    label: 'Institution Suspended',
    priority: 'high'
  },
  institution_reactivated: {
    icon: Power,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'institution',
    label: 'Institution Reactivated',
    priority: 'medium'
  },
  institution_deleted: {
    icon: Trash2,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    category: 'institution',
    label: 'Institution Deleted',
    priority: 'critical'
  },

  // Librarians
  librarian_invited: {
    icon: UserPlus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    category: 'librarian',
    label: 'Librarian Invited',
    priority: 'medium'
  },
  librarian_registered: {
    icon: UserCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'librarian',
    label: 'Librarian Registered',
    priority: 'medium'
  },
  librarian_removed: {
    icon: UserMinus,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    category: 'librarian',
    label: 'Librarian Removed',
    priority: 'high'
  },

  // Users
  user_registered: {
    icon: UserPlus,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    category: 'user',
    label: 'User Registered',
    priority: 'low'
  },
  user_suspended: {
    icon: UserX,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    category: 'user',
    label: 'User Suspended',
    priority: 'high'
  },
  user_reactivated: {
    icon: UserCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'user',
    label: 'User Reactivated',
    priority: 'medium'
  },
  user_deleted: {
    icon: UserX,
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    category: 'user',
    label: 'User Deleted',
    priority: 'high'
  },

  // Books
  book_added: {
    icon: BookPlus,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'book',
    label: 'Book Added',
    priority: 'low'
  },
  book_removed: {
    icon: Trash2,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    category: 'book',
    label: 'Book Removed',
    priority: 'medium'
  },
  book_updated: {
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'book',
    label: 'Book Updated',
    priority: 'low'
  },
  book_borrowed: {
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'book',
    label: 'Book Borrowed',
    priority: 'low'
  },
  book_returned: {
    icon: BookCheck,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'book',
    label: 'Book Returned',
    priority: 'low'
  },
  book_reserved: {
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    category: 'book',
    label: 'Book Reserved',
    priority: 'low'
  },

  // Digital Library
  digital_content_uploaded: {
    icon: Upload,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    category: 'digital_library',
    label: 'Content Uploaded',
    priority: 'low'
  },
  digital_content_downloaded: {
    icon: Download,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'digital_library',
    label: 'Content Downloaded',
    priority: 'low'
  },
  digital_content_viewed: {
    icon: Eye,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    category: 'digital_library',
    label: 'Content Viewed',
    priority: 'low'
  },

  // Features
  feature_toggled: {
    icon: ToggleLeft,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'feature',
    label: 'Feature Toggled',
    priority: 'medium'
  },
  feature_enabled: {
    icon: Unlock,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'feature',
    label: 'Feature Enabled',
    priority: 'medium'
  },
  feature_disabled: {
    icon: Lock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    category: 'feature',
    label: 'Feature Disabled',
    priority: 'medium'
  },

  // Bulk Actions
  bulk_action_executed: {
    icon: Settings,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    category: 'bulk_action',
    label: 'Bulk Action',
    priority: 'medium'
  },
  bulk_user_import: {
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'bulk_action',
    label: 'Users Imported',
    priority: 'medium'
  },
  bulk_book_import: {
    icon: BookPlus,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'bulk_action',
    label: 'Books Imported',
    priority: 'medium'
  },
  bulk_email_sent: {
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    category: 'bulk_action',
    label: 'Bulk Email Sent',
    priority: 'low'
  },

  // Payments
  payment_received: {
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'payment',
    label: 'Payment Received',
    priority: 'medium'
  },
  payment_failed: {
    icon: DollarSign,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    category: 'payment',
    label: 'Payment Failed',
    priority: 'high'
  },
  subscription_changed: {
    icon: RefreshCw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'payment',
    label: 'Subscription Changed',
    priority: 'medium'
  },
  subscription_expired: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    category: 'payment',
    label: 'Subscription Expired',
    priority: 'high'
  },
  subscription_renewed: {
    icon: RefreshCw,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'payment',
    label: 'Subscription Renewed',
    priority: 'medium'
  },

  // Security
  impersonation_started: {
    icon: Shield,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    category: 'security',
    label: 'Impersonation Started',
    priority: 'high'
  },
  impersonation_ended: {
    icon: Shield,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'security',
    label: 'Impersonation Ended',
    priority: 'medium'
  },
  backup_created: {
    icon: Database,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'security',
    label: 'Backup Created',
    priority: 'low'
  },
  security_alert: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    category: 'security',
    label: 'Security Alert',
    priority: 'critical'
  },
  password_reset: {
    icon: Key,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'security',
    label: 'Password Reset',
    priority: 'medium'
  },
  login_failed: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    category: 'security',
    label: 'Login Failed',
    priority: 'medium'
  },
  account_locked: {
    icon: Lock,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    category: 'security',
    label: 'Account Locked',
    priority: 'high'
  },

  // System
  system_setting_changed: {
    icon: Settings,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    category: 'system',
    label: 'Setting Changed',
    priority: 'low'
  },
  system_maintenance: {
    icon: Settings,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    category: 'system',
    label: 'System Maintenance',
    priority: 'high'
  },
  system_upgrade: {
    icon: RefreshCw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'system',
    label: 'System Upgrade',
    priority: 'high'
  },
  api_key_generated: {
    icon: Key,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'system',
    label: 'API Key Generated',
    priority: 'medium'
  },
  api_key_revoked: {
    icon: Key,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    category: 'system',
    label: 'API Key Revoked',
    priority: 'medium'
  },

  // Reports
  report_generated: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'report',
    label: 'Report Generated',
    priority: 'low'
  },
  report_exported: {
    icon: Download,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'report',
    label: 'Report Exported',
    priority: 'low'
  },
  report_scheduled: {
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    category: 'report',
    label: 'Report Scheduled',
    priority: 'low'
  },

  // Notifications
  notification_sent: {
    icon: MessageSquare,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    category: 'notification',
    label: 'Notification Sent',
    priority: 'low'
  },
  email_sent: {
    icon: Mail,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    category: 'notification',
    label: 'Email Sent',
    priority: 'low'
  },
  sms_sent: {
    icon: MessageSquare,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    category: 'notification',
    label: 'SMS Sent',
    priority: 'low'
  }
};

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get activity configuration
 */
export function getActivityConfig(type: ActivityType): ActivityConfig {
  return ACTIVITY_CONFIG[type] || {
    icon: AlertTriangle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    category: 'system',
    label: 'Unknown Activity',
    priority: 'low'
  };
}

/**
 * Get all activities for a category
 */
export function getActivitiesByCategory(category: ActivityCategory): ActivityType[] {
  return (Object.entries(ACTIVITY_CONFIG) as [ActivityType, ActivityConfig][])
    .filter(([, config]) => config.category === category)
    .map(([type]) => type);
}

/**
 * Get all critical activities
 */
export function getCriticalActivities(): ActivityType[] {
  return (Object.entries(ACTIVITY_CONFIG) as [ActivityType, ActivityConfig][])
    .filter(([, config]) => config.priority === 'critical')
    .map(([type]) => type);
}

/**
 * Check if activity is critical
 */
export function isCriticalActivity(type: ActivityType): boolean {
  return ACTIVITY_CONFIG[type]?.priority === 'critical';
}

/**
 * Get activity badge color based on priority
 */
export function getActivityBadgeColor(type: ActivityType): string {
  const priority = ACTIVITY_CONFIG[type]?.priority || 'low';
  const colorMap = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-orange-100 text-orange-700',
    critical: 'bg-red-100 text-red-700'
  };
  return colorMap[priority];
}

// =====================================================
// USAGE EXAMPLES
// =====================================================

/*
// In ActivityFeed component:
import { getActivityConfig } from '@/utils/activityTypes';

const config = getActivityConfig(activity.type);
const Icon = config.icon;

<div className={config.bgColor}>
  <Icon className={config.color} />
</div>

// Filter by category:
import { getActivitiesByCategory } from '@/utils/activityTypes';

const securityActivities = getActivitiesByCategory('security');

// Check if critical:
import { isCriticalActivity } from '@/utils/activityTypes';

if (isCriticalActivity(activity.type)) {
  sendAlert();
}
*/
