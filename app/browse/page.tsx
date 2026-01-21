'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { DbBook } from '@/app/lib/types/database';
import Image from 'next/image';
import Link from 'next/link';

interface BookWithShelfStatus extends DbBook {
  inMyShelf: boolean;
}

export default function BrowsePage() {
  const { user, loading: authLoading } = useAuth();
  const [books, setBooks] = useState<BookWithShelfStatus[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [addingBookId, setAddingBookId] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedGenre !== 'all') params.set('genre', selectedGenre);

    const response = await fetch(`/api/books?${params}`);
    if (response.ok) {
      const data = await response.json();
      setBooks(data.books || []);
      setGenres(data.genres || []);
    }
    setLoading(false);
  }, [searchQuery, selectedGenre]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleAddToShelf = async (book: BookWithShelfStatus) => {
    if (!user) return;

    setAddingBookId(book.id);
    try {
      const response = await fetch('/api/user-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: book.id,
        }),
      });

      if (response.ok) {
        // Update local state to reflect the book is now in shelf
        setBooks(books.map(b =>
          b.id === book.id ? { ...b, inMyShelf: true } : b
        ));
      }
    } catch (error) {
      console.error('Error adding book to shelf:', error);
    } finally {
      setAddingBookId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Browse Library</h1>
              <p className="text-sm text-zinc-500">
                {books.length} {books.length === 1 ? 'book' : 'books'} in the library
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                  >
                    My Bookshelf
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    Settings
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                >
                  Login to Add Books
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search & Filter Bar */}
      <div className="sticky top-[73px] z-20 bg-white/90 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Search by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Genre Filter */}
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors bg-white"
            >
              <option value="all">All Genres</option>
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {authLoading || loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4" />
            <p className="text-zinc-500">Loading library...</p>
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-16 h-16 text-zinc-300 mx-auto mb-4"
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
            <h2 className="text-xl font-semibold text-zinc-700 mb-2">
              {searchQuery || selectedGenre !== 'all'
                ? 'No books found'
                : 'The library is empty'}
            </h2>
            <p className="text-zinc-500 mb-6">
              {searchQuery || selectedGenre !== 'all'
                ? 'Try a different search or filter'
                : 'Be the first to add a book!'}
            </p>
            {user && (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
              >
                Add a Book
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Book Cover */}
                <div className="aspect-[2/3] bg-gradient-to-br from-zinc-100 to-zinc-200 relative">
                  {book.cover_image ? (
                    <Image
                      src={book.cover_image}
                      alt={book.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="text-center">
                        <svg
                          className="w-12 h-12 text-zinc-300 mx-auto mb-2"
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
                        <p className="text-xs text-zinc-400 line-clamp-2">
                          {book.title}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Genre Badge */}
                  {book.genre && book.genre !== 'Uncategorized' && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full">
                        {book.genre}
                      </span>
                    </div>
                  )}

                  {/* In Shelf Badge */}
                  {book.inMyShelf && (
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        In My Shelf
                      </span>
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-zinc-900 line-clamp-2 mb-1">
                    {book.title}
                  </h3>
                  {book.author && (
                    <p className="text-sm text-zinc-500 mb-3">by {book.author}</p>
                  )}

                  {/* Add to Shelf Button */}
                  {user && !book.inMyShelf && (
                    <button
                      onClick={() => handleAddToShelf(book)}
                      disabled={addingBookId === book.id}
                      className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {addingBookId === book.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Add to My Shelf
                        </>
                      )}
                    </button>
                  )}

                  {book.inMyShelf && (
                    <Link
                      href="/dashboard"
                      className="block w-full px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors text-center"
                    >
                      View in My Shelf
                    </Link>
                  )}

                  {!user && (
                    <Link
                      href="/login"
                      className="block w-full px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors text-center"
                    >
                      Login to Add
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
