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
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [activeTab, setActiveTab] = useState<'borrow' | 'active' | 'overdue'>('borrow');
  const [materialTypeFilter, setMaterialTypeFilter] = useState<'all' | 'physical' | 'ebook' | 'electronic'>('all');

  useEffect(() => {
    loadData();
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
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'borrow'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Borrow Book
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Active Borrows ({activeRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'overdue'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Overdue ({overdueRecords.length})
        </button>
      </div>

      {activeTab === 'borrow' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookMarked className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">New Borrow Transaction</h3>
          </div>

          <form onSubmit={handleBorrow} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
              <select
                value={materialTypeFilter}
                onChange={(e) => setMaterialTypeFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Materials</option>
                <option value="physical">Physical Books Only</option>
                <option value="ebook">eBooks Only</option>
                <option value="electronic">Electronic Materials Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Borrower Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="student"
                    checked={borrowerType === 'student'}
                    onChange={(e) => {
                      setBorrowerType(e.target.value as 'student' | 'staff');
                      setSelectedStudent('');
                      setSelectedStaff('');
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
                      setSelectedStudent('');
                      setSelectedStaff('');
                    }}
                    className="text-blue-600"
                  />
                  <span className="text-sm text-gray-700">Staff</span>
                </label>
              </div>
            </div>

            {borrowerType === 'student' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a student...</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name} - {student.class} ({student.roll_number})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Staff</label>
                <select
                  value={selectedStaff}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Choose a staff member...</option>
                  {staff.map((staffMember) => (
                    <option key={staffMember.id} value={staffMember.id}>
                      {staffMember.name} - {staffMember.department} ({staffMember.employee_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Book</label>
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Choose a book...</option>
                {books
                  .filter((book) => {
                    if (materialTypeFilter === 'all') return true;
                    if (materialTypeFilter === 'physical') {
                      return !book.category?.toLowerCase().includes('ebook') && 
                             !book.category?.toLowerCase().includes('electronic');
                    }
                    if (materialTypeFilter === 'ebook') {
                      return book.category?.toLowerCase().includes('ebook');
                    }
                    if (materialTypeFilter === 'electronic') {
                      return book.category?.toLowerCase().includes('electronic');
                    }
                    return true;
                  })
                  .map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title} by {book.author} ({book.category || 'Uncategorized'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  defaultValue={getDefaultDueDate()}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Process Borrow
            </button>
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
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
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
