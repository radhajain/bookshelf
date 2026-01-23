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
      {/* Podcast Cover */}
      <div className="relative h-96 bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center overflow-hidden">
        {podcast.coverImage && !imageError ? (
          <Image
            src={podcast.coverImage}
            alt={`Cover of ${podcast.title}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            {/* Microphone icon */}
            <svg
              className="w-12 h-12 text-purple-300 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
            <span className="text-xs text-purple-600 font-medium line-clamp-2">
              {podcast.title}
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
          <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded-full">
            Podcast
          </span>
        </div>

        {/* Episode count badge */}
        {podcast.totalEpisodes && (
          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
            {podcast.totalEpisodes} eps
          </div>
        )}
      </div>

      {/* Podcast Info */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <h3 className="font-semibold text-zinc-900 text-sm leading-tight mb-1 line-clamp-2">
          {podcast.title}
        </h3>

        {/* Creator */}
        {podcast.creator && (
          <p className="text-xs text-zinc-500 mb-2">by {podcast.creator}</p>
        )}

        {/* Episode count (if not in badge) */}
        {!podcast.totalEpisodes && podcast.genres && podcast.genres.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
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
          {podcast.totalEpisodes && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600">
              {formatEpisodeCount(podcast.totalEpisodes)}
            </span>
          )}
          {podcast.notes && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 truncate max-w-[120px]">
              {podcast.notes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
