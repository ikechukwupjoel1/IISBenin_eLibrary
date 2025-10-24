import React, { useEffect, useState } from 'react';
import { BookMarked, Calendar, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, type Book, type Student, type Staff, type BorrowRecord } from '../lib/supabase';
import { ConfirmDialog } from './ui/ConfirmDialog';

type BorrowRecordWithDetails = BorrowRecord & {
  books?: Book;
  students?: Student;
  staff?: Staff;
};

export function BorrowingSystem() {
  const [books, setBooks] = useState<Book[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [borrowRecords, setBorrowRecords] = useState<BorrowRecordWithDetails[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [borrowerType, setBorrowerType] = useState<'student' | 'staff'>('student');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [activeTab, setActiveTab] = useState<'borrow' | 'active' | 'overdue'>('borrow');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<'all' | 'physical' | 'ebook' | 'electronic'>('all');

  // Get unique grade levels from students
  const gradeLevels = Array.from(new Set(students.map(s => s.grade_level).filter(Boolean))).sort();

  useEffect(() => {
    loadData();
    
    // Set up real-time subscription for borrow records
    const channel = supabase
      .channel('borrowing-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'borrow_records',
        },
        (payload) => {
          console.log('📖 Borrow record changed:', payload);
          // Reload data when any borrow record changes
          loadData();
        }
      )
      .subscribe((status) => {
        console.log('📡 Borrowing subscription status:', status);
      });
    
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    const [booksResult, studentsResult, staffResult, recordsResult] = await Promise.all([
      // Only show books with available status for borrowing
      supabase.from('books').select('*').eq('status', 'available').order('title'),
      supabase.from('students').select('*').order('name'),
      supabase.from('staff').select('*').order('name'),
      supabase.from('borrow_records').select(`
        *,
        books (*),
        students (*),
        staff (*)
      `).in('status', ['active', 'overdue']).order('due_date'),
    ]);

    if (booksResult.data) setBooks(booksResult.data);
    if (studentsResult.data) setStudents(studentsResult.data);
    if (staffResult.data) setStaff(staffResult.data);
    if (recordsResult.data) setBorrowRecords(recordsResult.data as any);
  };

  const handleBorrow = async (e: React.FormEvent) => {
    e.preventDefault();

    const borrowerId = borrowerType === 'student' ? selectedStudent : selectedStaff;
    if (!selectedBook || !borrowerId || !dueDate) return;

    const borrowRecord: any = {
      book_id: selectedBook,
      due_date: dueDate,
      status: 'active',
    };

    if (borrowerType === 'student') {
      borrowRecord.student_id = selectedStudent;
    } else {
      borrowRecord.staff_id = selectedStaff;
    }

    const { error: recordError } = await supabase
      .from('borrow_records')
      .insert([borrowRecord]);

    if (recordError) {
      toast.error('Error creating borrow record');
      return;
    }

    const book = books.find(b => b.id === selectedBook);
    if (!book) {
      toast.error('Book not found');
      return;
    }

    const newAvailableCopies = (book.available_copies || 1) - 1;
    const newStatus = newAvailableCopies === 0 ? 'borrowed' : 'available';

    const { error: bookError } = await supabase
      .from('books')
      .update({
        available_copies: newAvailableCopies,
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedBook);

    if (bookError) {
      toast.error('Error updating book availability');
      return;
    }

    toast.success('Book borrowed successfully!');

    setSelectedBook('');
    setSelectedStudent('');
    setSelectedStaff('');
    setBorrowerType('student');
    setDueDate('');
    loadData();
  };

  const handleReturn = async (recordId: string, bookId: string) => {
    const { error: recordError } = await supabase
      .from('borrow_records')
      .update({
        return_date: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', recordId);

    if (recordError) {
      toast.error('Error updating borrow record');
      return;
    }

    const { data: book } = await supabase
      .from('books')
      .select('available_copies, total_copies')
      .eq('id', bookId)
      .single();

    if (!book) {
      toast.error('Book not found');
      return;
    }

    const newAvailableCopies = (book.available_copies || 0) + 1;

    const { error: bookError } = await supabase
      .from('books')
      .update({
        available_copies: newAvailableCopies,
        status: 'available',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookId);

    if (bookError) {
      toast.error('Error updating book availability');
      return;
    }

    toast.success('Book returned successfully!');
    loadData();
  };

  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const activeRecords = borrowRecords.filter(r => !isOverdue(r.due_date));
  const overdueRecords = borrowRecords.filter(r => isOverdue(r.due_date));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Borrowing System</h2>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('borrow')}
          className={`px-4 py-2 font-medium transition-all duration-200 min-h-[44px] ${
            activeTab === 'borrow'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Borrow Book
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium transition-all duration-200 min-h-[44px] ${
            activeTab === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Active Borrows ({activeRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-4 py-2 font-medium transition-all duration-200 min-h-[44px] ${
            activeTab === 'overdue'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Overdue ({overdueRecords.length})
        </button>
      </div>

      {activeTab === 'borrow' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center gap-2 mb-6">
            <BookMarked className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">New Borrow Transaction</h3>
          </div>

          <form onSubmit={handleBorrow} className="space-y-4">
            {/* Step 1: Borrower Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="text-blue-600 font-semibold">Step 1:</span> Borrower Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="student"
                    checked={borrowerType === 'student'}
                    onChange={(e) => {
                      setBorrowerType(e.target.value as 'student' | 'staff');
                      setSelectedGrade('');
                      setSelectedStudent('');
                      setSelectedStaff('');
                      setSelectedBook('');
                    }}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Student</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="staff"
                    checked={borrowerType === 'staff'}
                    onChange={(e) => {
                      setBorrowerType(e.target.value as 'student' | 'staff');
                      setSelectedGrade('');
                      setSelectedStudent('');
                      setSelectedStaff('');
                      setSelectedBook('');
                    }}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Staff</span>
                </label>
              </div>
            </div>

            {borrowerType === 'student' ? (
              <>
                {/* Step 2: Select Grade Level (for students only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="text-blue-600 font-semibold">Step 2:</span> Select Grade Level
                  </label>
                  <select
                    value={selectedGrade}
                    onChange={(e) => {
                      setSelectedGrade(e.target.value);
                      setSelectedStudent('');
                      setSelectedBook('');
                    }}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                    required
                  >
                    <option value="">Choose grade level first...</option>
                    {gradeLevels.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade}
                      </option>
                    ))}
                  </select>
                  {!selectedGrade && (
                    <p className="mt-1 text-sm text-gray-500">
                      ℹ️ Select a grade level to see students and available books
                    </p>
                  )}
                </div>

                {/* Step 3: Select Student (filtered by grade) */}
                {selectedGrade && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="text-blue-600 font-semibold">Step 3:</span> Select Student from {selectedGrade}
                    </label>
                    <select
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                      required
                    >
                      <option value="">Choose a student...</option>
                      {students
                        .filter(student => student.grade_level === selectedGrade)
                        .map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.name} - {student.enrollment_id}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-sm text-green-600">
                      ✓ Showing {students.filter(s => s.grade_level === selectedGrade).length} student(s) in {selectedGrade}
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Staff Selection (no grade filtering needed) */
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-blue-600 font-semibold">Step 2:</span> Select Staff Member
                </label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                  required
                >
                  <option value="">Choose a staff member...</option>
                  {staff.map((staffMember) => (
                    <option key={staffMember.id} value={staffMember.id}>
                      {staffMember.name} - {staffMember.enrollment_id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Step 4: Material Type Filter */}
            {(borrowerType === 'staff' || selectedGrade) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-blue-600 font-semibold">Step {borrowerType === 'student' ? '4' : '3'}:</span> Material Type (Optional Filter)
                </label>
                <select
                  value={materialTypeFilter}
                  onChange={(e) => setMaterialTypeFilter(e.target.value as 'all' | 'physical' | 'ebook' | 'electronic')}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                >
                  <option value="all">All Materials</option>
                  <option value="physical">Physical Books Only</option>
                  <option value="ebook">eBooks Only</option>
                  <option value="electronic">Electronic Materials Only</option>
                </select>
              </div>
            )}

            {/* Step 5: Select Book (filtered by grade and material type) */}
            {(borrowerType === 'staff' || selectedGrade) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-blue-600 font-semibold">Step {borrowerType === 'student' ? '5' : '4'}:</span> Select Book
                  {borrowerType === 'student' && selectedGrade && (
                    <span className="text-sm text-gray-500 ml-2">
                      (Books suitable for {selectedGrade})
                    </span>
                  )}
                </label>
                <select
                  value={selectedBook}
                  onChange={(e) => setSelectedBook(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                  required
                >
                  <option value="">Choose a book...</option>
                  {books
                    .filter((book) => {
                      // Material type filter
                      if (materialTypeFilter !== 'all') {
                        const bookType = book.material_type || 'physical';
                        if (materialTypeFilter !== bookType) return false;
                      }
                      
                      // For students, filter by grade level appropriateness
                      // You can customize this logic based on your grade/book categorization
                      if (borrowerType === 'student' && selectedGrade) {
                        // Example: Check if book category or tags include the grade
                        // This is a simplified version - adjust based on your data structure
                        return true; // For now, show all books. You can add grade-specific filtering here
                      }
                      
                      return true;
                    })
                    .map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.title} by {book.author} - {book.material_type || 'Physical Book'}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-sm text-green-600">
                  ✓ {books.filter(b => {
                    if (materialTypeFilter !== 'all') {
                      return (b.material_type || 'physical') === materialTypeFilter;
                    }
                    return true;
                  }).length} book(s) available
                </p>
              </div>
            )}

            {/* Step 6: Due Date */}
            {selectedBook && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <span className="text-blue-600 font-semibold">Step {borrowerType === 'student' ? '6' : '5'}:</span> Return Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                    required
                  />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  ℹ️ Standard loan period is 14 days
                </p>
              </div>
            )}

            {/* Submit Button - Only show when all required fields are selected */}
            {selectedBook && dueDate && (
              <div className="pt-4 border-t">
                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors min-h-[44px] flex items-center justify-center gap-2"
                >
                  <BookMarked className="h-5 w-5" />
                  Complete Borrow Transaction
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {activeTab === 'active' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrower</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrow Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {record.students ? (
                        <>
                          <div className="font-medium text-gray-900">{record.students.name}</div>
                          <div className="text-gray-600">{record.students.class}</div>
                        </>
                      ) : record.staff ? (
                        <>
                          <div className="font-medium text-gray-900">{record.staff.name}</div>
                          <div className="text-gray-600">{record.staff.department} (Staff)</div>
                        </>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{record.books?.title}</div>
                      <div className="text-gray-600">{record.books?.author}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(record.borrow_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(record.due_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleReturn(record.id, record.book_id)}
                        className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-w-[88px] min-h-[44px]"
                      >
                        Return
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activeRecords.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                No active borrows at the moment.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'overdue' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {overdueRecords.length > 0 && (
            <div className="bg-red-50 border-b border-red-200 px-6 py-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                {overdueRecords.length} book{overdueRecords.length !== 1 ? 's' : ''} overdue
              </span>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrower</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Book</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Borrow Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Overdue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {overdueRecords.map((record) => {
                  const daysOverdue = Math.floor(
                    (new Date().getTime() - new Date(record.due_date).getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <tr key={record.id} className="hover:bg-gray-50 bg-red-50">
                      <td className="px-6 py-4 text-sm">
                        {record.students ? (
                          <>
                            <div className="font-medium text-gray-900">{record.students.name}</div>
                            <div className="text-gray-600">{record.students.class}</div>
                          </>
                        ) : record.staff ? (
                          <>
                            <div className="font-medium text-gray-900">{record.staff.name}</div>
                            <div className="text-gray-600">{record.staff.department} (Staff)</div>
                          </>
                        ) : null}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{record.books?.title}</div>
                        <div className="text-gray-600">{record.books?.author}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(record.borrow_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(record.due_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          {daysOverdue} days
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => handleReturn(record.id, record.book_id)}
                          className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                        >
                          Return
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {overdueRecords.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                No overdue books. Great job!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
