'use client';

import Image from 'next/image';
import { BookWithDetails, RatingSource } from '../lib/books';

interface BookDetailsSidebarProps {
  book: BookWithDetails | null;
  onClose: () => void;
}

// Source-specific colors and icons
const sourceStyles: Record<string, { bg: string; text: string; icon: string }> = {
  'Google Books': { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'G' },
  'Open Library': { bg: 'bg-green-50', text: 'text-green-700', icon: 'OL' },
  'Goodreads': { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'GR' },
  'Amazon': { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'A' },
};

function RatingDisplay({ rating }: { rating: RatingSource }) {
  const style = sourceStyles[rating.source] || sourceStyles['Google Books'];

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${style.bg} border border-opacity-50`}>
      <div className="flex items-center gap-2">
        <span className={`w-8 h-8 rounded-full ${style.bg} ${style.text} flex items-center justify-center text-xs font-bold border`}>
          {style.icon}
        </span>
        <span className={`font-medium ${style.text}`}>{rating.source}</span>
      </div>

      <div className="flex items-center gap-2">
        {rating.rating ? (
          <div className="flex items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(rating.rating!)
                      ? 'text-amber-400'
                      : 'text-zinc-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm font-medium text-zinc-700">
              {rating.rating.toFixed(1)}
            </span>
            {rating.ratingsCount && (
              <span className="text-xs text-zinc-500">
                ({rating.ratingsCount.toLocaleString()})
              </span>
            )}
          </div>
        ) : rating.url ? (
          <a
            href={rating.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm ${style.text} hover:underline flex items-center gap-1`}
          >
            View on {rating.source}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        ) : (
          <span className="text-xs text-zinc-400">No rating</span>
        )}
      </div>
    </div>
  );
}

export default function BookDetailsSidebar({ book, onClose }: BookDetailsSidebarProps) {
  if (!book) return null;

  const ratingsWithData = book.ratings.filter(r => r.rating);
  const linkOnlyRatings = book.ratings.filter(r => !r.rating && r.url);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Book Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Book Header */}
          <div className="flex gap-6 mb-6">
            {/* Cover */}
            <div className="flex-shrink-0 w-32 h-48 bg-gradient-to-br from-amber-100 to-amber-50 rounded-lg overflow-hidden shadow-md">
              {book.coverImage ? (
                <Image
                  src={book.coverImage}
                  alt={`Cover of ${book.title}`}
                  width={128}
                  height={192}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title & Author */}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-zinc-900 mb-1">{book.title}</h1>
              {book.author && (
                <p className="text-zinc-600 mb-2">by {book.author}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium">
                  {book.genre}
                </span>
                {book.pages && (
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {book.pages} pages
                  </span>
                )}
                {book.publishedDate && (
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs">
                    {book.publishedDate}
                  </span>
                )}
              </div>
              {book.publisher && (
                <p className="text-xs text-zinc-500 mt-2">Publisher: {book.publisher}</p>
              )}
              {book.isbn && (
                <p className="text-xs text-zinc-500">ISBN: {book.isbn}</p>
              )}
            </div>
          </div>

          {/* Ratings Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Ratings & Reviews
            </h3>

            <div className="space-y-2">
              {ratingsWithData.length > 0 ? (
                ratingsWithData.map((rating, index) => (
                  <RatingDisplay key={index} rating={rating} />
                ))
              ) : (
                <p className="text-sm text-zinc-500 italic p-3 bg-zinc-50 rounded-lg">
                  No ratings available from Google Books or Open Library
                </p>
              )}
            </div>

            {/* External Links */}
            {linkOnlyRatings.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-zinc-500 mb-2">Check reviews on:</p>
                <div className="space-y-2">
                  {linkOnlyRatings.map((rating, index) => (
                    <RatingDisplay key={index} rating={rating} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Synopsis */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Synopsis
            </h3>
            {book.description ? (
              <p className="text-sm text-zinc-600 leading-relaxed">{book.description}</p>
            ) : (
              <p className="text-sm text-zinc-400 italic">No synopsis available</p>
            )}
          </div>

          {/* Subjects/Categories */}
          {book.subjects && book.subjects.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {book.subjects.map((subject, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded text-xs"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {book.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-700 mb-3">Your Notes</h3>
              <p className="text-sm text-zinc-600 p-3 bg-amber-50 rounded-lg border border-amber-100">
                {book.notes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            {book.goodreadsUrl && (
              <a
                href={book.goodreadsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
              >
                View on Goodreads
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
            {book.amazonUrl && (
              <a
                href={book.amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
              >
                View on Amazon
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
