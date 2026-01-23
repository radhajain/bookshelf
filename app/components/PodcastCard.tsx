'use client';

import { PodcastWithDetails, formatEpisodeCount } from '../lib/podcasts';
import { ContentCard } from './shared';

interface PodcastCardProps {
  podcast: PodcastWithDetails;
  onClick: () => void;
  showTypeLabel?: boolean;
}

export default function PodcastCard({ podcast, onClick, showTypeLabel = true }: PodcastCardProps) {
  return (
    <ContentCard
      title={podcast.title}
      creator={podcast.creator}
      coverImage={podcast.coverImage}
      contentType="podcast"
      genre={podcast.genre}
      description={podcast.description}
      onClick={onClick}
      showTypeLabel={showTypeLabel}
      renderRatings={
        !podcast.totalEpisodes && podcast.genres && podcast.genres.length > 0
          ? () => (
              <div className="flex flex-wrap gap-1">
                {podcast.genres!.slice(0, 2).map((genre, index) => (
                  <span
                    key={index}
                    className="text-[10px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )
          : undefined
      }
      renderFooterBadges={() => (
        <>
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
        </>
      )}
      renderCornerBadge={
        podcast.totalEpisodes
          ? () => (
              <span className="bg-black/70 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded">
                {podcast.totalEpisodes} eps
              </span>
            )
          : undefined
      }
    />
  );
}
