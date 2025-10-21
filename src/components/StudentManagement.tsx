import React, { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, X, History, KeyRound, Printer } from 'lucide-react';
import { supabase, type Student, type BorrowRecord, type Book } from '../lib/supabase';
import toast from 'react-hot-toast';

type StudentWithHistory = Student & {
  borrow_records?: (BorrowRecord & { books?: Book })[];
};

type GeneratedCredentials = {
  enrollment_id: string;
  password: string;
};

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
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
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setStudents(data);
    }
  };

  const filteredStudents = students.filter((student) =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.grade_level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.enrollment_id && student.enrollment_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const generateEnrollmentId = () => {
    return 'STU' + Date.now().toString().slice(-8);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
  const enrollmentId = generateEnrollmentId();
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
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
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

      // Get the auth user ID from user_profiles linked to this student
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('student_id', resetPasswordStudent.id)
        .maybeSingle();

      if (profileError || !profileData) {
        toast.error('Could not find user profile for this student');
        console.error('Profile error:', profileError);
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`;

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

      if (!response.ok || result.error) {
        toast.error('Error resetting password: ' + (result.error || 'Unknown error'));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Register Student
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, grade, or enrollment ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Enrollment ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{student.grade_level}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-mono">{student.enrollment_id || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewHistory(student)}
                        className="text-slate-600 hover:text-slate-800"
                        title="View History"
                      >
                        <History className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openResetPassword(student)}
                        className="text-amber-600 hover:text-amber-800"
                        title="Reset Password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal(student)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="text-red-600 hover:text-red-800"
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
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingStudent ? 'Edit Student' : 'Register New Student'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                <input
                  type="text"
                  value={formData.grade_level}
                  onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Grade 5A"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
                <input
                  type="email"
                  value={formData.parent_email}
                  onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter parent's email address"
                  required={!editingStudent}
                />
              </div>

              {!editingStudent && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  <p className="font-medium">Auto-Generated Credentials</p>
                  <p className="text-xs mt-1">Enrollment ID and password will be generated automatically and displayed after registration.</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingStudent ? 'Update' : 'Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCredentials && generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Student Credentials</h3>
              <button onClick={() => setShowCredentials(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
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
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <p className="font-medium">Important:</p>
                <p className="text-xs mt-1">Save these credentials now. They cannot be retrieved later.</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={printCredentials}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => setShowCredentials(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Borrowing History - {selectedStudent.name}
              </h3>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            {selectedStudent.borrow_records && selectedStudent.borrow_records.length > 0 ? (
              <div className="space-y-4">
                {selectedStudent.borrow_records.map((record: BorrowRecord & { books?: Book }) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900">{record.books?.title || 'Unknown Book'}</h4>
                    <p className="text-sm text-gray-600">by {record.books?.author_publisher || 'Unknown Author'}</p>
                    <div className="mt-2 text-sm text-gray-700">
                      <p>Borrowed: {new Date(record.borrow_date).toLocaleDateString()}</p>
                      <p>Due: {new Date(record.due_date).toLocaleDateString()}</p>
                      {record.return_date && (
                        <p>Returned: {new Date(record.return_date).toLocaleDateString()}</p>
                      )}
                      <span className={`inline-flex mt-2 px-2 py-1 text-xs font-semibold rounded-full ${
                        record.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : record.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No borrowing history found.</p>
            )}
          </div>
        </div>
      )}

      {showResetPassword && resetPasswordStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Reset Password</h3>
              <button onClick={() => setShowResetPassword(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetPassword(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPassword}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
