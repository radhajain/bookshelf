'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { DbTVShow } from '@/app/lib/types/database';
import { getWatchingStatusLabel, WatchingStatus } from '@/app/lib/tvshows';

interface TVShowWithShelfStatus extends DbTVShow {
  inMyShelf: boolean;
  watchingStatus?: WatchingStatus;
}

interface BrowseTVShowCardProps {
  tvshow: TVShowWithShelfStatus;
  onClick: () => void;
  onAddToShelf: () => void;
  onShowLogin: () => void;
  isAdding: boolean;
  isLoggedIn: boolean;
  showTypeLabel?: boolean;
}

export default function BrowseTVShowCard({
  tvshow,
  onClick,
  onAddToShelf,
  onShowLogin,
  isAdding,
  isLoggedIn,
  showTypeLabel = true,
}: BrowseTVShowCardProps) {
  const [imageError, setImageError] = useState(false);

  // Get year from first_air_date
  const year = tvshow.first_air_date ? tvshow.first_air_date.substring(0, 4) : null;

  return (
    <div
      onClick={onClick}
      className="group bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
    >
      {/* TV Show Poster */}
      <div className="relative h-48 sm:h-64 md:h-72 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center overflow-hidden">
        {tvshow.poster_image && !imageError ? (
          <Image
            src={tvshow.poster_image}
            alt={tvshow.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="text-center">
              <svg
                className="w-10 h-10 sm:w-12 sm:h-12 text-zinc-300 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <p className="text-xs text-zinc-400 line-clamp-2">{tvshow.title}</p>
            </div>
          </div>
        )}

        {/* Type & Genre Badge */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col gap-1 items-start">
          {showTypeLabel && (
            <span className="px-1.5 sm:px-2 py-0.5 bg-green-500 text-white text-[10px] sm:text-xs font-medium rounded-full w-fit">
              TV Show
            </span>
          )}
          {tvshow.genres && tvshow.genres[0] && tvshow.genres[0] !== 'Uncategorized' && (
            <span className="px-1.5 sm:px-2 py-0.5 bg-black/60 text-white text-[10px] sm:text-xs rounded-full w-fit">
              {tvshow.genres[0]}
            </span>
          )}
        </div>

        {/* In Shelf Badge */}
        {tvshow.inMyShelf && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
            <span className="px-1.5 sm:px-2 py-0.5 bg-green-600 text-white text-[10px] sm:text-xs rounded-full flex items-center gap-1 w-fit">
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="hidden sm:inline">In My Shelf</span>
            </span>
          </div>
        )}

        {/* TMDB Rating */}
        {tvshow.tmdb_rating && (
          <div className="absolute bottom-1.5 right-1.5 sm:bottom-2 sm:right-2">
            <span className="px-1.5 sm:px-2 py-0.5 bg-amber-500 text-white text-[10px] sm:text-xs font-medium rounded-full flex items-center gap-1 w-fit">
              <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {tvshow.tmdb_rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Season Count Badge */}
        {tvshow.number_of_seasons && (
          <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2">
            <span className="px-1.5 sm:px-2 py-0.5 bg-black/60 text-white text-[10px] sm:text-xs rounded-full w-fit">
              {tvshow.number_of_seasons} {tvshow.number_of_seasons === 1 ? 'season' : 'seasons'}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors hidden sm:flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-zinc-700 shadow">
            View Details
          </span>
        </div>
      </div>

      {/* TV Show Info */}
      <div className="p-2.5 sm:p-3 lg:p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-zinc-900 text-xs sm:text-sm line-clamp-2 mb-0.5 sm:mb-1">
          {tvshow.title}
        </h3>
        <p className="text-[10px] sm:text-xs text-zinc-500 mb-2 sm:mb-3 truncate">
          {tvshow.creator && <>by {tvshow.creator}</>}
          {tvshow.creator && year && ' · '}
          {year && year}
          {tvshow.status && (
            <span className={`ml-1 ${tvshow.status === 'Ended' || tvshow.status === 'Canceled' ? 'text-zinc-400' : 'text-green-600'}`}>
              · {tvshow.status}
            </span>
          )}
        </p>

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Add to Shelf Button */}
        {isLoggedIn && !tvshow.inMyShelf && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToShelf();
            }}
            disabled={isAdding}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 mt-auto"
          >
            {isAdding ? (
              <>
                <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="hidden sm:inline">Adding...</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Add to Shelf</span>
                <span className="sm:hidden">Add</span>
              </>
            )}
          </button>
        )}

        {tvshow.inMyShelf && (
          <Link
            href={`/dashboard?tvshow=${tvshow.id}`}
            onClick={(e) => e.stopPropagation()}
            className="block w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs sm:text-sm font-medium rounded-lg transition-colors text-center mt-auto"
          >
            <span className="hidden sm:inline">View in My Shelf</span>
            <span className="sm:hidden">In Shelf</span>
          </Link>
        )}

        {!isLoggedIn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowLogin();
            }}
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 sm:gap-2 mt-auto"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add to Shelf</span>
            <span className="sm:hidden">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
