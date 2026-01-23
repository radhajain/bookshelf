'use client';

import { ArticleWithDetails, formatReadingTime, formatPublicationDate } from '../lib/articles';
import { ContentCard } from './shared';

interface ArticleCardProps {
  article: ArticleWithDetails;
  onClick: () => void;
  showTypeLabel?: boolean;
}

export default function ArticleCard({ article, onClick, showTypeLabel = true }: ArticleCardProps) {
  return (
    <ContentCard
      title={article.title}
      creator={article.author}
      coverImage={article.thumbnailImage}
      contentType="article"
      genre={article.genre}
      description={article.description}
      onClick={onClick}
      showTypeLabel={showTypeLabel}
      renderRatings={
        article.publication || article.section
          ? () => (
              <div className="flex flex-wrap gap-1">
                {article.publication && (
                  <span className="text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded font-medium">
                    {article.publication}
                  </span>
                )}
                {article.section && (
                  <span className="text-[10px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
                    {article.section}
                  </span>
                )}
              </div>
            )
          : undefined
      }
      renderFooterBadges={() => (
        <>
          {article.publicationDate && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-zinc-100 text-zinc-600">
              {formatPublicationDate(article.publicationDate)}
            </span>
          )}
          {article.readingTimeMinutes && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-zinc-100 text-zinc-600">
              {formatReadingTime(article.readingTimeMinutes)}
            </span>
          )}
          {article.read && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-green-50 text-green-700">
              Read
            </span>
          )}
          {article.notes && (
            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium bg-teal-50 text-teal-700 truncate max-w-[80px] sm:max-w-[120px]">
              {article.notes}
            </span>
          )}
        </>
      )}
      renderCornerBadge={
        article.read
          ? () => (
              <span className="bg-green-500 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Read
              </span>
            )
          : undefined
      }
    />
  );
}
