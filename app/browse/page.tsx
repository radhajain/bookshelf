'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { DbBook, DbMovie, DbPodcast } from '@/app/lib/types/database';
import { BookWithDetails, RatingSource } from '@/app/lib/books';
import { MovieWithDetails, MovieRatingSource } from '@/app/lib/movies';
import { PodcastWithDetails, PodcastRatingSource } from '@/app/lib/podcasts';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import LoginModal from '@/app/components/auth/LoginModal';
import BookDetailsSidebar from '@/app/components/BookDetailsSidebar';
import MovieDetailsSidebar from '@/app/components/movies/MovieDetailsSidebar';
import PodcastDetailsSidebar from '@/app/components/podcasts/PodcastDetailsSidebar';
import { SkeletonGrid } from '@/app/components/SkeletonCard';

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

// Convert DB book to BookWithDetails format for sidebar
function dbBookToBookWithDetails(dbBook: DbBook): BookWithDetails {
	const ratings: RatingSource[] = [];
	if (dbBook.google_rating) {
		ratings.push({
			source: 'Google Books',
			rating: dbBook.google_rating,
			ratingsCount: dbBook.google_ratings_count || undefined,
		});
	}
	if (dbBook.open_library_rating) {
		ratings.push({
			source: 'Open Library',
			rating: dbBook.open_library_rating,
			ratingsCount: dbBook.open_library_ratings_count || undefined,
		});
	}
	return {
		id: dbBook.id,
		title: dbBook.title,
		author: dbBook.author || undefined,
		genre: dbBook.genre || 'Uncategorized',
		pages: dbBook.page_count || undefined,
		description: dbBook.description || undefined,
		coverImage: dbBook.cover_image || undefined,
		isbn: dbBook.isbn || undefined,
		publishedDate: dbBook.published_date || undefined,
		publisher: dbBook.publisher || undefined,
		subjects: dbBook.subjects || undefined,
		ratings,
		goodreadsUrl: dbBook.goodreads_url || undefined,
		amazonUrl: dbBook.amazon_url || undefined,
		detailsFetchedAt: dbBook.details_fetched_at || undefined,
	};
}

// Convert DB movie to MovieWithDetails format for sidebar
function dbMovieToMovieWithDetails(dbMovie: DbMovie): MovieWithDetails {
	const ratings: MovieRatingSource[] = [];
	if (dbMovie.tmdb_rating) {
		ratings.push({
			source: 'TMDB',
			rating: dbMovie.tmdb_rating,
			ratingsCount: dbMovie.tmdb_ratings_count || undefined,
			displayFormat: 'stars',
		});
	}
	if (dbMovie.rotten_tomatoes_score) {
		ratings.push({
			source: 'Rotten Tomatoes',
			rating: dbMovie.rotten_tomatoes_score,
			displayFormat: 'percentage',
		});
	}
	if (dbMovie.metacritic_score) {
		ratings.push({
			source: 'Metacritic',
			rating: dbMovie.metacritic_score,
			displayFormat: 'score',
		});
	}
	if (dbMovie.imdb_rating) {
		ratings.push({
			source: 'IMDb',
			rating: dbMovie.imdb_rating,
			ratingsCount: dbMovie.imdb_ratings_count || undefined,
			url: dbMovie.imdb_url || undefined,
			displayFormat: 'stars',
		});
	}
	return {
		id: dbMovie.id,
		title: dbMovie.title,
		director: dbMovie.director || undefined,
		year: dbMovie.year || undefined,
		genre: dbMovie.genres?.[0] || 'Uncategorized',
		runtime: dbMovie.runtime_minutes || undefined,
		description: dbMovie.description || undefined,
		tagline: dbMovie.tagline || undefined,
		posterImage: dbMovie.poster_image || undefined,
		backdropImage: dbMovie.backdrop_image || undefined,
		cast: dbMovie.cast_members || undefined,
		genres: dbMovie.genres || undefined,
		tmdbId: dbMovie.tmdb_id || undefined,
		imdbId: dbMovie.imdb_id || undefined,
		releaseDate: dbMovie.release_date || undefined,
		budget: dbMovie.budget || undefined,
		revenue: dbMovie.revenue || undefined,
		productionCompanies: dbMovie.production_companies || undefined,
		imdbUrl: dbMovie.imdb_url || undefined,
		letterboxdUrl: dbMovie.letterboxd_url || undefined,
		ratings,
		detailsFetchedAt: dbMovie.details_fetched_at || undefined,
	};
}

