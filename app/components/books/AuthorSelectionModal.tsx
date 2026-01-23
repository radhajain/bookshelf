'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface BookSearchResult {
  googleId: string;
  title: string;
  author?: string;
  description?: string;
  coverImage?: string;
  publishedDate?: string;
  publisher?: string;
  ratingsCount?: number;
  averageRating?: number;
}

interface AuthorSelectionModalProps {
  bookTitle: string;
  bookId: string;
  onClose: () => void;
  onAuthorSelected: (author: string) => void;
}

export default function AuthorSelectionModal({
  bookTitle,
  bookId,
  onClose,
  onAuthorSelected,
}: AuthorSelectionModalProps) {
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(bookTitle);
  const [debouncedQuery, setDebouncedQuery] = useState(bookTitle);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchBooks = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Filter to only show results with authors
        const resultsWithAuthors = (data.results as BookSearchResult[]).filter(
          (book) => book.author
        );
        // Sort by ratings count (descending)
        resultsWithAuthors.sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0));
        setSearchResults(resultsWithAuthors);
      } else {
        setError('Failed to search for books');
      }
    } catch (err) {
      console.error('Error searching books:', err);
      setError('Failed to search for books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    searchBooks(debouncedQuery);
  }, [debouncedQuery, searchBooks]);

  const handleSelectBook = async (selectedBook: BookSearchResult) => {
    if (!selectedBook.author) return;

    setUpdating(true);
    setError('');

    try {
      // Update the book with the selected author and cover image if available
      const response = await fetch(`/api/books/${bookId}/author`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: selectedBook.author,
          coverImage: selectedBook.coverImage,
        }),
      });

      if (response.ok) {
        onAuthorSelected(selectedBook.author);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update author');
      }
    } catch (err) {
      console.error('Error updating author:', err);
      setError('Failed to update author');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-zinc-900">Select Author</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Search Input */}
          <div>
            <label htmlFor="author-search" className="block text-sm font-medium text-zinc-700 mb-1">
              Search for a book or author
            </label>
            <div className="relative">
              <input
                id="author-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or author..."
                className="w-full px-4 py-2 pl-10 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Searching for: &quot;{debouncedQuery}&quot;
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-3" />
              <p className="text-sm text-zinc-500">Searching for authors...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500">No authors found. Try a different search.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2">
              {searchResults.map((book) => (
                <button
                  key={book.googleId}
                  onClick={() => handleSelectBook(book)}
                  disabled={updating}
                  className="w-full flex gap-3 p-3 border border-zinc-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {book.coverImage ? (
                    <Image
                      src={book.coverImage}
                      alt={book.title}
                      width={48}
                      height={72}
                      className="w-12 h-18 object-cover rounded flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-18 bg-zinc-200 rounded flex-shrink-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-zinc-900 truncate">{book.title}</h3>
                    {book.author && (
                      <p className="text-sm text-zinc-600 truncate">by {book.author}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {book.publishedDate && (
                        <span className="text-xs text-zinc-400">{book.publishedDate}</span>
                      )}
                      {book.ratingsCount !== undefined && book.ratingsCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {book.ratingsCount.toLocaleString()} reviews
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
