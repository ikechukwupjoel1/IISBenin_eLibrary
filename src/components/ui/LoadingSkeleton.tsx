import React from 'react';

interface LoadingSkeletonProps {
  type?: 'analytics' | 'table' | 'cards' | 'dashboard' | 'list';
  title?: string;
  subtitle?: string;
}

export function LoadingSkeleton({ type = 'table', title, subtitle }: LoadingSkeletonProps) {
  if (type === 'analytics') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-200 p-3 rounded-xl animate-pulse h-14 w-14"></div>
            <div>
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="h-64 bg-gray-100 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'dashboard') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Card Skeleton */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6">
          <div className="h-8 w-64 bg-white/20 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-white/20 rounded animate-pulse"></div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>
              <div className="h-10 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'cards') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-center gap-3">
            <div className="bg-gray-200 p-3 rounded-xl animate-pulse h-14 w-14"></div>
            <div>
              {title && <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>}
              {subtitle && <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>}
            </div>
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-32 bg-gray-100 rounded-lg animate-pulse mb-4"></div>
              <div className="h-6 w-full bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'list') {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        {(title || subtitle) && (
          <div className="flex items-center gap-3">
            <div className="bg-gray-200 p-3 rounded-xl animate-pulse h-14 w-14"></div>
            <div>
              {title && <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>}
              {subtitle && <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>}
            </div>
          </div>
        )}

        {/* List Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: table type
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      {(title || subtitle) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-200 p-3 rounded-xl animate-pulse h-14 w-14"></div>
            <div>
              {title && <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>}
              {subtitle && <div className="h-4 w-64 bg-gray-200 rounded animate-pulse"></div>}
            </div>
          </div>
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
      )}

      {/* Search/Filter Bar */}
      <div className="flex gap-4">
        <div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b border-gray-200">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-5 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>

        {/* Table Rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 p-4 border-b border-gray-100">
            {[...Array(5)].map((_, j) => (
              <div key={j} className="h-5 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
