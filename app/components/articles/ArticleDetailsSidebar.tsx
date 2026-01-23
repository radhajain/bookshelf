'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArticleWithDetails, formatReadingTime, formatPublicationDate } from '../../lib/articles';
import { Sidebar, ConfirmDialog, SectionHeader } from '../shared';

interface ArticleDetailsSidebarProps {
  article: ArticleWithDetails | null;
  onClose: () => void;
  onRefresh?: () => Promise<ArticleWithDetails | null>;
  onRemove?: () => Promise<void>;
  onUpdate?: (updates: Partial<ArticleWithDetails>) => Promise<void>;
}

export default function ArticleDetailsSidebar({
  article,
  onClose,
  onRefresh,
  onRemove,
  onUpdate,
}: ArticleDetailsSidebarProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);

  if (!article) return null;

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) return;
    setRemoving(true);
    try {
      await onRemove();
      setShowRemoveConfirm(false);
    } finally {
      setRemoving(false);
    }
  };

  const handleToggleRead = async () => {
    if (!onUpdate) return;
    setUpdating(true);
    try {
      await onUpdate({
        read: !article.read,
        readAt: !article.read ? new Date().toISOString() : undefined,
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <Sidebar
        isOpen={!!article}
        onClose={onClose}
        title={article.title}
        contentType="article"
        onRefresh={onRefresh ? handleRefresh : undefined}
        isRefreshing={refreshing}
      >
        <div className="p-6">
          {/* Article Header */}
          <div className="flex gap-6 mb-6">
            {/* Thumbnail */}
            <div className="flex-shrink-0 w-32 h-24 bg-gradient-to-br from-teal-100 to-teal-50 rounded-lg overflow-hidden shadow-md">
              {article.thumbnailImage ? (
                <Image
                  src={article.thumbnailImage}
                  alt={`Thumbnail of ${article.title}`}
                  width={128}
                  height={96}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-10 h-10 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              {article.publication && (
                <span className="inline-block px-2 py-1 bg-teal-100 text-teal-700 rounded text-xs font-medium mb-2">
                  {article.publication}
                </span>
              )}
              {article.author && (
                <p className="text-zinc-600 mb-1">by {article.author}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {article.publicationDate && (
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {formatPublicationDate(article.publicationDate)}
                  </span>
                )}
                {article.readingTimeMinutes && (
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {formatReadingTime(article.readingTimeMinutes)}
                  </span>
                )}
                {article.wordCount && (
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {article.wordCount.toLocaleString()} words
                  </span>
                )}
                {article.section && (
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {article.section}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Read Status Toggle */}
          <div className="mb-6 p-4 bg-zinc-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {article.read ? (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span className={`font-medium ${article.read ? 'text-green-700' : 'text-zinc-600'}`}>
                  {article.read ? 'Read' : 'Unread'}
                </span>
                {article.read && article.readAt && (
                  <span className="text-xs text-zinc-500">
                    on {formatPublicationDate(article.readAt)}
                  </span>
                )}
              </div>
              {onUpdate && (
                <button
                  onClick={handleToggleRead}
                  disabled={updating}
                  className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                    article.read
                      ? 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  } disabled:opacity-50`}
                >
                  {updating ? '...' : article.read ? 'Mark Unread' : 'Mark as Read'}
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <SectionHeader
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="Summary"
            />
            {article.description ? (
              <p className="text-sm text-zinc-600 leading-relaxed">{article.description}</p>
            ) : (
              <p className="text-sm text-zinc-400 italic">No summary available</p>
            )}
          </div>

          {/* Subjects */}
          {article.subjects && article.subjects.length > 0 && (
            <div className="mb-6">
              <SectionHeader
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                }
                title="Subjects"
              />
              <div className="flex flex-wrap gap-2">
                {article.subjects.map((subject, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded text-xs"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Priority */}
          {article.priority && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Priority</h3>
              <span className={`px-3 py-1 rounded text-sm font-medium ${
                article.priority === 'A' ? 'bg-red-100 text-red-700' :
                article.priority === 'B' ? 'bg-yellow-100 text-yellow-700' :
                'bg-green-100 text-green-700'
              }`}>
                {article.priority === 'A' ? 'High Priority' :
                 article.priority === 'B' ? 'Medium Priority' :
                 'Low Priority'}
              </span>
            </div>
          )}

          {/* Notes */}
          {article.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Your Notes</h3>
              <p className="text-sm text-zinc-600 p-3 bg-teal-50 rounded-lg border border-teal-100">
                {article.notes}
              </p>
            </div>
          )}

          {/* Read Article Button */}
          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            <a
              href={article.articleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
            >
              Read Article
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Remove from Collection */}
          {onRemove && (
            <div className="mt-6 pt-4 border-t border-zinc-200">
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove from Collection
              </button>
            </div>
          )}
        </div>
      </Sidebar>

      {/* Remove Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRemoveConfirm}
        title="Remove Article"
        message={`Remove "${article.title}" from your collection? The article will remain in the catalog for other users.`}
        confirmLabel={removing ? 'Removing...' : 'Remove'}
        variant="danger"
        isLoading={removing}
        onConfirm={handleRemove}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </>
  );
}