// Convert DB podcast to PodcastWithDetails format for sidebar
function dbPodcastToPodcastWithDetails(
	dbPodcast: DbPodcast,
): PodcastWithDetails {
	const ratings: PodcastRatingSource[] = [];
	if (dbPodcast.itunes_id) {
		ratings.push({
			source: 'Apple Podcasts',
			url: `https://podcasts.apple.com/podcast/id${dbPodcast.itunes_id}`,
		});
	}
	if (dbPodcast.podcast_index_id) {
		ratings.push({
			source: 'Podcast Index',
			url: `https://podcastindex.org/podcast/${dbPodcast.podcast_index_id}`,
		});
	}
	return {
		id: dbPodcast.id,
		title: dbPodcast.title,
		creator: dbPodcast.creator || undefined,
		genre: dbPodcast.genres?.[0] || 'Uncategorized',
		description: dbPodcast.description || undefined,
		coverImage: dbPodcast.cover_image || undefined,
		podcastIndexId: dbPodcast.podcast_index_id || undefined,
		itunesId: dbPodcast.itunes_id || undefined,
		rssFeedUrl: dbPodcast.rss_feed_url || undefined,
		totalEpisodes: dbPodcast.total_episodes || undefined,
		genres: dbPodcast.genres || undefined,
		language: dbPodcast.language || undefined,
		publisher: dbPodcast.publisher || undefined,
		websiteUrl: dbPodcast.website_url || undefined,
		ratings,
		detailsFetchedAt: dbPodcast.details_fetched_at || undefined,
	};
}

