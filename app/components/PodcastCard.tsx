'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PodcastWithDetails, formatEpisodeCount } from '../lib/podcasts';

interface PodcastCardProps {
  podcast: PodcastWithDetails;
  onClick: () => void;
}

export default function PodcastCard({ podcast, onClick }: PodcastCardProps) {
  const [imageError, setImageError] = useState(false);

  // Truncate description
  const truncatedDescription = podcast.description
    ? podcast.description.length > 100
      ? podcast.description.slice(0, 100).trim() + '...'
      : podcast.description
    : null;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-zinc-100 cursor-pointer hover:-translate-y-1"
    >
      {/* Podcast Cover - responsive height */}
      <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center overflow-hidden">
        {podcast.coverImage && !imageError ? (
          <Image
            src={podcast.coverImage}
            alt={`Cover of ${podcast.title}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-white flex items-center justify-center p-4 sm:p-6">
            <h3 className="font-serif text-sm sm:text-base lg:text-lg text-zinc-800 text-center leading-snug line-clamp-4">
              {podcast.title}
            </h3>
          </div>
        )}

        {/* Click indicator - hidden on mobile */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors hidden sm:flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-zinc-700 shadow">
            View Details
          </span>
        </div>

        {/* Type Badge - smaller on mobile */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
          <span className="px-1.5 sm:px-2 py-0.5 bg-purple-500 text-white text-[10px] sm:text-xs font-medium rounded-full">
            Podcast
          </span>
        </div>

        {/* Episode count badge - smaller on mobile */}
        {podcast.totalEpisodes && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-black/70 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded">
            {podcast.totalEpisodes} eps
          </div>
        )}
      </div>

      {/* Podcast Info - responsive padding */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3 lg:p-4">
        {/* Title */}
        <h3 className="font-semibold text-zinc-900 text-xs sm:text-sm leading-tight mb-0.5 sm:mb-1 line-clamp-2">
          {podcast.title}
        </h3>

        {/* Creator */}
        {podcast.creator && (
          <p className="text-[10px] sm:text-xs text-zinc-500 mb-1.5 sm:mb-2 truncate">by {podcast.creator}</p>
        )}

        {/* Episode count (if not in badge) - hidden on mobile */}
        {!podcast.totalEpisodes && podcast.genres && podcast.genres.length > 0 && (
          <div className="mb-1.5 sm:mb-2 flex-wrap gap-1 hidden sm:flex">
            {podcast.genres.slice(0, 2).map((genre, index) => (
              <span
                key={index}
                className="text-[10px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Description - hidden on mobile */}
        <div className="flex-1 hidden lg:block">
          {truncatedDescription ? (
            <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
              {truncatedDescription}
            </p>
          ) : (
            <p className="text-xs text-zinc-400 italic">Click for details</p>
          )}
        </div>

        {/* Footer - simplified on mobile */}
        <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-zinc-100 flex flex-wrap gap-1.5 sm:gap-2">
          {podcast.totalEpisodes && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-zinc-100 text-zinc-600">
              {formatEpisodeCount(podcast.totalEpisodes)}
            </span>
          )}
          {podcast.notes && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-purple-50 text-purple-700 truncate max-w-[80px] sm:max-w-[120px]">
              {podcast.notes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
