'use client';

import { useState, ReactNode, Children, isValidElement } from 'react';
import Image from 'next/image';
import { ContentType, CONTENT_CONFIGS } from '@/app/lib/types/content';

// Helper component to conditionally render footer badges with divider
function FooterBadgesWrapper({ renderFooterBadges }: { renderFooterBadges: () => ReactNode }) {
  const badges = renderFooterBadges();

  // Check if the badges actually contain any rendered content
  // This handles React fragments with null/undefined children
  const hasContent = (() => {
    if (!badges) return false;
    if (typeof badges === 'boolean') return false;
    if (typeof badges === 'string' || typeof badges === 'number') return true;
    if (isValidElement(badges)) {
      // For fragments, check children
      const children = Children.toArray((badges.props as { children?: ReactNode }).children);
      return children.some(child => child != null);
    }
    return true;
  })();

  if (!hasContent) return null;

  return (
    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-zinc-100 flex flex-wrap gap-1.5 sm:gap-2">
      {badges}
    </div>
  );
}

interface ContentCardProps {
  title: string;
  creator?: string;
  coverImage?: string;
  contentType: ContentType;
  genre?: string;
  description?: string;
  onClick: () => void;
  // Render props for content-specific elements
  renderRatings?: () => ReactNode;
  renderFooterBadges?: () => ReactNode;
  renderCornerBadge?: () => ReactNode;
  // Additional indicators
  showTypeLabel?: boolean;
  className?: string;
}

export default function ContentCard({
  title,
  creator,
  coverImage,
  contentType,
  genre,
  description,
  onClick,
  renderRatings,
  renderFooterBadges,
  renderCornerBadge,
  showTypeLabel = true,
  className = '',
}: ContentCardProps) {
  const [imageError, setImageError] = useState(false);
  const config = CONTENT_CONFIGS[contentType];

  // Truncate description
  const truncatedDescription = description
    ? description.length > 100
      ? description.slice(0, 100).trim() + '...'
      : description
    : null;

  // Aspect ratio: podcasts are square, books/movies are portrait
  const aspectRatio = contentType === 'podcast' ? 'aspect-square' : 'aspect-[2/3]';

  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-zinc-100 cursor-pointer hover:-translate-y-1 ${className}`}
    >
      {/* Cover Image */}
      <div
        className={`relative h-48 sm:h-64 md:h-80 lg:h-96 bg-gradient-to-br ${config.bgGradient} flex items-center justify-center overflow-hidden`}
      >
        {coverImage && !imageError ? (
          <Image
            src={coverImage}
            alt={`Cover of ${title}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-white flex items-center justify-center p-4 sm:p-6">
            <div className="text-center">
              {/* Fallback icon based on content type */}
              {contentType === 'book' && (
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
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              )}
              {contentType === 'movie' && (
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
                    d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                  />
                </svg>
              )}
              {contentType === 'podcast' && (
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
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
              <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2">
                {title}
              </p>
            </div>
          </div>
        )}

        {/* Click indicator - hidden on mobile, shown on hover for desktop */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors hidden sm:flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-zinc-700 shadow">
            View Details
          </span>
        </div>

        {/* Type Badge - top left */}
        {showTypeLabel && (
          <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
            <span
              className={`px-1.5 sm:px-2 py-0.5 ${config.badgeClass} text-white text-[10px] sm:text-xs font-medium rounded-full`}
            >
              {config.label}
            </span>
          </div>
        )}

        {/* Corner Badge - top right (for "In My Shelf", read status, etc.) */}
        {renderCornerBadge && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
            {renderCornerBadge()}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex flex-col flex-1 p-2.5 sm:p-3 lg:p-4">
        {/* Title */}
        <h3 className="font-semibold text-zinc-900 text-xs sm:text-sm leading-tight mb-0.5 sm:mb-1 line-clamp-2">
          {title}
        </h3>

        {/* Creator */}
        {creator && (
          <p className="text-[10px] sm:text-xs text-zinc-500 mb-1.5 sm:mb-2 truncate">
            {config.creatorLabel} {creator}
          </p>
        )}

        {/* Ratings - hidden on very small screens */}
        {renderRatings && (
          <div className="mb-1.5 sm:mb-2 space-y-0.5 hidden sm:block">
            {renderRatings()}
          </div>
        )}

        {/* Description - hidden on mobile */}
        {truncatedDescription && (
          <div className="flex-1 hidden lg:block">
            <p className="text-xs text-zinc-600 leading-relaxed line-clamp-3">
              {truncatedDescription}
            </p>
          </div>
        )}

        {/* Footer Badges - only show divider if badges actually render */}
        {renderFooterBadges && (
          <FooterBadgesWrapper renderFooterBadges={renderFooterBadges} />
        )}
      </div>
    </div>
  );
}
