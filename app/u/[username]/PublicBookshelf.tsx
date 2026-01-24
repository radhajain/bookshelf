'use client';

import { useState } from 'react';
import { BookWithDetails } from '@/app/lib/books';
import { MovieWithDetails } from '@/app/lib/movies';
import { PodcastWithDetails } from '@/app/lib/podcasts';
import { TVShowWithDetails } from '@/app/lib/tvshows';
import BookCard from '@/app/components/BookCard';
import BookDetailsSidebar from '@/app/components/BookDetailsSidebar';
import MovieCard from '@/app/components/movies/MovieCard';
import MovieDetailsSidebar from '@/app/components/movies/MovieDetailsSidebar';
import PodcastCard from '@/app/components/PodcastCard';
import PodcastDetailsSidebar from '@/app/components/podcasts/PodcastDetailsSidebar';
import { TVShowCard, TVShowDetailsSidebar } from '@/app/components/tvshows';
import Link from 'next/link';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
}

type MediaTypeFilter = 'all' | 'books' | 'movies' | 'podcasts' | 'tvshows';

interface PublicBookshelfProps {
  profile: Profile;
  books: BookWithDetails[];
  movies: MovieWithDetails[];
  podcasts: PodcastWithDetails[];
  tvshows: TVShowWithDetails[];
  booksByGenre: Record<string, BookWithDetails[]>;
  moviesByGenre: Record<string, MovieWithDetails[]>;
  podcastsByGenre: Record<string, PodcastWithDetails[]>;
  tvshowsByGenre: Record<string, TVShowWithDetails[]>;
  sortedGenres: string[];
}

