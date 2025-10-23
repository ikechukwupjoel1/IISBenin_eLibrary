import { useState } from 'react';
import { Upload, Download, Users, CheckCircle, XCircle, Key } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type UploadResult = {
  row: number;
  name: string;
  enrollmentId: string;
  password: string;
  status: 'success' | 'error';
  message: string;
};

export function BulkUserRegistration() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [userType, setUserType] = useState<'student' | 'staff'>('student');

  const generatePassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateEnrollmentId = (role: 'student' | 'staff'): string => {
    const prefix = role === 'student' ? 'STU' : 'STF';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${random}`;
  };

  const downloadTemplate = () => {
    const csvContent = userType === 'student' 
      ? `Name,Grade,Parent Email
"John Doe","Grade 7","parent1@example.com"
"Jane Smith","Grade 8","parent2@example.com"
"Bob Johnson","Grade 9","parent3@example.com"`
      : `full_name,email,phone,department,position
"Mary Manager","mary.manager@example.com","+2290153077528","Administration","Librarian"
"Tom Staff","tom.staff@example.com","+2290143088639","IT Department","Assistant"
"Sarah Support","sarah.support@example.com","+2290123456789","Library","Staff"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk_${userType}_registration_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const users: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ''));

      if (values.length === headers.length) {
        const user: Record<string, string> = {};
        headers.forEach((header, index) => {
          user[header] = values[index];
        });
        users.push(user);
      }
    }

    return users;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setUploading(true);
    setResults([]);

    try {
      const text = await file.text();
      const users = parseCSV(text);

      if (users.length === 0) {
        toast.error('No valid users found in CSV');
        setUploading(false);
        return;
      }

      toast.loading(`Registering ${users.length} ${userType}s...`, { id: 'bulk-register' });

      const uploadResults: UploadResult[] = [];

      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        try {
          // Map CSV headers - support both formats
          const fullName = user.Name || user.full_name;
          const grade = user.Grade || user.level;
          const email = user['Parent Email'] || user.email;
          const phone = user.phone;
          const department = user.department;
          const position = user.position;
          
          // Validate required fields based on user type
          if (userType === 'student') {
            if (!fullName || !grade || !email) {
              uploadResults.push({
                row: i + 2,
                name: fullName || 'Unknown',
                enrollmentId: '',
                password: '',
                status: 'error',
                message: 'Missing required fields (Name, Grade, Parent Email)',
              });
              continue;
            }
          } else {
            if (!fullName || !email) {
              uploadResults.push({
                row: i + 2,
                name: fullName || 'Unknown',
                enrollmentId: '',
                password: '',
                status: 'error',
                message: 'Missing required fields (full_name, email)',
              });
              continue;
            }
          }

          // Generate enrollment ID and password
          const enrollmentId = generateEnrollmentId(userType);
          const password = generatePassword();

          // Hash password using edge function
          let hashedPassword = password; // Fallback to plain text
          try {
            const hashResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hash-password`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              },
              body: JSON.stringify({ password }),
            });
            
            if (hashResponse.ok) {
              const hashData = await hashResponse.json();
              hashedPassword = hashData.hash;
            }
          } catch {
            console.warn('Password hashing failed, using plain text');
          }

          // Insert into students/staff table
          const tableName = userType === 'student' ? 'students' : 'staff';
          const recordData = {
            enrollment_id: enrollmentId,
            full_name: fullName,
            email: email,
            phone: phone || null,
            department: department || null,
            password_hash: hashedPassword,
            ...(userType === 'student' ? { level: grade || null } : { position: position || null })
          };

          const { data: record, error: recordError } = await supabase
            .from(tableName)
            .insert([recordData])
            .select()
            .single();

          if (recordError) {
            uploadResults.push({
              row: i + 2,
              name: fullName,
              enrollmentId: enrollmentId,
              password: password,
              status: 'error',
              message: recordError.message,
            });
            continue;
          }

          // Create user profile
          const baseProfileData = {
            id: record.id,
            email: email,
            full_name: fullName,
            role: userType,
            enrollment_id: enrollmentId,
            password_hash: hashedPassword,
          };

          const profileData = userType === 'student'
            ? { ...baseProfileData, student_id: record.id }
            : { ...baseProfileData, staff_id: record.id };

          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([profileData]);

          if (profileError) {
            // Rollback: delete the record
            await supabase.from(tableName).delete().eq('id', record.id);
            
            uploadResults.push({
              row: i + 2,
              name: fullName,
              enrollmentId: enrollmentId,
              password: password,
              status: 'error',
              message: `Profile creation failed: ${profileError.message}`,
            });
            continue;
          }

          uploadResults.push({
            row: i + 2,
            name: fullName,
            enrollmentId: enrollmentId,
            password: password,
            status: 'success',
            message: 'Successfully registered',
          });

        } catch (err) {
          uploadResults.push({
            row: i + 2,
            name: user.Name || user.full_name || 'Unknown',
            enrollmentId: '',
            password: '',
            status: 'error',
            message: err instanceof Error ? err.message : 'Unknown error occurred',
          });
        }
      }

      setResults(uploadResults);

      const successCount = uploadResults.filter(r => r.status === 'success').length;
      const errorCount = uploadResults.filter(r => r.status === 'error').length;

      toast.success(`Registration complete! ${successCount} users added, ${errorCount} failed`, { id: 'bulk-register' });
    } catch (error) {
      toast.error(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: 'bulk-register' });
    }

    setUploading(false);
  };

  const downloadCredentials = () => {
    const successfulUsers = results.filter(r => r.status === 'success');
    if (successfulUsers.length === 0) {
      toast.error('No successful registrations to download');
      return;
    }

    const csvContent = `Full Name,Enrollment ID,Password,Status\n` +
      successfulUsers.map(r => `"${r.name}","${r.enrollmentId}","${r.password}","Active"`).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userType}_credentials_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Credentials downloaded!');
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk User Registration</h2>
            <p className="text-sm text-gray-500">Register multiple students or staff at once</p>
          </div>
        </div>

        {/* User Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">User Type</label>
          <div className="flex gap-4">
            <button
              onClick={() => setUserType('student')}
              className={`px-4 py-2 rounded-lg font-medium ${
                userType === 'student'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setUserType('staff')}
              className={`px-4 py-2 rounded-lg font-medium ${
                userType === 'staff'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Staff
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions for {userType === 'student' ? 'Student' : 'Staff'} Registration:</h3>
          <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
            <li>Download the CSV template for {userType}s</li>
            <li>Fill in user data (one user per row)</li>
            <li>
              <strong>Required fields:</strong> full_name, email
              <br />
              <strong>Optional fields:</strong> phone, department
              {userType === 'student' && <>, level (e.g., 100, 200, 300)</>}
              {userType === 'staff' && <>, position (e.g., Librarian, Assistant, Clerk)</>}
            </li>
            <li>Enrollment IDs (STU/STF prefix) and passwords will be auto-generated</li>
            <li>Upload the completed CSV file</li>
            <li>Download the credentials file to distribute to users securely</li>
          </ol>
          
          {userType === 'student' && (
            <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-900">
              <strong>Student Template Columns:</strong> full_name, email, phone, department, level
            </div>
          )}
          
          {userType === 'staff' && (
            <div className="mt-3 p-2 bg-blue-100 rounded text-xs text-blue-900">
              <strong>Staff Template Columns:</strong> full_name, email, phone, department, position
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-5 w-5" />
            Download Template ({userType})
          </button>

          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            <Upload className="h-5 w-5" />
            Upload CSV File
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>

          {results.filter(r => r.status === 'success').length > 0 && (
            <button
              onClick={downloadCredentials}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <Key className="h-5 w-5" />
              Download Credentials
            </button>
          )}
        </div>

        {/* Results Summary */}
        {results.length > 0 && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Success: {successCount}</span>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  <span className="font-semibold">Failed: {errorCount}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Registration Results</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Row</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Enrollment ID</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Password</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-4 py-2 text-sm text-gray-600">{result.row}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{result.name}</td>
                      <td className="px-4 py-2 text-sm font-mono text-blue-600">{result.enrollmentId}</td>
                      <td className="px-4 py-2 text-sm font-mono text-purple-600">{result.password}</td>
                      <td className="px-4 py-2">
                        {result.status === 'success' ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            Success
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">{result.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {uploading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing CSV file...</p>
          </div>
        )}
      </div>
    </div>
  );
}
