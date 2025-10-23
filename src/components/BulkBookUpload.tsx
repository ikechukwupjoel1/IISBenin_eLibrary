import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type UploadResult = {
  row: number;
  title: string;
  status: 'success' | 'error';
  message: string;
};

export function BulkBookUpload() {
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);

  const downloadTemplate = () => {
    const csvContent = `title,author,isbn,category,material_type,publisher,publication_year,pages,quantity,location,description
"The Great Gatsby","F. Scott Fitzgerald","9780743273565","Fiction","book","Scribner",1925,180,5,"Shelf A1","Classic American novel"
"To Kill a Mockingbird","Harper Lee","9780061120084","Fiction","book","Harper Perennial",1960,324,3,"Shelf A2","Pulitzer Prize winner"
"1984","George Orwell","9780451524935","Fiction","book","Signet Classic",1949,328,4,"Shelf A3","Dystopian masterpiece"`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_books_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Template downloaded!');
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const books: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let char of lines[i]) {
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
        const book: any = {};
        headers.forEach((header, index) => {
          book[header] = values[index];
        });
        books.push(book);
      }
    }

    return books;
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
      const books = parseCSV(text);

      if (books.length === 0) {
        toast.error('No valid books found in CSV');
        setUploading(false);
        return;
      }

      toast.loading(`Uploading ${books.length} books...`, { id: 'bulk-upload' });

      const uploadResults: UploadResult[] = [];

      for (let i = 0; i < books.length; i++) {
        const book = books[i];
        
        try {
          // Validate required fields
          if (!book.title || !book.author) {
            uploadResults.push({
              row: i + 2,
              title: book.title || 'Unknown',
              status: 'error',
              message: 'Missing required fields (title, author)',
            });
            continue;
          }

          // Convert fields to proper types
          const bookData = {
            title: book.title,
            author: book.author,
            isbn: book.isbn || null,
            category: book.category || 'General',
            material_type: book.material_type || 'book',
            publisher: book.publisher || null,
            publication_year: book.publication_year ? parseInt(book.publication_year) : null,
            pages: book.pages ? parseInt(book.pages) : null,
            quantity: book.quantity ? parseInt(book.quantity) : 1,
            available_quantity: book.quantity ? parseInt(book.quantity) : 1,
            location: book.location || null,
            description: book.description || null,
            status: 'available',
          };

          const { error } = await supabase
            .from('books')
            .insert([bookData]);

          if (error) {
            uploadResults.push({
              row: i + 2,
              title: book.title,
              status: 'error',
              message: error.message,
            });
          } else {
            uploadResults.push({
              row: i + 2,
              title: book.title,
              status: 'success',
              message: 'Successfully uploaded',
            });
          }
        } catch (err: any) {
          uploadResults.push({
            row: i + 2,
            title: book.title,
            status: 'error',
            message: err.message,
          });
        }
      }

      setResults(uploadResults);

      const successCount = uploadResults.filter(r => r.status === 'success').length;
      const errorCount = uploadResults.filter(r => r.status === 'error').length;

      toast.success(`Upload complete! ${successCount} books added, ${errorCount} failed`, { id: 'bulk-upload' });
    } catch (error: any) {
      toast.error(`Error reading file: ${error.message}`, { id: 'bulk-upload' });
    }

    setUploading(false);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileSpreadsheet className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bulk Book Upload</h2>
            <p className="text-sm text-gray-500">Upload multiple books at once using CSV file</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions:</h3>
          <ol className="text-sm text-blue-800 space-y-1 ml-4 list-decimal">
            <li>Download the CSV template below</li>
            <li>Fill in your book data (one book per row)</li>
            <li>Required fields: title, author</li>
            <li>Optional: isbn, category, publisher, publication_year, pages, quantity, location, description</li>
            <li>Upload the completed CSV file</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-5 w-5" />
            Download CSV Template
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
              <h3 className="font-semibold text-gray-900">Upload Results</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Row</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-4 py-2 text-sm text-gray-600">{result.row}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{result.title}</td>
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
