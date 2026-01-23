'use client';

import { MovieWithDetails, MovieRatingSource, formatRuntime } from '../../lib/movies';
import { ContentCard } from '../shared';

interface MovieCardProps {
  movie: MovieWithDetails;
  onClick: () => void;
  showTypeLabel?: boolean;
}

function MiniRating({ rating }: { rating: MovieRatingSource }) {
  if (!rating.rating) return null;

  const sourceLabels: Record<string, string> = {
    'TMDB': 'TMDB',
    'Rotten Tomatoes': 'RT',
    'Rotten Tomatoes Audience': 'RT Aud',
    'Metacritic': 'MC',
    'IMDb': 'IMDb',
    'Letterboxd': 'LB',
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

  // Icon based on source
  const getIcon = () => {
    if (rating.source === 'Rotten Tomatoes' || rating.source === 'Rotten Tomatoes Audience') {
      // Tomato icon for RT
      const isFresh = rating.rating && rating.rating >= 60;
      return (
        <span className={`text-xs ${isFresh ? 'text-red-500' : 'text-green-600'}`}>
          {isFresh ? '🍅' : '🟢'}
        </span>
      );
    }
    // Star for others
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

export default function MovieCard({ movie, onClick, showTypeLabel = true }: MovieCardProps) {
  // Get ratings that have actual values
  const ratingsWithData = movie.ratings.filter((r) => r.rating);

  return (
    <ContentCard
      title={movie.title}
      creator={movie.director}
      coverImage={movie.posterImage}
      contentType="movie"
      genre={movie.genre}
      description={movie.description}
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
              Click to see reviews
            </span>
          )}
        </>
      )}
      renderFooterBadges={() => (
        <>
          {movie.runtime && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-zinc-100 text-zinc-600">
              {formatRuntime(movie.runtime)}
            </span>
          )}
          {movie.watched && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-green-50 text-green-700">
              <span className="hidden sm:inline">Watched</span>
              <span className="sm:hidden">✓</span>
            </span>
          )}
          {movie.notes && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-blue-50 text-blue-700 truncate max-w-[80px] sm:max-w-[120px]">
              {movie.notes}
            </span>
          )}
        </>
      )}
      renderCornerBadge={
        movie.year
          ? () => (
              <span className="bg-black/70 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded">
                {movie.year}
              </span>
            )
          : undefined
      }
    />
  );
}
