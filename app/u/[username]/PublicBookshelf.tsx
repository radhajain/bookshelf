'use client';

import { useState, useEffect } from 'react';
import { BookWithDetails } from '@/app/lib/books';
import { fetchBookDetails } from '@/app/lib/bookApi';
import BookCard from '@/app/components/BookCard';
import BookDetailsSidebar from '@/app/components/BookDetailsSidebar';
import Link from 'next/link';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
}

interface PublicBookshelfProps {
  profile: Profile;
  books: BookWithDetails[];
  booksByGenre: Record<string, BookWithDetails[]>;
  sortedGenres: string[];
}

export default function PublicBookshelf({
  profile,
  books,
  booksByGenre: initialBooksByGenre,
  sortedGenres,
}: PublicBookshelfProps) {
  const [booksByGenre, setBooksByGenre] = useState(initialBooksByGenre);
  const [enrichedBooks, setEnrichedBooks] = useState<Map<string, BookWithDetails>>(new Map());
  const [selectedBook, setSelectedBook] = useState<BookWithDetails | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: books.length });

  // Enrich books with API data in background
  useEffect(() => {
    async function enrichBooks() {
      const enriched = new Map<string, BookWithDetails>();
      let loaded = 0;

      for (const book of books) {
        const details = await fetchBookDetails(book);
        enriched.set(book.id, details);
        loaded++;
        setLoadingProgress({ loaded, total: books.length });
        setEnrichedBooks(new Map(enriched));
      }
    }

    if (books.length > 0) {
      enrichBooks();
    }
  }, [books]);

  const getEnrichedBook = (book: BookWithDetails): BookWithDetails => {
    return enrichedBooks.get(book.id) || book;
  };

  const displayName = profile.display_name || profile.username;
  const filteredGenres = selectedGenre ? [selectedGenre] : sortedGenres;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                {displayName}&apos;s Bookshelf
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                {books.length} {books.length === 1 ? 'book' : 'books'} across {sortedGenres.length} {sortedGenres.length === 1 ? 'genre' : 'genres'}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Loading Progress */}
              {loadingProgress.loaded < loadingProgress.total && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <div className="w-24 h-2 bg-zinc-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{
                        width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs">Loading...</span>
                </div>
              )}

              <Link
                href="/login"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors text-sm"
              >
                Create Your Own
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Genre Navigation */}
      <nav className="sticky top-[73px] z-20 bg-white/90 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedGenre(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedGenre === null
                  ? 'bg-amber-500 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              All Genres
            </button>
            {sortedGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedGenre === genre
                    ? 'bg-amber-500 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {genre} ({booksByGenre[genre]?.length || 0})
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {books.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-zinc-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-xl font-semibold text-zinc-700 mb-2">No books yet</h2>
            <p className="text-zinc-500">{displayName} hasn&apos;t added any books to their shelf yet.</p>
          </div>
        ) : (
          filteredGenres.map((genre) => (
            <section key={genre} className="mb-12">
              <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-zinc-200">
                <h2 className="text-xl font-bold text-zinc-800">{genre}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-600">
                  {booksByGenre[genre].length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {booksByGenre[genre].map((book) => (
                  <BookCard
                    key={book.id}
                    book={getEnrichedBook(book)}
                    onClick={() => setSelectedBook(getEnrichedBook(book))}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-zinc-500">
          <p>Book data from Google Books & Open Library APIs</p>
          <p className="text-xs mt-1">
            <Link href="/" className="text-amber-600 hover:underline">
              Create your own bookshelf
            </Link>
          </p>
        </div>
      </footer>

      {/* Book Details Sidebar */}
      <BookDetailsSidebar
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
      />
    </div>
  );
}
