import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Set' : 'Missing');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export type Book = {
  id: string;
  title: string;
  author_publisher: string;
  isbn?: string;
  category?: string;
  status: 'available' | 'borrowed';
  created_at: string;
  updated_at?: string;
  institution_id?: string;
};

export type Student = {
  id: string;
  name: string;
  email?: string;
  phone_number?: string;
  grade_level: string;
  enrollment_id?: string;
  parent_email?: string;
  admission_number?: string;
  date_of_birth?: string;
  institution_id?: string;
  created_at: string;
};

export type Staff = {
  id: string;
  name: string;
  email?: string;
  enrollment_id: string;
  phone_number?: string;
  created_at: string;
};

export type BorrowRecord = {
  id: string;
  book_id: string;
  student_id?: string;
  staff_id?: string;
  borrow_date: string;
  due_date: string;
  return_date?: string;
  status: 'active' | 'completed' | 'overdue';
  created_at: string;
};
