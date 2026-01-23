'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { DbBook, DbMovie, DbPodcast } from '@/app/lib/types/database';
import Image from 'next/image';
import Link from 'next/link';
import LoginModal from '@/app/components/auth/LoginModal';

interface BookWithShelfStatus extends DbBook {
  inMyShelf: boolean;
}

interface MovieWithShelfStatus extends DbMovie {
  inMyShelf: boolean;
}

interface PodcastWithShelfStatus extends DbPodcast {
  inMyShelf: boolean;
}

type MediaTypeFilter = 'all' | 'books' | 'movies' | 'podcasts';

export default function BrowsePage() {
  const { user, loading: authLoading } = useAuth();
  const [books, setBooks] = useState<BookWithShelfStatus[]>([]);
  const [movies, setMovies] = useState<MovieWithShelfStatus[]>([]);
  const [podcasts, setPodcasts] = useState<PodcastWithShelfStatus[]>([]);
  const [bookGenres, setBookGenres] = useState<string[]>([]);
  const [movieGenres, setMovieGenres] = useState<string[]>([]);
  const [podcastGenres, setPodcastGenres] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [addingMovieId, setAddingMovieId] = useState<string | null>(null);
  const [addingPodcastId, setAddingPodcastId] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedGenre !== 'all') params.set('genre', selectedGenre);

    // Fetch books, movies, and podcasts in parallel
    const [booksResponse, moviesResponse, podcastsResponse] = await Promise.all([
      fetch(`/api/books?${params}`),
      fetch(`/api/movies?${params}`),
      fetch(`/api/podcasts?${params}`),
    ]);

    if (booksResponse.ok) {
      const data = await booksResponse.json();
      setBooks(data.books || []);
      setBookGenres(data.genres || []);
    }
    if (moviesResponse.ok) {
      const data = await moviesResponse.json();
      setMovies(data.movies || []);
      setMovieGenres(data.genres || []);
    }
    if (podcastsResponse.ok) {
      const data = await podcastsResponse.json();
      setPodcasts(data.podcasts || []);
      setPodcastGenres(data.genres || []);
    }
    setLoading(false);
  }, [searchQuery, selectedGenre]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combined genres from books, movies, and podcasts
  const allGenres = Array.from(new Set([...bookGenres, ...movieGenres, ...podcastGenres])).sort();

  const handleAddBookToShelf = async (book: BookWithShelfStatus) => {
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

  const handleAddMovieToShelf = async (movie: MovieWithShelfStatus) => {
    if (!user) return;

    setAddingMovieId(movie.id);
    try {
      const response = await fetch('/api/user-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: movie.id,
        }),
      });

      if (response.ok) {
        // Update local state to reflect the movie is now in shelf
        setMovies(movies.map(m =>
          m.id === movie.id ? { ...m, inMyShelf: true } : m
        ));
      }
    } catch (error) {
      console.error('Error adding movie to shelf:', error);
    } finally {
      setAddingMovieId(null);
    }
  };

  const handleAddPodcastToShelf = async (podcast: PodcastWithShelfStatus) => {
    if (!user) return;

    setAddingPodcastId(podcast.id);
    try {
      const response = await fetch('/api/user-podcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId: podcast.id,
        }),
      });

      if (response.ok) {
        // Update local state to reflect the podcast is now in shelf
        setPodcasts(podcasts.map(p =>
          p.id === podcast.id ? { ...p, inMyShelf: true } : p
        ));
      }
    } catch (error) {
      console.error('Error adding podcast to shelf:', error);
    } finally {
      setAddingPodcastId(null);
    }
  };

  // Filter items based on media type
  const filteredBooks = mediaTypeFilter === 'all' || mediaTypeFilter === 'books' ? books : [];
  const filteredMovies = mediaTypeFilter === 'all' || mediaTypeFilter === 'movies' ? movies : [];
  const filteredPodcasts = mediaTypeFilter === 'all' || mediaTypeFilter === 'podcasts' ? podcasts : [];
  const totalItems = filteredBooks.length + filteredMovies.length + filteredPodcasts.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Browse Library</h1>
              <p className="text-sm text-zinc-500">
                {books.length} {books.length === 1 ? 'book' : 'books'}
                {movies.length > 0 && (
                  <>, {movies.length} {movies.length === 1 ? 'movie' : 'movies'}</>
                )}
                {podcasts.length > 0 && (
                  <>, {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcasts'}</>
                )} in the library
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                  >
                    My Shelf
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                  >
                    Settings
                  </Link>
                </>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search & Filter Bar */}
      <div className="sticky top-[73px] z-20 bg-white/90 backdrop-blur-sm border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search Input */}
            <div className="flex-1 max-w-md min-w-[200px]">
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
                  placeholder="Search by title or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Media Type Filter */}
            {(movies.length > 0 || podcasts.length > 0) && (
              <select
                value={mediaTypeFilter}
                onChange={(e) => setMediaTypeFilter(e.target.value as MediaTypeFilter)}
                className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors bg-white"
              >
                <option value="all">All Types ({books.length + movies.length + podcasts.length})</option>
                <option value="books">Books ({books.length})</option>
                <option value="movies">Movies ({movies.length})</option>
                <option value="podcasts">Podcasts ({podcasts.length})</option>
              </select>
            )}

            {/* Genre Filter */}
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors bg-white"
            >
              <option value="all">All Genres</option>
              {allGenres.map((genre) => (
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
        ) : totalItems === 0 ? (
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
              {searchQuery || selectedGenre !== 'all' || mediaTypeFilter !== 'all'
                ? 'No items found'
                : 'The library is empty'}
            </h2>
            <p className="text-zinc-500 mb-6">
              {searchQuery || selectedGenre !== 'all' || mediaTypeFilter !== 'all'
                ? 'Try a different search or filter'
                : 'Be the first to add something!'}
            </p>
            {user && (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
              >
                Go to My Shelf
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {/* Render Books */}
            {filteredBooks.map((book) => (
              <div
                key={`book-${book.id}`}
                className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
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

                  {/* Type & Genre Badge */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    {(movies.length > 0 || podcasts.length > 0) && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full w-fit">
                        Book
                      </span>
                    )}
                    {book.genre && book.genre !== 'Uncategorized' && (
                      <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full w-fit">
                        {book.genre}
                      </span>
                    )}
                  </div>

                  {/* In Shelf Badge */}
                  {book.inMyShelf && (
                    <div className="absolute top-2 right-2">
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
                    </div>
                  )}
                </div>

                {/* Book Info */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-zinc-900 line-clamp-2 mb-1">
                    {book.title}
                  </h3>
                  {book.author && (
                    <p className="text-sm text-zinc-500 mb-3">by {book.author}</p>
                  )}

                  {/* Spacer to push button to bottom */}
                  <div className="flex-1" />

                  {/* Add to Shelf Button */}
                  {user && !book.inMyShelf && (
                    <button
                      onClick={() => handleAddBookToShelf(book)}
                      disabled={addingBookId === book.id}
                      className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
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
                      className="block w-full px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors text-center mt-auto"
                    >
                      View in My Shelf
                    </Link>
                  )}

                  {!user && (
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add to My Shelf
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Render Movies */}
            {filteredMovies.map((movie) => (
              <div
                key={`movie-${movie.id}`}
                className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Movie Poster */}
                <div className="aspect-[2/3] bg-gradient-to-br from-zinc-100 to-zinc-200 relative">
                  {movie.poster_image ? (
                    <Image
                      src={movie.poster_image}
                      alt={movie.title}
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
                            d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                          />
                        </svg>
                        <p className="text-xs text-zinc-400 line-clamp-2">
                          {movie.title}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Type & Genre Badge */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full w-fit">
                      Movie
                    </span>
                    {movie.genres && movie.genres[0] && movie.genres[0] !== 'Uncategorized' && (
                      <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full w-fit">
                        {movie.genres[0]}
                      </span>
                    )}
                  </div>

                  {/* In Shelf Badge */}
                  {movie.inMyShelf && (
                    <div className="absolute top-2 right-2">
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
                    </div>
                  )}

                  {/* Rotten Tomatoes Score */}
                  {movie.rotten_tomatoes_score && (
                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full flex items-center gap-1 w-fit">
                        {movie.rotten_tomatoes_score}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Movie Info */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-zinc-900 line-clamp-2 mb-1">
                    {movie.title}
                  </h3>
                  <p className="text-sm text-zinc-500 mb-3">
                    {movie.director && <>by {movie.director}</>}
                    {movie.director && movie.year && ' · '}
                    {movie.year && movie.year}
                  </p>

                  {/* Spacer to push button to bottom */}
                  <div className="flex-1" />

                  {/* Add to Shelf Button */}
                  {user && !movie.inMyShelf && (
                    <button
                      onClick={() => handleAddMovieToShelf(movie)}
                      disabled={addingMovieId === movie.id}
                      className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                    >
                      {addingMovieId === movie.id ? (
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

                  {movie.inMyShelf && (
                    <Link
                      href="/dashboard"
                      className="block w-full px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors text-center mt-auto"
                    >
                      View in My Shelf
                    </Link>
                  )}

                  {!user && (
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add to My Shelf
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Render Podcasts */}
            {filteredPodcasts.map((podcast) => (
              <div
                key={`podcast-${podcast.id}`}
                className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Podcast Cover */}
                <div className="aspect-square bg-gradient-to-br from-purple-100 to-purple-200 relative">
                  {podcast.cover_image ? (
                    <Image
                      src={podcast.cover_image}
                      alt={podcast.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <div className="text-center">
                        <svg
                          className="w-12 h-12 text-purple-300 mx-auto mb-2"
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
                        <p className="text-xs text-purple-400 line-clamp-2">
                          {podcast.title}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Type & Genre Badge */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                    <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full w-fit">
                      Podcast
                    </span>
                    {podcast.genres && podcast.genres[0] && podcast.genres[0] !== 'Uncategorized' && (
                      <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full w-fit">
                        {podcast.genres[0]}
                      </span>
                    )}
                  </div>

                  {/* In Shelf Badge */}
                  {podcast.inMyShelf && (
                    <div className="absolute top-2 right-2">
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
                    </div>
                  )}

                  {/* Episode Count */}
                  {podcast.total_episodes && (
                    <div className="absolute bottom-2 right-2">
                      <span className="px-2 py-0.5 bg-black/70 text-white text-xs rounded-full w-fit">
                        {podcast.total_episodes} eps
                      </span>
                    </div>
                  )}
                </div>

                {/* Podcast Info */}
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-semibold text-zinc-900 line-clamp-2 mb-1">
                    {podcast.title}
                  </h3>
                  {podcast.creator && (
                    <p className="text-sm text-zinc-500 mb-3">by {podcast.creator}</p>
                  )}

                  {/* Spacer to push button to bottom */}
                  <div className="flex-1" />

                  {/* Add to Shelf Button */}
                  {user && !podcast.inMyShelf && (
                    <button
                      onClick={() => handleAddPodcastToShelf(podcast)}
                      disabled={addingPodcastId === podcast.id}
                      className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
                    >
                      {addingPodcastId === podcast.id ? (
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

                  {podcast.inMyShelf && (
                    <Link
                      href="/dashboard"
                      className="block w-full px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors text-center mt-auto"
                    >
                      View in My Shelf
                    </Link>
                  )}

                  {!user && (
                    <button
                      onClick={() => setShowLoginModal(true)}
                      className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add to My Shelf
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => {
            setShowLoginModal(false);
            // Refresh data after login
            fetchData();
          }}
          message="Sign in to add items to your shelf"
        />
      )}
    </div>
  );
}
