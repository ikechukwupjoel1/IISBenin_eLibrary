import React, { useState } from 'react';
import { FileText, Star, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

type BookReportFormProps = {
  borrowId: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export function BookReportForm({
  borrowId,
  bookId,
  bookTitle,
  userId,
  onClose,
  onSubmitted
}: BookReportFormProps) {
  const [formData, setFormData] = useState({
    title: bookTitle,
    summary: '',
    favorite_part: '',
    main_characters: '',
    lessons_learned: '',
    rating: 5,
    completion_percentage: 100
  });
  const [submitting, setSubmitting] = useState(false);

  const wordCount = formData.summary.trim().split(/\s+/).filter(w => w.length > 0).length;
  const isValidSummary = wordCount >= 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidSummary) {
      toast.error('Summary must be at least 100 words');
      return;
    }

    if (!formData.favorite_part || !formData.main_characters || !formData.lessons_learned) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('book_reports').insert({
        borrow_record_id: borrowId,
        book_id: bookId,
        user_id: userId,
        title: formData.title,
        summary: formData.summary,
        favorite_part: formData.favorite_part,
        main_characters: formData.main_characters,
        lessons_learned: formData.lessons_learned,
        rating: formData.rating,
        completion_percentage: formData.completion_percentage,
        status: 'pending'
      });

      if (error) throw error;

      toast.success('Book report submitted successfully! Awaiting review.');
      onSubmitted();
      onClose();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      toast.error(error.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-indigo-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Submit Book Report
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {bookTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Summary <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2">
                (Minimum 100 words - Current: {wordCount} words)
              </span>
            </label>
            <textarea
              required
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Write a detailed summary of what the book was about. Include the main plot, key events, and overall story..."
              rows={6}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                !isValidSummary && formData.summary ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {!isValidSummary && formData.summary && (
              <p className="text-sm text-red-500 mt-1">
                Need {100 - wordCount} more words
              </p>
            )}
          </div>

          {/* Favorite Part */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Favorite Part <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.favorite_part}
              onChange={(e) => setFormData({ ...formData, favorite_part: e.target.value })}
              placeholder="What part of the book did you like the most and why?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Main Characters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Main Characters <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.main_characters}
              onChange={(e) => setFormData({ ...formData, main_characters: e.target.value })}
              placeholder="Who were the main characters? Describe them briefly..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Lessons Learned */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Lessons Learned <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.lessons_learned}
              onChange={(e) => setFormData({ ...formData, lessons_learned: e.target.value })}
              placeholder="What did you learn from this book? What message or moral did it teach?"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Rating <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= formData.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                ({formData.rating}/5)
              </span>
            </div>
          </div>

          {/* Completion Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Did you finish the book?
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={formData.completion_percentage === 100}
                    onChange={() => setFormData({ ...formData, completion_percentage: 100 })}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Yes, I finished it (100%)
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={formData.completion_percentage !== 100}
                    onChange={() => setFormData({ ...formData, completion_percentage: 80 })}
                    className="w-4 h-4 text-indigo-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    No, I read partially
                  </span>
                </label>
                {formData.completion_percentage !== 100 && (
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.completion_percentage}
                    onChange={(e) =>
                      setFormData({ ...formData, completion_percentage: parseInt(e.target.value) || 0 })
                    }
                    className="w-20 px-2 py-1 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                )}
                {formData.completion_percentage !== 100 && (
                  <span className="text-sm text-gray-500">%</span>
                )}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
            <p className="text-sm text-indigo-900 dark:text-indigo-200">
              <strong>📊 Point System:</strong> Your report will be reviewed by a librarian or staff member. 
              You can earn 10-25 points based on report quality and completion. High-quality, detailed 
              reports earn more points for the leaderboard!
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isValidSummary}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
