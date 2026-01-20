'use client';

import { useState, useEffect } from 'react';
import { Book, BookWithDetails, getBooksByGenre, getGenres } from '../lib/books';
import { fetchBookDetails } from '../lib/bookApi';
import GenreSection from './GenreSection';
import BookDetailsSidebar from './BookDetailsSidebar';

export default function Bookshelf() {
  const [booksByGenre, setBooksByGenre] = useState<Record<string, BookWithDetails[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState({ loaded: 0, total: 0 });
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookWithDetails | null>(null);

  const genres = getGenres();

  useEffect(() => {
    async function loadBooks() {
      const grouped = getBooksByGenre();
      const allBooks = Object.values(grouped).flat();
      setLoadingProgress({ loaded: 0, total: allBooks.length });

      // Initialize with books without details (with empty ratings array)
      const initialState: Record<string, BookWithDetails[]> = {};
      for (const [genre, books] of Object.entries(grouped)) {
        initialState[genre] = books.map(book => ({ ...book, ratings: [] }));
      }
      setBooksByGenre(initialState);
      setLoading(false);

      // Fetch details in background
      let loadedCount = 0;
      for (const [genre, books] of Object.entries(grouped)) {
        const detailedBooks: BookWithDetails[] = [];

        for (const book of books) {
          const detailed = await fetchBookDetails(book);
          detailedBooks.push(detailed);
          loadedCount++;
          setLoadingProgress({ loaded: loadedCount, total: allBooks.length });
        }

        setBooksByGenre(prev => ({
          ...prev,
          [genre]: detailedBooks,
        }));
      }
    }

    loadBooks();
  }, []);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedBook(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const filteredGenres = selectedGenre
    ? [selectedGenre]
    : Object.keys(booksByGenre).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
      });

  const totalBooks = Object.values(booksByGenre).flat().length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                My Reading List
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                {totalBooks} books across {genres.length} genres
              </p>
            </div>

            {/* Loading Progress */}
            {loadingProgress.loaded < loadingProgress.total && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <div className="w-32 h-2 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{
                      width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <span>Loading details... ({loadingProgress.loaded}/{loadingProgress.total})</span>
              </div>
            )}
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
            {genres.map(genre => (
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4" />
            <p className="text-zinc-500">Loading your bookshelf...</p>
          </div>
        ) : (
          <>
            {filteredGenres.map(genre => (
              <GenreSection
                key={genre}
                genre={genre}
                books={booksByGenre[genre] || []}
                onBookClick={setSelectedBook}
              />
            ))}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-zinc-500">
          <p>Book data from Google Books & Open Library APIs</p>
          <p className="text-xs mt-1">Click any book for Goodreads & Amazon links</p>
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
