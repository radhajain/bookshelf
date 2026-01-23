'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MovieWithDetails, MovieRatingSource, formatRuntime } from '../../lib/movies';

interface MovieCardProps {
  movie: MovieWithDetails;
  onClick: () => void;
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

export default function MovieCard({ movie, onClick }: MovieCardProps) {
  const [imageError, setImageError] = useState(false);

  // Get ratings that have actual values
  const ratingsWithData = movie.ratings.filter((r) => r.rating);

  // Truncate description
  const truncatedDescription = movie.description
    ? movie.description.length > 100
      ? movie.description.slice(0, 100).trim() + '...'
      : movie.description
    : null;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-zinc-100 cursor-pointer hover:-translate-y-1"
    >
      {/* Movie Poster */}
      <div className="relative h-96 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center overflow-hidden">
        {movie.posterImage && !imageError ? (
          <Image
            src={movie.posterImage}
            alt={`Poster of ${movie.title}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            {/* Film icon */}
            <svg
              className="w-12 h-12 text-blue-300 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
            <span className="text-xs text-blue-600 font-medium line-clamp-2">
              {movie.title}
            </span>
          </div>
        )}

        {/* Click indicator */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-zinc-700 shadow">
            View Details
          </span>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
            Movie
          </span>
        </div>

        {/* Year badge */}
        {movie.year && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
            {movie.year}
          </div>
        )}
      </div>

      {/* Movie Info */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <h3 className="font-semibold text-zinc-900 text-sm leading-tight mb-1 line-clamp-2">
          {movie.title}
        </h3>

        {/* Director */}
        {movie.director && (
          <p className="text-xs text-zinc-500 mb-2">dir. {movie.director}</p>
        )}

        {/* Ratings */}
        <div className="mb-2 space-y-0.5">
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
        </div>

        {/* Description */}
        <div className="flex-1">
          {truncatedDescription ? (
            <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
              {truncatedDescription}
            </p>
          ) : (
            <p className="text-xs text-zinc-400 italic">Click for details</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-zinc-100 flex flex-wrap gap-2">
          {movie.runtime && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600">
              {formatRuntime(movie.runtime)}
            </span>
          )}
          {movie.watched && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
              Watched
            </span>
          )}
          {movie.notes && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 truncate max-w-[120px]">
              {movie.notes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
