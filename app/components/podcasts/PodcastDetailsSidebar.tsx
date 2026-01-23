'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PodcastWithDetails, PodcastRatingSource, formatEpisodeCount } from '../../lib/podcasts';

interface PodcastDetailsSidebarProps {
  podcast: PodcastWithDetails | null;
  onClose: () => void;
  onRefresh?: () => Promise<PodcastWithDetails | null>;
  onRemove?: () => Promise<void>;
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

export default function PodcastDetailsSidebar({ podcast, onClose, onRefresh, onRemove }: PodcastDetailsSidebarProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  if (!podcast) return null;

  const linksWithData = podcast.ratings.filter(r => r.url);

  // Format the last refresh date for tooltip
  const getRefreshTooltip = () => {
    if (!podcast.detailsFetchedAt) return 'Refresh podcast details';
    const date = new Date(podcast.detailsFetchedAt);
    return `Last refreshed: ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
  };

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded-full">
              Podcast
            </span>
            <h2 className="text-lg font-semibold text-zinc-900">Details</h2>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 hover:bg-zinc-100 rounded-full transition-colors disabled:opacity-50"
                title={getRefreshTooltip()}
              >
                <svg
                  className={`w-5 h-5 text-zinc-500 ${refreshing ? 'animate-spin' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

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

            {/* Title & Info */}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-zinc-900 mb-1">{podcast.title}</h1>
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

          {/* External Links Section */}
          {linksWithData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Listen On
              </h3>
              <div className="space-y-2">
                {linksWithData.map((link, index) => (
                  <LinkDisplay key={index} rating={link} />
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              About
            </h3>
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
              {showRemoveConfirm ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 mb-3">
                    Remove &quot;{podcast.title}&quot; from your collection? The podcast will remain in the catalog for other users.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRemoveConfirm(false)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRemove}
                      disabled={removing}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {removing ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowRemoveConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove from Collection
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
