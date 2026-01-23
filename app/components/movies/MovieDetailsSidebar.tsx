'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MovieWithDetails, MovieRatingSource, formatRuntime, formatMoney } from '../../lib/movies';

interface MovieDetailsSidebarProps {
  movie: MovieWithDetails | null;
  onClose: () => void;
  onRefresh?: () => Promise<MovieWithDetails | null>;
  onRemove?: () => Promise<void>;
  onToggleWatched?: (watched: boolean) => Promise<void>;
}

// Source-specific colors and icons
const sourceStyles: Record<string, { bg: string; text: string; icon: string }> = {
  'TMDB': { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'T' },
  'Rotten Tomatoes': { bg: 'bg-red-50', text: 'text-red-700', icon: 'RT' },
  'Rotten Tomatoes Audience': { bg: 'bg-red-50', text: 'text-red-700', icon: 'RA' },
  'Metacritic': { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'MC' },
  'IMDb': { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'IM' },
  'Letterboxd': { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'LB' },
};

function RatingDisplay({ rating }: { rating: MovieRatingSource }) {
  const style = sourceStyles[rating.source] || sourceStyles['TMDB'];

  // Format rating based on display type
  const formatRating = () => {
    if (!rating.rating) return null;
    if (rating.displayFormat === 'percentage') {
      return `${rating.rating}%`;
    }
    if (rating.displayFormat === 'score') {
      return `${rating.rating}/100`;
    }
    // Stars format (out of 10)
    return rating.rating.toFixed(1);
  };

  // Get visual indicator for RT
  const getRTIcon = () => {
    if (rating.source === 'Rotten Tomatoes') {
      const isFresh = rating.rating && rating.rating >= 60;
      return isFresh ? '🍅' : '🟢';
    }
    if (rating.source === 'Rotten Tomatoes Audience') {
      const isLiked = rating.rating && rating.rating >= 60;
      return isLiked ? '🍿' : '🥤';
    }
    return null;
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${style.bg} border border-opacity-50`}>
      <div className="flex items-center gap-2">
        <span className={`w-8 h-8 rounded-full ${style.bg} ${style.text} flex items-center justify-center text-xs font-bold border`}>
          {style.icon}
        </span>
        <span className={`font-medium ${style.text}`}>{rating.source}</span>
      </div>

      <div className="flex items-center gap-2">
        {rating.rating ? (
          <div className="flex items-center gap-1">
            {getRTIcon() && <span className="text-lg">{getRTIcon()}</span>}
            {rating.displayFormat === 'stars' && (
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(rating.rating! / 2)
                        ? 'text-amber-400'
                        : 'text-zinc-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            )}
            <span className="text-sm font-medium text-zinc-700">
              {formatRating()}
            </span>
            {rating.ratingsCount && (
              <span className="text-xs text-zinc-500">
                ({rating.ratingsCount.toLocaleString()})
              </span>
            )}
          </div>
        ) : rating.url ? (
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
          <span className="text-xs text-zinc-400">No rating</span>
        )}
      </div>
    </div>
  );
}

export default function MovieDetailsSidebar({ movie, onClose, onRefresh, onRemove, onToggleWatched }: MovieDetailsSidebarProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [togglingWatched, setTogglingWatched] = useState(false);

  if (!movie) return null;

  const ratingsWithData = movie.ratings.filter(r => r.rating);
  const linkOnlyRatings = movie.ratings.filter(r => !r.rating && r.url);

  // Format the last refresh date for tooltip
  const getRefreshTooltip = () => {
    if (!movie.detailsFetchedAt) return 'Refresh movie details';
    const date = new Date(movie.detailsFetchedAt);
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

  const handleToggleWatched = async () => {
    if (!onToggleWatched) return;
    setTogglingWatched(true);
    try {
      await onToggleWatched(!movie.watched);
    } finally {
      setTogglingWatched(false);
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
            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
              Movie
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
          {/* Movie Header */}
          <div className="flex gap-6 mb-6">
            {/* Poster */}
            <div className="flex-shrink-0 w-32 h-48 bg-gradient-to-br from-blue-100 to-blue-50 rounded-lg overflow-hidden shadow-md">
              {movie.posterImage ? (
                <Image
                  src={movie.posterImage}
                  alt={`Poster of ${movie.title}`}
                  width={128}
                  height={192}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title & Info */}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-zinc-900 mb-1">{movie.title}</h1>
              {movie.director && (
                <p className="text-zinc-600 mb-2">dir. {movie.director}</p>
              )}
              {movie.tagline && (
                <p className="text-sm text-zinc-500 italic mb-2">&quot;{movie.tagline}&quot;</p>
              )}
              <div className="flex flex-wrap gap-2">
                {movie.year && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {movie.year}
                  </span>
                )}
                {movie.runtime && (
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {formatRuntime(movie.runtime)}
                  </span>
                )}
                {movie.genres && movie.genres.slice(0, 2).map((genre, i) => (
                  <span key={i} className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {genre}
                  </span>
                ))}
              </div>
              {/* Budget & Revenue */}
              {(movie.budget || movie.revenue) && (
                <div className="mt-2 text-xs text-zinc-500">
                  {movie.budget ? <span>Budget: {formatMoney(movie.budget)}</span> : null}
                  {movie.budget && movie.revenue ? <span className="mx-1">|</span> : null}
                  {movie.revenue ? <span>Box Office: {formatMoney(movie.revenue)}</span> : null}
                </div>
              )}
            </div>
          </div>

          {/* Watch Status Toggle */}
          {onToggleWatched && (
            <div className="mb-6">
              <button
                onClick={handleToggleWatched}
                disabled={togglingWatched}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                  movie.watched
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {movie.watched ? (
                  <>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Watched
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Mark as Watched
                  </>
                )}
              </button>
            </div>
          )}

          {/* Ratings Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Ratings & Reviews
            </h3>

            <div className="space-y-2">
              {ratingsWithData.length > 0 ? (
                ratingsWithData.map((rating, index) => (
                  <RatingDisplay key={index} rating={rating} />
                ))
              ) : (
                <p className="text-sm text-zinc-500 italic p-3 bg-zinc-50 rounded-lg">
                  No ratings available
                </p>
              )}
            </div>

            {/* External Links */}
            {linkOnlyRatings.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-zinc-500 mb-2">Check reviews on:</p>
                <div className="space-y-2">
                  {linkOnlyRatings.map((rating, index) => (
                    <RatingDisplay key={index} rating={rating} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Synopsis */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Synopsis
            </h3>
            {movie.description ? (
              <p className="text-sm text-zinc-600 leading-relaxed">{movie.description}</p>
            ) : (
              <p className="text-sm text-zinc-400 italic">No synopsis available</p>
            )}
          </div>

          {/* Cast */}
          {movie.cast && movie.cast.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Cast
              </h3>
              <div className="flex flex-wrap gap-2">
                {movie.cast.map((actor, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Genres</h3>
              <div className="flex flex-wrap gap-2">
                {movie.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {movie.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Your Notes</h3>
              <p className="text-sm text-zinc-600 p-3 bg-blue-50 rounded-lg border border-blue-100">
                {movie.notes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            {movie.imdbUrl && (
              <a
                href={movie.imdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
              >
                View on IMDb
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {movie.letterboxdUrl && (
              <a
                href={movie.letterboxdUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                View on Letterboxd
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
                    Remove &quot;{movie.title}&quot; from your collection? The movie will remain in the catalog for other users.
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
