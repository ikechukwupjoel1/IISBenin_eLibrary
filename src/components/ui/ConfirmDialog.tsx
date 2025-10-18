import React from 'react';
import { AlertCircle, X } from 'lucide-react';

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
};

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700',
      bg: 'bg-red-50',
    },
    warning: {
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      bg: 'bg-yellow-50',
    },
    info: {
      icon: 'text-blue-600',
      button: 'bg-blue-600 hover:bg-blue-700',
      bg: 'bg-blue-50',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`${styles.bg} p-3 rounded-full`}>
              <AlertCircle className={`h-6 w-6 ${styles.icon}`} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm">{message}</p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 rounded-b-xl flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onCancel();
            }}
            className={`px-4 py-2 text-white rounded-lg font-medium transition-colors ${styles.button}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