function BrowsePageInner() {
	const searchParams = useSearchParams();
	const router = useRouter();
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
	const [mediaTypeFilter, setMediaTypeFilter] =
		useState<MediaTypeFilter>('all');
	const [addingBookId, setAddingBookId] = useState<string | null>(null);
	const [addingMovieId, setAddingMovieId] = useState<string | null>(null);
	const [addingPodcastId, setAddingPodcastId] = useState<string | null>(null);
	const [showLoginModal, setShowLoginModal] = useState(false);

	// Sidebar state
	const [selectedBook, setSelectedBook] = useState<BookWithDetails | null>(
		null,
	);
	const [selectedMovie, setSelectedMovie] = useState<MovieWithDetails | null>(
		null,
	);
	const [selectedPodcast, setSelectedPodcast] =
		useState<PodcastWithDetails | null>(null);

	const fetchData = useCallback(async () => {
		setLoading(true);
		const params = new URLSearchParams();
		if (searchQuery) params.set('q', searchQuery);
		if (selectedGenre !== 'all') params.set('genre', selectedGenre);

		// Fetch books, movies, and podcasts in parallel
		const [booksResponse, moviesResponse, podcastsResponse] = await Promise.all(
			[
				fetch(`/api/books?${params}`),
				fetch(`/api/movies?${params}`),
				fetch(`/api/podcasts?${params}`),
			],
		);

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
	const allGenres = Array.from(
		new Set([...bookGenres, ...movieGenres, ...podcastGenres]),
	).sort();

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
				setBooks(
					books.map((b) => (b.id === book.id ? { ...b, inMyShelf: true } : b)),
				);
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
				setMovies(
					movies.map((m) =>
						m.id === movie.id ? { ...m, inMyShelf: true } : m,
					),
				);
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
				setPodcasts(
					podcasts.map((p) =>
						p.id === podcast.id ? { ...p, inMyShelf: true } : p,
					),
				);
			}
		} catch (error) {
			console.error('Error adding podcast to shelf:', error);
		} finally {
			setAddingPodcastId(null);
		}
	};

	// Selection handlers with URL updates
	const selectBook = useCallback(
		(book: BookWithShelfStatus | null) => {
			if (book) {
				setSelectedBook(dbBookToBookWithDetails(book));
				setSelectedMovie(null);
				setSelectedPodcast(null);
				router.push(`/browse?book=${book.id}`, { scroll: false });
			} else {
				setSelectedBook(null);
				router.push('/browse', { scroll: false });
			}
		},
		[router],
	);

	const selectMovie = useCallback(
		(movie: MovieWithShelfStatus | null) => {
			if (movie) {
				setSelectedMovie(dbMovieToMovieWithDetails(movie));
				setSelectedBook(null);
				setSelectedPodcast(null);
				router.push(`/browse?movie=${movie.id}`, { scroll: false });
			} else {
				setSelectedMovie(null);
				router.push('/browse', { scroll: false });
			}
		},
		[router],
	);

	const selectPodcast = useCallback(
		(podcast: PodcastWithShelfStatus | null) => {
			if (podcast) {
				setSelectedPodcast(dbPodcastToPodcastWithDetails(podcast));
				setSelectedBook(null);
				setSelectedMovie(null);
				router.push(`/browse?podcast=${podcast.id}`, { scroll: false });
			} else {
				setSelectedPodcast(null);
				router.push('/browse', { scroll: false });
			}
		},
		[router],
	);

	// Handle deep linking - open item from URL param
	useEffect(() => {
		if (loading) return;

		const bookId = searchParams.get('book');
		const movieId = searchParams.get('movie');
		const podcastId = searchParams.get('podcast');

		if (bookId) {
			const book = books.find((b) => b.id === bookId);
			if (book) {
				setSelectedBook(dbBookToBookWithDetails(book));
				setSelectedMovie(null);
				setSelectedPodcast(null);
			}
		} else if (movieId) {
			const movie = movies.find((m) => m.id === movieId);
			if (movie) {
				setSelectedMovie(dbMovieToMovieWithDetails(movie));
				setSelectedBook(null);
				setSelectedPodcast(null);
			}
		} else if (podcastId) {
			const podcast = podcasts.find((p) => p.id === podcastId);
			if (podcast) {
				setSelectedPodcast(dbPodcastToPodcastWithDetails(podcast));
				setSelectedBook(null);
				setSelectedMovie(null);
			}
		}
	}, [searchParams, books, movies, podcasts, loading]);

	// Refresh handlers for sidebars - fetch fresh details from API and update both sidebar and list
	const handleRefreshBook = useCallback(
		async (bookId: string): Promise<BookWithDetails | null> => {
			try {
				const response = await fetch(`/api/books/${bookId}/details`, {
					method: 'POST',
				});
				if (response.ok) {
					const data = await response.json();
					const updatedBook = data.book as DbBook;
					// Update the books list
					setBooks((prev) =>
						prev.map((b) =>
							b.id === bookId ? { ...updatedBook, inMyShelf: b.inMyShelf } : b,
						),
					);
					// Update the selected book in sidebar
					const bookWithDetails = dbBookToBookWithDetails(updatedBook);
					setSelectedBook(bookWithDetails);
					return bookWithDetails;
				}
			} catch (error) {
				console.error('Error refreshing book:', error);
			}
			return null;
		},
		[],
	);

	const handleRefreshMovie = useCallback(
		async (movieId: string): Promise<MovieWithDetails | null> => {
			try {
				const response = await fetch(`/api/movies/${movieId}/details`, {
					method: 'POST',
				});
				if (response.ok) {
					const data = await response.json();
					const updatedMovie = data.movie as DbMovie;
					// Update the movies list
					setMovies((prev) =>
						prev.map((m) =>
							m.id === movieId
								? { ...updatedMovie, inMyShelf: m.inMyShelf }
								: m,
						),
					);
					// Update the selected movie in sidebar
					const movieWithDetails = dbMovieToMovieWithDetails(updatedMovie);
					setSelectedMovie(movieWithDetails);
					return movieWithDetails;
				}
			} catch (error) {
				console.error('Error refreshing movie:', error);
			}
			return null;
		},
		[],
	);

	const handleRefreshPodcast = useCallback(
		async (podcastId: string): Promise<PodcastWithDetails | null> => {
			try {
				const response = await fetch(`/api/podcasts/${podcastId}/details`, {
					method: 'POST',
				});
				if (response.ok) {
					const data = await response.json();
					const updatedPodcast = data.podcast as DbPodcast;
					// Update the podcasts list
					setPodcasts((prev) =>
						prev.map((p) =>
							p.id === podcastId
								? { ...updatedPodcast, inMyShelf: p.inMyShelf }
								: p,
						),
					);
					// Update the selected podcast in sidebar
					const podcastWithDetails =
						dbPodcastToPodcastWithDetails(updatedPodcast);
					setSelectedPodcast(podcastWithDetails);
					return podcastWithDetails;
				}
			} catch (error) {
				console.error('Error refreshing podcast:', error);
			}
			return null;
		},
		[],
	);

	// Filter items based on media type
	const filteredBooks =
		mediaTypeFilter === 'all' || mediaTypeFilter === 'books' ? books : [];
	const filteredMovies =
		mediaTypeFilter === 'all' || mediaTypeFilter === 'movies' ? movies : [];
	const filteredPodcasts =
		mediaTypeFilter === 'all' || mediaTypeFilter === 'podcasts' ? podcasts : [];
	const totalItems =
		filteredBooks.length + filteredMovies.length + filteredPodcasts.length;

	return (
		<div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
			{/* Header */}
			<header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
				<div className="max-w-7xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-zinc-900">
								Browse Library
							</h1>
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
										Profile
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
								onChange={(e) =>
									setMediaTypeFilter(e.target.value as MediaTypeFilter)
								}
								className="px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors bg-white"
							>
								<option value="all">
									All Types ({books.length + movies.length + podcasts.length})
								</option>
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
					<SkeletonGrid count={8} />
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
							{searchQuery ||
							selectedGenre !== 'all' ||
							mediaTypeFilter !== 'all'
								? 'No items found'
								: 'The library is empty'}
						</h2>
						<p className="text-zinc-500 mb-6">
							{searchQuery ||
							selectedGenre !== 'all' ||
							mediaTypeFilter !== 'all'
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
								onClick={() => selectBook(book)}
								className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
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
												<svg
													className="w-3 h-3"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
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
										<p className="text-sm text-zinc-500 mb-3">
											by {book.author}
										</p>
									)}

									{/* Spacer to push button to bottom */}
									<div className="flex-1" />

									{/* Add to Shelf Button */}
									{user && !book.inMyShelf && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleAddBookToShelf(book);
											}}
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

									{book.inMyShelf && (
										<Link
											href={`/dashboard?book=${book.id}`}
											onClick={(e) => e.stopPropagation()}
											className="block w-full px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors text-center mt-auto"
										>
											View in My Shelf
										</Link>
									)}

									{!user && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												setShowLoginModal(true);
											}}
											className="w-full px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
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
						))}

						{/* Render Movies */}
						{filteredMovies.map((movie) => (
							<div
								key={`movie-${movie.id}`}
								onClick={() => selectMovie(movie)}
								className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
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
										{movie.genres &&
											movie.genres[0] &&
											movie.genres[0] !== 'Uncategorized' && (
												<span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full w-fit">
													{movie.genres[0]}
												</span>
											)}
									</div>

									{/* In Shelf Badge */}
									{movie.inMyShelf && (
										<div className="absolute top-2 right-2">
											<span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full flex items-center gap-1 w-fit">
												<svg
													className="w-3 h-3"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
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
											onClick={(e) => {
												e.stopPropagation();
												handleAddMovieToShelf(movie);
											}}
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

									{movie.inMyShelf && (
										<Link
											href={`/dashboard?movie=${movie.id}`}
											onClick={(e) => e.stopPropagation()}
											className="block w-full px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors text-center mt-auto"
										>
											View in My Shelf
										</Link>
									)}

									{!user && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												setShowLoginModal(true);
											}}
											className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
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
						))}

						{/* Render Podcasts */}
						{filteredPodcasts.map((podcast) => (
							<div
								key={`podcast-${podcast.id}`}
								onClick={() => selectPodcast(podcast)}
								className="bg-white rounded-xl shadow-sm border border-zinc-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
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
										{podcast.genres &&
											podcast.genres[0] &&
											podcast.genres[0] !== 'Uncategorized' && (
												<span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded-full w-fit">
													{podcast.genres[0]}
												</span>
											)}
									</div>

									{/* In Shelf Badge */}
									{podcast.inMyShelf && (
										<div className="absolute top-2 right-2">
											<span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full flex items-center gap-1 w-fit">
												<svg
													className="w-3 h-3"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
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
										<p className="text-sm text-zinc-500 mb-3">
											by {podcast.creator}
										</p>
									)}

									{/* Spacer to push button to bottom */}
									<div className="flex-1" />

									{/* Add to Shelf Button */}
									{user && !podcast.inMyShelf && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												handleAddPodcastToShelf(podcast);
											}}
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

									{podcast.inMyShelf && (
										<Link
											href={`/dashboard?podcast=${podcast.id}`}
											onClick={(e) => e.stopPropagation()}
											className="block w-full px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-medium rounded-lg transition-colors text-center mt-auto"
										>
											View in My Shelf
										</Link>
									)}

									{!user && (
										<button
											onClick={(e) => {
												e.stopPropagation();
												setShowLoginModal(true);
											}}
											className="w-full px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto"
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

			{/* Book Details Sidebar */}
			<BookDetailsSidebar
				book={selectedBook}
				onClose={() => {
					setSelectedBook(null);
					router.push('/browse', { scroll: false });
				}}
				onRefresh={
					selectedBook ? () => handleRefreshBook(selectedBook.id) : undefined
				}
			/>

			{/* Movie Details Sidebar */}
			<MovieDetailsSidebar
				movie={selectedMovie}
				onClose={() => {
					setSelectedMovie(null);
					router.push('/browse', { scroll: false });
				}}
				onRefresh={
					selectedMovie ? () => handleRefreshMovie(selectedMovie.id) : undefined
				}
			/>

			{/* Podcast Details Sidebar */}
			<PodcastDetailsSidebar
				podcast={selectedPodcast}
				onClose={() => {
					setSelectedPodcast(null);
					router.push('/browse', { scroll: false });
				}}
				onRefresh={
					selectedPodcast
						? () => handleRefreshPodcast(selectedPodcast.id)
						: undefined
				}
			/>
		</div>
	);
}

// Main component with Suspense boundary for useSearchParams
export default function BrowsePage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
					{/* Header skeleton */}
					<header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
						<div className="max-w-7xl mx-auto px-4 py-4">
							<div className="flex items-center justify-between">
								<div>
									<div className="h-7 w-40 bg-zinc-200 rounded animate-pulse mb-2" />
									<div className="h-4 w-56 bg-zinc-100 rounded animate-pulse" />
								</div>
								<div className="flex items-center gap-3">
									<div className="h-9 w-24 bg-zinc-100 rounded-lg animate-pulse" />
									<div className="h-9 w-20 bg-zinc-100 rounded-lg animate-pulse" />
								</div>
							</div>
						</div>
					</header>
					{/* Content skeleton */}
					<main className="max-w-7xl mx-auto px-4 py-8">
						<SkeletonGrid count={8} />
					</main>
				</div>
			}
		>
			<BrowsePageInner />
		</Suspense>
	);
}
