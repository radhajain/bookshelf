'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PodcastWithDetails, PodcastRatingSource, formatEpisodeCount, ListeningStatus, LISTENING_STATUS_LABELS } from '../../lib/podcasts';
import { Sidebar, ConfirmDialog, SectionHeader } from '../shared';

interface PodcastDetailsSidebarProps {
  podcast: PodcastWithDetails | null;
  onClose: () => void;
  onRefresh?: () => Promise<PodcastWithDetails | null>;
  onRemove?: () => Promise<void>;
  onUpdateListeningStatus?: (status: ListeningStatus) => Promise<void>;
}

// Source-specific colors and styles
const sourceStyles: Record<string, { bg: string; text: string; icon: string }> = {
  'Podcast Index': { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'PI' },
  'Apple Podcasts': { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'AP' },
};

function LinkDisplay({ rating }: { rating: PodcastRatingSource }) {
  const style = sourceStyles[rating.source] || sourceStyles['Podcast Index'];

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${style.bg} border border-opacity-50`}>
      <div className="flex items-center gap-2">
        <span className={`w-8 h-8 rounded-full ${style.bg} ${style.text} flex items-center justify-center text-xs font-bold border`}>
          {style.icon}
        </span>
        <span className={`font-medium ${style.text}`}>{rating.source}</span>
      </div>

      {rating.url ? (
        <a
          href={rating.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-sm ${style.text} hover:underline flex items-center gap-1`}
        >
          View on {rating.source}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      ) : (
        <span className="text-xs text-zinc-400">No link</span>
      )}
    </div>
  );
}

export default function PodcastDetailsSidebar({ podcast, onClose, onRefresh, onRemove, onUpdateListeningStatus }: PodcastDetailsSidebarProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!podcast) return null;

  const linksWithData = podcast.ratings.filter(r => r.url);

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

  const handleStatusChange = async (status: ListeningStatus) => {
    if (!onUpdateListeningStatus) return;
    setUpdatingStatus(true);
    try {
      await onUpdateListeningStatus(status);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <>
      <Sidebar
        isOpen={!!podcast}
        onClose={onClose}
        title={podcast.title}
        contentType="podcast"
        onRefresh={onRefresh ? handleRefresh : undefined}
        isRefreshing={refreshing}
      >
        <div className="p-6">
          {/* Podcast Header */}
          <div className="flex gap-6 mb-6">
            {/* Cover Image */}
            <div className="flex-shrink-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-purple-50 rounded-lg overflow-hidden shadow-md">
              {podcast.coverImage ? (
                <Image
                  src={podcast.coverImage}
                  alt={`Cover of ${podcast.title}`}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              {podcast.creator && (
                <p className="text-zinc-600 mb-2">by {podcast.creator}</p>
              )}
              {podcast.publisher && podcast.publisher !== podcast.creator && (
                <p className="text-sm text-zinc-500 mb-2">{podcast.publisher}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {podcast.totalEpisodes && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                    {formatEpisodeCount(podcast.totalEpisodes)}
                  </span>
                )}
                {podcast.language && (
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {podcast.language.toUpperCase()}
                  </span>
                )}
                {podcast.genres && podcast.genres.slice(0, 2).map((genre, i) => (
                  <span key={i} className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Listening Status */}
          {onUpdateListeningStatus && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Listening Status</h3>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(LISTENING_STATUS_LABELS) as [ListeningStatus, string][]).map(([status, label]) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={updatingStatus}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      podcast.listeningStatus === status
                        ? status === 'listening' ? 'bg-blue-500 text-white'
                        : status === 'listened' ? 'bg-green-500 text-white'
                        : 'bg-zinc-500 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* External Links Section */}
          {linksWithData.length > 0 && (
            <div className="mb-6">
              <SectionHeader
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                }
                title="Listen On"
              />
              <div className="space-y-2">
                {linksWithData.map((link, index) => (
                  <LinkDisplay key={index} rating={link} />
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <SectionHeader
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              title="About"
            />
            {podcast.description ? (
              <p className="text-sm text-zinc-600 leading-relaxed">{podcast.description}</p>
            ) : (
              <p className="text-sm text-zinc-400 italic">No description available</p>
            )}
          </div>

          {/* Genres */}
          {podcast.genres && podcast.genres.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {podcast.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-xs"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {podcast.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Your Notes</h3>
              <p className="text-sm text-zinc-600 p-3 bg-purple-50 rounded-lg border border-purple-100">
                {podcast.notes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            {podcast.rssFeedUrl && (
              <a
                href={podcast.rssFeedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                RSS Feed
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </a>
            )}
            {podcast.websiteUrl && (
              <a
                href={podcast.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
              >
                Website
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
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
        title="Remove Podcast"
        message={`Remove "${podcast.title}" from your collection? The podcast will remain in the catalog for other users.`}
        confirmLabel={removing ? 'Removing...' : 'Remove'}
        variant="danger"
        isLoading={removing}
        onConfirm={handleRemove}
        onCancel={() => setShowRemoveConfirm(false)}
      />
    </>
  );
}