export default function PublicBookshelf({
  profile,
  books,
  movies,
  podcasts,
  tvshows,
  booksByGenre,
  moviesByGenre,
  podcastsByGenre,
  tvshowsByGenre,
  sortedGenres,
}: PublicBookshelfProps) {
  const [selectedBook, setSelectedBook] = useState<BookWithDetails | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MovieWithDetails | null>(null);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastWithDetails | null>(null);
  const [selectedTVShow, setSelectedTVShow] = useState<TVShowWithDetails | null>(null);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');

  const displayName = profile.display_name || profile.username;

  // Filter genres based on media type filter
  const filteredGenres = (selectedGenre ? [selectedGenre] : sortedGenres).filter((genre) => {
    const hasBooks = booksByGenre[genre]?.length > 0;
    const hasMovies = moviesByGenre[genre]?.length > 0;
    const hasPodcasts = podcastsByGenre[genre]?.length > 0;
    const hasTVShows = tvshowsByGenre[genre]?.length > 0;
    if (mediaTypeFilter === 'books') return hasBooks;
    if (mediaTypeFilter === 'movies') return hasMovies;
    if (mediaTypeFilter === 'podcasts') return hasPodcasts;
    if (mediaTypeFilter === 'tvshows') return hasTVShows;
    return hasBooks || hasMovies || hasPodcasts || hasTVShows;
  });

  const totalItems = books.length + movies.length + podcasts.length + tvshows.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">
                {displayName}&apos;s Shelf
              </h1>
              <p className="text-sm text-zinc-500 mt-1">
                {books.length} {books.length === 1 ? 'book' : 'books'}
                {movies.length > 0 && (
                  <>, {movies.length} {movies.length === 1 ? 'movie' : 'movies'}</>
                )}
                {tvshows.length > 0 && (
                  <>, {tvshows.length} {tvshows.length === 1 ? 'TV show' : 'TV shows'}</>
                )}
                {podcasts.length > 0 && (
                  <>, {podcasts.length} {podcasts.length === 1 ? 'podcast' : 'podcasts'}</>
                )}
                {' '}across {sortedGenres.length} {sortedGenres.length === 1 ? 'genre' : 'genres'}
              </p>
            </div>

            <div className="flex items-center gap-4">
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
          <div className="flex flex-col gap-3">
            {/* Media Type Filter */}
            {(movies.length > 0 || podcasts.length > 0 || tvshows.length > 0) && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setMediaTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    mediaTypeFilter === 'all'
                      ? 'bg-zinc-700 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  All ({totalItems})
                </button>
                <button
                  onClick={() => setMediaTypeFilter('books')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    mediaTypeFilter === 'books'
                      ? 'bg-amber-500 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Books ({books.length})
                </button>
                <button
                  onClick={() => setMediaTypeFilter('movies')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    mediaTypeFilter === 'movies'
                      ? 'bg-blue-500 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Movies ({movies.length})
                </button>
                <button
                  onClick={() => setMediaTypeFilter('tvshows')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    mediaTypeFilter === 'tvshows'
                      ? 'bg-green-500 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  TV Shows ({tvshows.length})
                </button>
                <button
                  onClick={() => setMediaTypeFilter('podcasts')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    mediaTypeFilter === 'podcasts'
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Podcasts ({podcasts.length})
                </button>
              </div>
            )}

            {/* Genre Filter */}
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
              {sortedGenres.map((genre) => {
                const bookCount = booksByGenre[genre]?.length || 0;
                const movieCount = moviesByGenre[genre]?.length || 0;
                const podcastCount = podcastsByGenre[genre]?.length || 0;
                const tvshowCount = tvshowsByGenre[genre]?.length || 0;
                const itemCount =
                  (mediaTypeFilter === 'all' || mediaTypeFilter === 'books' ? bookCount : 0) +
                  (mediaTypeFilter === 'all' || mediaTypeFilter === 'movies' ? movieCount : 0) +
                  (mediaTypeFilter === 'all' || mediaTypeFilter === 'podcasts' ? podcastCount : 0) +
                  (mediaTypeFilter === 'all' || mediaTypeFilter === 'tvshows' ? tvshowCount : 0);

                // Hide genres with no items based on filter
                if (itemCount === 0) return null;

                return (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedGenre === genre
                        ? 'bg-amber-500 text-white'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    {genre} ({itemCount})
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {totalItems === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-zinc-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h2 className="text-xl font-semibold text-zinc-700 mb-2">Nothing here yet</h2>
            <p className="text-zinc-500">{displayName} hasn&apos;t added anything to their shelf yet.</p>
          </div>
        ) : (
          filteredGenres.map((genre) => {
            const genreBooks = booksByGenre[genre] || [];
            const genreMovies = moviesByGenre[genre] || [];
            const genrePodcasts = podcastsByGenre[genre] || [];
            const genreTVShows = tvshowsByGenre[genre] || [];
            const showBooks = mediaTypeFilter === 'all' || mediaTypeFilter === 'books';
            const showMovies = mediaTypeFilter === 'all' || mediaTypeFilter === 'movies';
            const showPodcasts = mediaTypeFilter === 'all' || mediaTypeFilter === 'podcasts';
            const showTVShows = mediaTypeFilter === 'all' || mediaTypeFilter === 'tvshows';
            const itemCount =
              (showBooks ? genreBooks.length : 0) +
              (showMovies ? genreMovies.length : 0) +
              (showPodcasts ? genrePodcasts.length : 0) +
              (showTVShows ? genreTVShows.length : 0);

            if (itemCount === 0) return null;

            return (
              <section key={genre} className="mb-12">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-zinc-200">
                  <h2 className="text-xl font-bold text-zinc-800">{genre}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-600">
                    {itemCount}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {/* Render books */}
                  {showBooks && genreBooks.map((book) => (
                    <BookCard
                      key={`book-${book.id}`}
                      book={book}
                      onClick={() => {
                        setSelectedMovie(null);
                        setSelectedPodcast(null);
                        setSelectedTVShow(null);
                        setSelectedBook(book);
                      }}
                    />
                  ))}
                  {/* Render movies */}
                  {showMovies && genreMovies.map((movie) => (
                    <MovieCard
                      key={`movie-${movie.id}`}
                      movie={movie}
                      onClick={() => {
                        setSelectedBook(null);
                        setSelectedPodcast(null);
                        setSelectedTVShow(null);
                        setSelectedMovie(movie);
                      }}
                    />
                  ))}
                  {/* Render TV shows */}
                  {showTVShows && genreTVShows.map((tvshow) => (
                    <TVShowCard
                      key={`tvshow-${tvshow.id}`}
                      tvshow={tvshow}
                      onClick={() => {
                        setSelectedBook(null);
                        setSelectedMovie(null);
                        setSelectedPodcast(null);
                        setSelectedTVShow(tvshow);
                      }}
                    />
                  ))}
                  {/* Render podcasts */}
                  {showPodcasts && genrePodcasts.map((podcast) => (
                    <PodcastCard
                      key={`podcast-${podcast.id}`}
                      podcast={podcast}
                      onClick={() => {
                        setSelectedBook(null);
                        setSelectedMovie(null);
                        setSelectedTVShow(null);
                        setSelectedPodcast(podcast);
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-zinc-500">
          <p>Book data from Google Books & Open Library. Movie & TV show data from TMDB. Podcast data from iTunes.</p>
          <p className="text-xs mt-1">
            <Link href="/" className="text-amber-600 hover:underline">
              Create your own shelf
            </Link>
          </p>
        </div>
      </footer>

      {/* Book Details Sidebar */}
      <BookDetailsSidebar
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
      />

      {/* Movie Details Sidebar */}
      <MovieDetailsSidebar
        movie={selectedMovie}
        onClose={() => setSelectedMovie(null)}
      />

      {/* Podcast Details Sidebar */}
      <PodcastDetailsSidebar
        podcast={selectedPodcast}
        onClose={() => setSelectedPodcast(null)}
      />

      {/* TV Show Details Sidebar */}
      <TVShowDetailsSidebar
        tvshow={selectedTVShow}
        onClose={() => setSelectedTVShow(null)}
      />
    </div>
  );
}
