import { useState } from 'react';
import { FileText, Download, Calendar, Users, BookOpen, TrendingUp, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

type ReportType = 'circulation' | 'user_activity' | 'inventory' | 'overdue' | 'popular_books';
type ExportFormat = 'pdf' | 'csv' | 'excel';

export function ReportsExports() {
  const { profile } = useAuth();
  const [reportType, setReportType] = useState<ReportType>('circulation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [generating, setGenerating] = useState(false);

  const reportTypes = [
    { id: 'circulation' as ReportType, label: 'Circulation Report', icon: BookOpen, description: 'Books borrowed and returned' },
    { id: 'user_activity' as ReportType, label: 'User Activity', icon: Users, description: 'User engagement and statistics' },
    { id: 'inventory' as ReportType, label: 'Inventory Report', icon: TrendingUp, description: 'Current book inventory status' },
    { id: 'overdue' as ReportType, label: 'Overdue Report', icon: Calendar, description: 'Overdue books and fines' },
    { id: 'popular_books' as ReportType, label: 'Popular Books', icon: TrendingUp, description: 'Most borrowed books' },
  ];

  const generateCSV = async () => {
    setGenerating(true);
    toast.loading('Generating CSV report...');

    try {
      let csvContent = '';
      let filename = '';

      switch (reportType) {
        case 'circulation':
          csvContent = await generateCirculationCSV();
          filename = `circulation-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'user_activity':
          csvContent = await generateUserActivityCSV();
          filename = `user-activity-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'inventory':
          csvContent = await generateInventoryCSV();
          filename = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'overdue':
          csvContent = await generateOverdueCSV();
          filename = `overdue-report-${new Date().toISOString().split('T')[0]}.csv`;
          break;
        case 'popular_books':
          csvContent = await generatePopularBooksCSV();
          filename = `popular-books-${new Date().toISOString().split('T')[0]}.csv`;
          break;
      }

      // Create and download the CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss();
      toast.success('CSV report generated successfully!');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.dismiss();
      toast.error('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const generateCirculationCSV = async (): Promise<string> => {
    let query = supabase
      .from('borrow_records')
      .select(`
        id,
        borrowed_at,
        due_date,
        returned_at,
        user_id,
        book_id
      `)
      .order('borrowed_at', { ascending: false });

    if (startDate) query = query.gte('borrowed_at', startDate);
    if (endDate) query = query.lte('borrowed_at', endDate);

    const { data: borrows } = await query;
    if (!borrows) return '';

    // Get user and book details
    const userIds = [...new Set(borrows.map(b => b.user_id))];
    const bookIds = [...new Set(borrows.map(b => b.book_id))];

    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, enrollment_id')
      .in('id', userIds);

    const { data: books } = await supabase
      .from('books')
      .select('id, title, author, isbn')
      .in('id', bookIds);

    // Create CSV
    let csv = 'Borrow ID,Borrowed Date,Due Date,Returned Date,Status,User Name,Enrollment ID,Book Title,Author,ISBN\n';
    
    borrows.forEach(borrow => {
      const user = users?.find(u => u.id === borrow.user_id);
      const book = books?.find(b => b.id === borrow.book_id);
      const status = borrow.returned_at 
        ? 'Returned' 
        : new Date(borrow.due_date) < new Date() 
          ? 'Overdue' 
          : 'Active';

      csv += `"${borrow.id}",`;
      csv += `"${new Date(borrow.borrowed_at).toLocaleDateString()}",`;
      csv += `"${new Date(borrow.due_date).toLocaleDateString()}",`;
      csv += `"${borrow.returned_at ? new Date(borrow.returned_at).toLocaleDateString() : 'Not Returned'}",`;
      csv += `"${status}",`;
      csv += `"${user?.full_name || 'Unknown'}",`;
      csv += `"${user?.enrollment_id || 'N/A'}",`;
      csv += `"${book?.title || 'Unknown'}",`;
      csv += `"${book?.author || 'Unknown'}",`;
      csv += `"${book?.isbn || 'N/A'}"\n`;
    });

    return csv;
  };

  const generateUserActivityCSV = async (): Promise<string> => {
    let query = supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: users } = await query;
    if (!users) return '';

    // Get borrow counts for each user
    const { data: borrowCounts } = await supabase
      .from('borrow_records')
      .select('user_id');

    const userBorrows: { [key: string]: number } = {};
    borrowCounts?.forEach(record => {
      userBorrows[record.user_id] = (userBorrows[record.user_id] || 0) + 1;
    });

    // Get login counts
    const { data: loginCounts } = await supabase
      .from('login_logs')
      .select('user_id');

    const userLogins: { [key: string]: number } = {};
    loginCounts?.forEach(record => {
      userLogins[record.user_id] = (userLogins[record.user_id] || 0) + 1;
    });

    // Create CSV
    let csv = 'User ID,Name,Enrollment ID,Role,Joined Date,Total Borrows,Total Logins,Status\n';
    
    users.forEach(user => {
      csv += `"${user.id}",`;
      csv += `"${user.full_name}",`;
      csv += `"${user.enrollment_id || 'N/A'}",`;
      csv += `"${user.role}",`;
      csv += `"${new Date(user.created_at).toLocaleDateString()}",`;
      csv += `"${userBorrows[user.id] || 0}",`;
      csv += `"${userLogins[user.id] || 0}",`;
      csv += `"Active"\n`;
    });

    return csv;
  };

  const generateInventoryCSV = async (): Promise<string> => {
    const { data: books } = await supabase
      .from('books')
      .select('*')
      .order('title');

    if (!books) return '';

    // Get borrow counts
    const { data: borrowCounts } = await supabase
      .from('borrow_records')
      .select('book_id');

    const bookBorrows: { [key: string]: number } = {};
    borrowCounts?.forEach(record => {
      bookBorrows[record.book_id] = (bookBorrows[record.book_id] || 0) + 1;
    });

    // Create CSV
    let csv = 'Book ID,Title,Author,ISBN,Category,Status,Location,Times Borrowed,Total Quantity\n';
    
    books.forEach(book => {
      csv += `"${book.id}",`;
      csv += `"${book.title}",`;
      csv += `"${book.author}",`;
      csv += `"${book.isbn || 'N/A'}",`;
      csv += `"${book.category}",`;
      csv += `"${book.status}",`;
      csv += `"${book.shelf_location || 'N/A'}",`;
      csv += `"${bookBorrows[book.id] || 0}",`;
      csv += `"${book.total_quantity || 1}"\n`;
    });

    return csv;
  };

  const generateOverdueCSV = async (): Promise<string> => {
    const { data: overdue } = await supabase
      .from('borrow_records')
      .select('*')
      .is('returned_at', null)
      .lt('due_date', new Date().toISOString())
      .order('due_date', { ascending: true });

    if (!overdue) return '';

    // Get user and book details
    const userIds = [...new Set(overdue.map(b => b.user_id))];
    const bookIds = [...new Set(overdue.map(b => b.book_id))];

    const { data: users } = await supabase
      .from('user_profiles')
      .select('id, full_name, enrollment_id, email, phone')
      .in('id', userIds);

    const { data: books } = await supabase
      .from('books')
      .select('id, title, author, isbn')
      .in('id', bookIds);

    // Create CSV
    let csv = 'Borrow ID,User Name,Enrollment ID,Email,Phone,Book Title,Author,Borrowed Date,Due Date,Days Overdue\n';
    
    overdue.forEach(borrow => {
      const user = users?.find(u => u.id === borrow.user_id);
      const book = books?.find(b => b.id === borrow.book_id);
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(borrow.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      csv += `"${borrow.id}",`;
      csv += `"${user?.full_name || 'Unknown'}",`;
      csv += `"${user?.enrollment_id || 'N/A'}",`;
      csv += `"${user?.email || 'N/A'}",`;
      csv += `"${user?.phone || 'N/A'}",`;
      csv += `"${book?.title || 'Unknown'}",`;
      csv += `"${book?.author || 'Unknown'}",`;
      csv += `"${new Date(borrow.borrowed_at).toLocaleDateString()}",`;
      csv += `"${new Date(borrow.due_date).toLocaleDateString()}",`;
      csv += `"${daysOverdue}"\n`;
    });

    return csv;
  };

  const generatePopularBooksCSV = async (): Promise<string> => {
    // Get all borrows
    let query = supabase
      .from('borrow_records')
      .select('book_id');

    if (startDate) query = query.gte('borrowed_at', startDate);
    if (endDate) query = query.lte('borrowed_at', endDate);

    const { data: borrows } = await query;
    if (!borrows) return '';

    // Count borrows per book
    const bookCounts: { [key: string]: number } = {};
    borrows.forEach(record => {
      bookCounts[record.book_id] = (bookCounts[record.book_id] || 0) + 1;
    });

    // Get book details
    const bookIds = Object.keys(bookCounts);
    const { data: books } = await supabase
      .from('books')
      .select('id, title, author, category, isbn')
      .in('id', bookIds);

    if (!books) return '';

    // Sort by borrow count
    const sortedBooks = books
      .map(book => ({
        ...book,
        borrow_count: bookCounts[book.id],
      }))
      .sort((a, b) => b.borrow_count - a.borrow_count);

    // Create CSV
    let csv = 'Rank,Book Title,Author,Category,ISBN,Times Borrowed\n';
    
    sortedBooks.forEach((book, index) => {
      csv += `"${index + 1}",`;
      csv += `"${book.title}",`;
      csv += `"${book.author}",`;
      csv += `"${book.category}",`;
      csv += `"${book.isbn || 'N/A'}",`;
      csv += `"${book.borrow_count}"\n`;
    });

    return csv;
  };

  if (profile?.role !== 'librarian') {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">This feature is only available to librarians.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-indigo-100 p-3 rounded-xl">
          <FileText className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Exports</h2>
          <p className="text-sm text-gray-600">Generate and download library reports</p>
        </div>
      </div>

      {/* Report Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Report Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Report Type</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    reportType === type.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 ${reportType === type.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                    <div>
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Range Filter */}
        {(reportType === 'circulation' || reportType === 'popular_books') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Filter className="inline h-4 w-4 mr-1" />
              Date Range (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={generateCSV}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="h-5 w-5" />
              {generating ? 'Generating...' : 'Export as CSV'}
            </button>
            
            <button
              disabled={true}
              className="flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
              title="Excel export coming soon"
            >
              <Download className="h-5 w-5" />
              Export as Excel (Coming Soon)
            </button>
            
            <button
              disabled={true}
              className="flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
              title="PDF export coming soon"
            >
              <Download className="h-5 w-5" />
              Export as PDF (Coming Soon)
            </button>
          </div>
        </div>
      </div>

      {/* Report Preview Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 mb-2">Report Details</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {reportType === 'circulation' && (
            <p>Includes all borrow records with user details, book information, and return status.</p>
          )}
          {reportType === 'user_activity' && (
            <p>Shows user statistics including total borrows, logins, and account information.</p>
          )}
          {reportType === 'inventory' && (
            <p>Complete book catalog with current status, location, and circulation statistics.</p>
          )}
          {reportType === 'overdue' && (
            <p>Lists all overdue books with borrower contact information and days overdue.</p>
          )}
          {reportType === 'popular_books' && (
            <p>Ranks books by popularity based on borrowing frequency.</p>
          )}
        </div>
      </div>
    </div>
  );
}
