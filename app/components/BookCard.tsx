'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BookWithDetails, RatingSource } from '../lib/books';

interface BookCardProps {
  book: BookWithDetails;
  onClick: () => void;
}

function MiniRating({ rating }: { rating: RatingSource }) {
  if (!rating.rating) return null;

  const sourceLabels: Record<string, string> = {
    'Google Books': 'Google',
    'Open Library': 'OpenLib',
    'Goodreads': 'GR',
    'Amazon': 'AMZ',
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] text-zinc-400 font-medium">
        {sourceLabels[rating.source] || rating.source}:
      </span>
      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <span className="text-xs text-zinc-600 font-medium">{rating.rating.toFixed(1)}</span>
    </div>
  );
}

export default function BookCard({ book, onClick }: BookCardProps) {
  const [imageError, setImageError] = useState(false);

  // Get ratings that have actual values
  const ratingsWithData = book.ratings.filter(r => r.rating);

  // Truncate description
  const truncatedDescription = book.description
    ? book.description.length > 100
      ? book.description.slice(0, 100).trim() + '...'
      : book.description
    : null;

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-zinc-100 cursor-pointer hover:-translate-y-1"
    >
      {/* Book Cover */}
      <div className="relative h-48 bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center overflow-hidden">
        {book.coverImage && !imageError ? (
          <Image
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            <svg
              className="w-12 h-12 text-amber-300 mb-2"
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
            <span className="text-xs text-amber-600 font-medium line-clamp-2">
              {book.title}
            </span>
          </div>
        )}

        {/* Click indicator */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1 rounded-full text-xs font-medium text-zinc-700 shadow">
            View Details
          </span>
        </div>
      </div>

      {/* Book Info */}
      <div className="flex flex-col flex-1 p-4">
        {/* Title */}
        <h3 className="font-semibold text-zinc-900 text-sm leading-tight mb-1 line-clamp-2">
          {book.title}
        </h3>

        {/* Author */}
        {book.author && (
          <p className="text-xs text-zinc-500 mb-2">by {book.author}</p>
        )}

        {/* Ratings */}
        <div className="mb-2 space-y-0.5">
          {ratingsWithData.length > 0 ? (
            ratingsWithData.slice(0, 2).map((rating, index) => (
              <MiniRating key={index} rating={rating} />
            ))
          ) : (
            <span className="text-[10px] text-zinc-400 italic">Click to see reviews</span>
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
          {book.pages && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600">
              {book.pages} pages
            </span>
          )}
          {book.notes && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 truncate max-w-[120px]">
              {book.notes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
