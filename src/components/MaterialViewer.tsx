import React from 'react';
import { X, AlertCircle } from 'lucide-react';

type MaterialViewerProps = {
  url: string;
  title: string;
  onClose: () => void;
};

export function MaterialViewer({ url, title, onClose }: MaterialViewerProps) {
  const isPDF = url.toLowerCase().includes('.pdf') || url.includes('pdf');
  const googleDocsViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full h-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 truncate">{title}</h3>
            <p className="text-sm text-gray-600">Read-only view</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 relative overflow-hidden">
          {isPDF ? (
            <iframe
              src={googleDocsViewerUrl}
              className="w-full h-full border-0"
              title={title}
              sandbox="allow-same-origin allow-scripts"
            />
          ) : (
            <iframe
              src={url}
              className="w-full h-full border-0"
              title={title}
              sandbox="allow-same-origin allow-scripts allow-popups"
            />
          )}
        </div>

        <div className="p-3 border-t border-gray-200 bg-yellow-50">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-yellow-800">
              <p className="font-semibold">Read-Only Access</p>
              <p className="text-xs mt-1">
                This material is for viewing only. Downloading is restricted for students.
                Use the in-app viewer to read the content.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
