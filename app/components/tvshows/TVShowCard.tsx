'use client';

import { TVShowWithDetails, TVShowRatingSource, formatProgress, getYearFromDate, WATCHING_STATUS_LABELS, WatchingStatus } from '../../lib/tvshows';
import { ContentCard } from '../shared';

interface TVShowCardProps {
  tvshow: TVShowWithDetails;
  onClick: () => void;
  showTypeLabel?: boolean;
}

function MiniRating({ rating }: { rating: TVShowRatingSource }) {
  if (!rating.rating) return null;

  const sourceLabels: Record<string, string> = {
    'TMDB': 'TMDB',
    'IMDb': 'IMDb',
  };

  // Format based on display type
  const formatRating = () => {
    if (!rating.rating) return '';
    if (rating.displayFormat === 'percentage') {
      return `${rating.rating}%`;
    }
    if (rating.displayFormat === 'score') {
      return `${rating.rating}`;
    }
    // Stars format (out of 10)
    return rating.rating.toFixed(1);
  };

  // Star icon
  const getIcon = () => {
    return (
      <svg
        className="w-3 h-3 text-amber-400"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    );
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-zinc-400 font-medium">
        {sourceLabels[rating.source] || rating.source}:
      </span>
      {getIcon()}
      <span className="text-xs text-zinc-600 font-medium">
        {formatRating()}
      </span>
    </div>
  );
}

function getWatchingStatusStyle(status?: WatchingStatus) {
  switch (status) {
    case 'watching':
      return 'bg-blue-50 text-blue-700';
    case 'watched':
      return 'bg-green-50 text-green-700';
    case 'dropped':
      return 'bg-red-50 text-red-700';
    case 'want_to_watch':
    default:
      return 'bg-zinc-100 text-zinc-600';
  }
}

export default function TVShowCard({ tvshow, onClick, showTypeLabel = true }: TVShowCardProps) {
  // Get ratings that have actual values
  const ratingsWithData = tvshow.ratings?.filter((r) => r.rating) || [];
  const year = getYearFromDate(tvshow.firstAirDate);
  const progress = formatProgress(tvshow.currentSeason, tvshow.currentEpisode);

  return (
    <ContentCard
      title={tvshow.title}
      creator={tvshow.creator}
      coverImage={tvshow.posterImage}
      contentType="tvshow"
      genre={tvshow.genre}
      description={tvshow.description}
      onClick={onClick}
      showTypeLabel={showTypeLabel}
      renderRatings={() => (
        <>
          {ratingsWithData.length > 0 ? (
            ratingsWithData
              .slice(0, 2)
              .map((rating, index) => (
                <MiniRating key={index} rating={rating} />
              ))
          ) : (
            <span className="text-[10px] text-zinc-400 italic">
              Click to see details
            </span>
          )}
        </>
      )}
      renderFooterBadges={() => (
        <>
          {tvshow.watchingStatus && tvshow.watchingStatus !== 'want_to_watch' && (
            <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium ${getWatchingStatusStyle(tvshow.watchingStatus)}`}>
              <span className="hidden sm:inline">{WATCHING_STATUS_LABELS[tvshow.watchingStatus]}</span>
              <span className="sm:hidden">
                {tvshow.watchingStatus === 'watching' ? '...' : tvshow.watchingStatus === 'watched' ? '✓' : '✕'}
              </span>
            </span>
          )}
          {progress && tvshow.watchingStatus === 'watching' && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-purple-50 text-purple-700">
              {progress}
            </span>
          )}
          {tvshow.numberOfSeasons && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-zinc-100 text-zinc-600">
              {tvshow.numberOfSeasons} {tvshow.numberOfSeasons === 1 ? 'season' : 'seasons'}
            </span>
          )}
          {tvshow.notes && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-blue-50 text-blue-700 truncate max-w-[80px] sm:max-w-[120px]">
              {tvshow.notes}
            </span>
          )}
        </>
      )}
      renderCornerBadge={
        year
          ? () => (
              <span className="bg-black/70 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded">
                {year}
              </span>
            )
          : undefined
      }
    />
  );
}
