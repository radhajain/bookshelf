'use client';

import { ReactNode } from 'react';
import Link from 'next/link';

interface BrowseCardWrapperProps {
  children: ReactNode;
  inMyShelf: boolean;
  isAdding: boolean;
  onAddToShelf: () => void;
  onShowLogin: () => void;
  dashboardLink: string;
  colorScheme: 'amber' | 'blue' | 'purple';
  isLoggedIn: boolean;
}

// Color scheme mappings
const colorSchemes = {
  amber: {
    button: 'bg-amber-500 hover:bg-amber-600',
    spinner: 'border-t-amber-500',
  },
  blue: {
    button: 'bg-blue-500 hover:bg-blue-600',
    spinner: 'border-t-blue-500',
  },
  purple: {
    button: 'bg-purple-500 hover:bg-purple-600',
    spinner: 'border-t-purple-500',
  },
};

export default function BrowseCardWrapper({
  children,
  inMyShelf,
  isAdding,
  onAddToShelf,
  onShowLogin,
  dashboardLink,
  colorScheme,
  isLoggedIn,
}: BrowseCardWrapperProps) {
  const colors = colorSchemes[colorScheme];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Card content (passed as children) */}
      {children}

      {/* Action buttons */}
      <div className="p-3 sm:p-4 pt-0">
        {isLoggedIn && !inMyShelf && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToShelf();
            }}
            disabled={isAdding}
            className={`w-full px-3 py-2 ${colors.button} text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isAdding ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add to My Shelf
              </>
            )}
          </button>
        )}

        {inMyShelf && (
          <Link
            href={dashboardLink}
            onClick={(e) => e.stopPropagation()}
            className="block w-full px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors text-center"
          >
            View in My Shelf
          </Link>
        )}

        {!isLoggedIn && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowLogin();
            }}
            className={`w-full px-3 py-2 ${colors.button} text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add to My Shelf
          </button>
        )}
      </div>
    </div>
  );
}

// Component to render "In My Shelf" badge for browse cards
export function InMyShelfBadge() {
  return (
    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full flex items-center gap-1 w-fit">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
      In My Shelf
    </span>
  );
}
