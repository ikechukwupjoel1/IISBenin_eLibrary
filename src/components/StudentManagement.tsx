import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, History, KeyRound, Printer, UserPlus, Upload } from 'lucide-react';
import { supabase, type Student, type BorrowRecord, type Book } from '../lib/supabase';
import toast from 'react-hot-toast';
import { generateSecurePassword } from '../utils/validation';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import { BulkUserRegistration } from './BulkUserRegistration';

type StudentWithHistory = Student & {
  borrow_records?: (BorrowRecord & { books?: Book })[];
};

type GeneratedCredentials = {
  enrollment_id: string;
  password: string;
};

export function StudentManagement() {
  const { profile: currentLibrarianProfile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(10); // Number of students to display per page
  const [totalStudents, setTotalStudents] = useState(0);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [showBulkRegister, setShowBulkRegister] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithHistory | null>(null);
  const [resetPasswordStudent, setResetPasswordStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    parent_email: '',
  });

  useEffect(() => {
    if (currentLibrarianProfile) { // Only load if profile is available
      loadStudents();
    }
  }, [currentPage, searchTerm, currentLibrarianProfile]);

  const loadStudents = async () => {
    if (!currentLibrarianProfile?.institution_id) {
      setLoading(false);
      return; // Don't load if no institution
    }

    setLoading(true);
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage - 1;

    let query = supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('institution_id', currentLibrarianProfile.institution_id) // Filter by institution
      .order('created_at', { ascending: false });

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,grade_level.ilike.%${searchTerm}%,enrollment_id.ilike.%${searchTerm}%`);
    }

    const { data, error, count } = await query.range(startIndex, endIndex);

    if (error) {
      toast.error('Failed to load students');
    } else if (data) {
      setStudents(data);
      setTotalStudents(count || 0);
    }
    setLoading(false);
  };

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.grade_level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.enrollment_id && student.enrollment_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const generateEnrollmentId = async () => {
    const { data, error } = await supabase
      .rpc('get_next_enrollment_id', { role_type: 'student' });
    
    if (error) {
      console.error('Error generating enrollment ID:', error);
      throw new Error('Failed to generate enrollment ID');
    }
    return data;
  };

  const generatePassword = () => {
    // Use the secure password generator that guarantees all requirements:
    // 10+ chars, uppercase, lowercase, number, special char
    return generateSecurePassword(12);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentLibrarianProfile?.institution_id) {
      toast.error('Could not identify your institution. Please re-login.');
      return;
    }

    if (editingStudent) {
      const { error } = await supabase
        .from('students')
        .update({
          name: formData.name,
          grade_level: formData.grade_level,
        })
        .eq('id', editingStudent.id);

      if (!error) {
        loadStudents();
        closeModal();
      } else {
        alert('Error updating student: ' + error.message);
      }
    } else {
      const enrollmentId = await generateEnrollmentId();
      const password = generatePassword();
      const email = formData.parent_email.trim().toLowerCase();

      // Use Edge Function to create user without affecting current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('You must be logged in to create students');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-account`;

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            email, // parent email
            password,
            full_name: formData.name,
            role: 'student',
            enrollment_id: enrollmentId,
            grade_level: formData.grade_level,
            parent_email: email, // store parent email if needed
            phone_number: null,
            institution_id: currentLibrarianProfile.institution_id, // Pass institution_id
          }),
        });

        const result = await response.json();

        if (!response.ok || result.error) {
          alert('Error creating student: ' + (result.error || 'Unknown error'));
          return;
        }

        setGeneratedCredentials({
          enrollment_id: enrollmentId,
          password,
        });
        setShowCredentials(true);

        loadStudents();
        closeModal();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        toast.error('Error creating student: ' + errorMessage);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this student? This will permanently remove their account.')) {
      // Delete the student (CASCADE will delete user_profile too)
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) {
        alert('Error deleting student: ' + error.message);
        return;
      }

      // Note: Auth user deletion requires admin privileges
      // The auth user record will remain but won't be able to log in
      // since the profile is gone

      loadStudents();
      alert('Student deleted successfully');
    }
  };

  const viewHistory = async (student: Student) => {
    const { data, error } = await supabase
      .from('borrow_records')
      .select(`
        *,
        books (*)
      `)
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSelectedStudent({ ...student, borrow_records: data as (BorrowRecord & { books?: Book })[] });
      setShowHistory(true);
    }
  };

  const openModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        grade_level: student.grade_level,
        parent_email: '', // Always reset parent_email for edit
      });
    }
    setIsAddingStudent(true);
  };

  const closeModal = () => {
    setIsAddingStudent(false);
    setEditingStudent(null);
    setFormData({
      name: '',
      grade_level: '',
      parent_email: '',
    });
  };

  const openResetPassword = (student: Student) => {
    setResetPasswordStudent(student);
    setShowResetPassword(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordStudent) return;

    const newPassword = generatePassword();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        return;
      }

      console.log('Resetting password for student:', resetPasswordStudent);

      // Get the auth user ID from user_profiles linked to this student
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, email, role, student_id')
        .eq('student_id', resetPasswordStudent.id)
        .maybeSingle();

      console.log('Profile lookup result:', { 
        profileData, 
        profileError,
        studentId: resetPasswordStudent.id 
      });

      if (profileError) {
        toast.error('Error looking up user profile: ' + profileError.message);
        console.error('Profile error:', profileError);
        return;
      }

      if (!profileData) {
        toast.error('No user account found for this student. They may not have been registered properly.');
        console.error('No profile found for student_id:', resetPasswordStudent.id);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`;
      console.log('Calling reset API:', apiUrl, 'with user_id:', profileData.id);

      console.log('Sending reset request with:', {
        user_id: profileData.id,
        userEmail: profileData.email,
        studentName: resetPasswordStudent.name
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          user_id: profileData.id, // Use the auth user ID, not the student table ID
          new_password: newPassword,
        }),
      });

      const result = await response.json();
      console.log('Reset API response:', { 
        status: response.status, 
        statusText: response.statusText,
        result 
      });

      if (!response.ok || result.error) {
        const errorMsg = result.error || `HTTP ${response.status}: ${response.statusText}`;
        toast.error('Error resetting password: ' + errorMsg);
        console.error('Reset failed:', { status: response.status, result });
        return;
      }

      setGeneratedCredentials({
        enrollment_id: resetPasswordStudent.enrollment_id || '',
        password: newPassword,
      });
      setShowResetPassword(false);
      setShowCredentials(true);
      toast.success('Password reset successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Reset password error:', error);
      toast.error('Error resetting password: ' + errorMessage);
    }
  };

  const printCredentials = () => {
    if (!generatedCredentials) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Credentials - IISBenin Library</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .subtitle {
            font-size: 14px;
            color: #666;
          }
          .credentials {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
          }
          .field {
            margin: 15px 0;
          }
          .label {
            font-weight: bold;
            color: #374151;
            display: block;
            margin-bottom: 5px;
          }
          .value {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            padding: 10px;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 4px;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #666;
          }
          .important {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            padding: 15px;
            border-radius: 6px;
            margin-top: 20px;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">IISBenin Library Management System</div>
          <div class="subtitle">Student Login Credentials</div>
        </div>

        <div class="credentials">
          <div class="field">
            <span class="label">Enrollment ID:</span>
            <div class="value">${generatedCredentials.enrollment_id}</div>
          </div>

          <div class="field">
            <span class="label">Password:</span>
            <div class="value">${generatedCredentials.password}</div>
          </div>
        </div>

        <div class="important">
          <strong>Important Instructions:</strong>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>Keep these credentials secure and confidential</li>
            <li>Use these to log in to the library system</li>
            <li>Contact the librarian if you forget your password</li>
          </ul>
        </div>

        <div class="footer">
          <p>Printed on: ${new Date().toLocaleString()}</p>
          <p>IISBenin Library - Computer Science Department</p>
        </div>

        <script>
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  if (loading) {
    return <LoadingSkeleton type="list" />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Add/Bulk Register Buttons */}
      {!isAddingStudent && !showBulkRegister ? (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {students.length} student{students.length !== 1 ? 's' : ''} registered
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkRegister(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px]"
              >
                <Upload className="h-5 w-5" />
                Bulk Register
              </button>
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px]"
              >
                <Plus className="h-5 w-5" />
                Register Student
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, grade, or enrollment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
            />
          </div>
        </>
      ) : (
        <div>
          <button
            onClick={() => {
              setIsAddingStudent(false);
              setShowBulkRegister(false);
              setEditingStudent(null);
            }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors mb-4"
          >
            <X className="h-5 w-5" />
            Back to List
          </button>
        </div>
      )}

      {/* Bulk Register View */}
      {showBulkRegister && (
        <BulkUserRegistration />
      )}

      {/* Add/Edit Student Form */}
      {isAddingStudent && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg">
              <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingStudent ? 'Edit Student' : 'Register New Student'}
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Grade Level *
                </label>
                <input
                  type="text"
                  value={formData.grade_level}
                  onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
                  placeholder="e.g., JSS1, SS2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parent Email (Optional)
                </label>
                <input
                  type="email"
                  value={formData.parent_email}
                  onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-600 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px]"
                  placeholder="parent@example.com"
                />
              </div>
            </div>

            {!editingStudent && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">Auto-Generated Credentials</p>
                <p className="text-xs mt-1">Enrollment ID and password will be generated automatically and displayed after registration.</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px] font-medium"
              >
                {editingStudent ? 'Update Student' : 'Register Student'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 min-h-[44px] font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Student List Table */}
      {!isAddingStudent && !showBulkRegister && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Enrollment ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{student.grade_level}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-mono">{student.enrollment_id || '-'}</td>
                                    <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewHistory(student)}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-50 dark:hover:bg-slate-900/20 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="View History"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openResetPassword(student)}
                        className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors p-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Reset Password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal(student)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {Math.ceil(totalStudents / studentsPerPage)}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalStudents / studentsPerPage)))}
            disabled={currentPage === Math.ceil(totalStudents / studentsPerPage)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
      )}

      {showCredentials && generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full my-4 sm:my-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Student Credentials</h3>
              <button onClick={() => setShowCredentials(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium mb-2">Student registered successfully!</p>
                <p className="text-sm text-green-700">Please provide these credentials to the student:</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment ID</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedCredentials.enrollment_id}
                      readOnly
                      className="flex-1 px-3 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={generatedCredentials.password}
                      readOnly
                      className="flex-1 px-3 py-3 border border-gray-300 rounded-lg bg-gray-50 font-mono min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p className="text-xs mt-1">Save these credentials now. They cannot be retrieved later.</p>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex gap-3 p-4 sm:p-6 pt-3 border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <button
                onClick={printCredentials}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] font-medium"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                onClick={() => setShowCredentials(false)}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-2xl w-full my-4 sm:my-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-2">
                Borrowing History - {selectedStudent.name}
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0">
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4">
              {selectedStudent.borrow_records && selectedStudent.borrow_records.length > 0 ? (
                <div className="space-y-4">
                  {selectedStudent.borrow_records.map((record, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{record.books?.title || 'Unknown Book'}</p>
                          <p className="text-sm text-gray-600">
                            Borrowed: {new Date(record.borrow_date).toLocaleDateString()}
                          </p>
                          {record.return_date && (
                            <p className="text-sm text-gray-600">
                              Returned: {new Date(record.return_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          record.return_date
                            ? 'bg-green-100 text-green-800'
                            : new Date(record.due_date) < new Date()
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {record.return_date ? 'Returned' : new Date(record.due_date) < new Date() ? 'Overdue' : 'Borrowed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No borrowing history found.</p>
              )}
            </div>

            {/* Fixed Footer */}
            <div className="p-4 sm:p-6 pt-3 border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <button
                onClick={() => setShowHistory(false)}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetPassword && resetPasswordStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full my-4 sm:my-8 shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 pb-3 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Reset Password</h3>
              <button onClick={() => setShowResetPassword(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-amber-800 font-medium mb-2">Confirm Password Reset</p>
                <p className="text-sm text-amber-700">
                  You are about to reset the password for:
                </p>
                <p className="text-sm text-amber-900 font-semibold mt-2">
                  {resetPasswordStudent.name} ({resetPasswordStudent.enrollment_id})
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium">What happens next:</p>
                <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                  <li>A new random password will be generated</li>
                  <li>The student's current password will be replaced</li>
                  <li>You will receive the new credentials to share with the student</li>
                </ul>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex gap-3 p-4 sm:p-6 pt-3 border-t border-gray-200 flex-shrink-0 bg-gray-50">
              <button
                type="button"
                onClick={() => setShowResetPassword(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors min-h-[44px] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors min-h-[44px] font-medium"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
