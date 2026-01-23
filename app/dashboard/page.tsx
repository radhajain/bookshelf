'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { createClient } from '@/app/lib/supabase/client';
import { UserBookWithDetails, DbBook, UserMovieWithDetails, DbMovie } from '@/app/lib/types/database';
import { BookWithDetails, RatingSource } from '@/app/lib/books';
import { MovieWithDetails, MovieRatingSource } from '@/app/lib/movies';
import { RateLimitError } from '@/app/lib/bookApi';
import BookCard from '@/app/components/BookCard';
import BookDetailsSidebar from '@/app/components/BookDetailsSidebar';
import MovieCard from '@/app/components/movies/MovieCard';
import MovieDetailsSidebar from '@/app/components/movies/MovieDetailsSidebar';
import AddBookModal from '@/app/components/books/AddBookModal';
import AddMovieModal from '@/app/components/movies/AddMovieModal';
import CSVUploadModal from '@/app/components/books/CSVUploadModal';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// Media type filter
type MediaTypeFilter = 'all' | 'books' | 'movies';

// Convert DB book to BookWithDetails format
function dbBookToBookWithDetails(
	dbBook: DbBook,
	userBook?: UserBookWithDetails,
): BookWithDetails {
	const ratings: RatingSource[] = [];

	if (dbBook.google_rating) {
		ratings.push({
			source: 'Google Books',
			rating: dbBook.google_rating,
			ratingsCount: dbBook.google_ratings_count || undefined,
			url: undefined,
		});
	}

	if (dbBook.open_library_rating) {
		ratings.push({
			source: 'Open Library',
			rating: dbBook.open_library_rating,
			ratingsCount: dbBook.open_library_ratings_count || undefined,
			url: undefined,
		});
	}

	return {
		id: dbBook.id,
		title: dbBook.title,
		author: dbBook.author || undefined,
		genre: dbBook.genre || 'Uncategorized',
		pages: dbBook.page_count || undefined,
		notes: userBook?.notes || undefined,
		priority: userBook?.priority || undefined,
		description: dbBook.description || undefined,
		coverImage: dbBook.cover_image || undefined,
		isbn: dbBook.isbn || undefined,
		publishedDate: dbBook.published_date || undefined,
		publisher: dbBook.publisher || undefined,
		subjects: dbBook.subjects || undefined,
		ratings,
		goodreadsUrl: dbBook.goodreads_url || undefined,
		amazonUrl: dbBook.amazon_url || undefined,
		needsAuthorClarification: dbBook.needs_author_clarification || false,
		detailsFetchedAt: dbBook.details_fetched_at || undefined,
	};
}

// Convert DB movie to MovieWithDetails format
function dbMovieToMovieWithDetails(
	dbMovie: DbMovie,
	userMovie?: UserMovieWithDetails,
): MovieWithDetails {
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
		genre: userMovie?.genre || (dbMovie.genres?.[0]) || 'Uncategorized',
		runtime: dbMovie.runtime_minutes || undefined,
		notes: userMovie?.notes || undefined,
		priority: userMovie?.priority || undefined,
		watched: userMovie?.watched || false,
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

function DashboardPageInner() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { user, profile, signOut, loading: authLoading } = useAuth();
	const [userBooks, setUserBooks] = useState<UserBookWithDetails[]>([]);
	const [userMovies, setUserMovies] = useState<UserMovieWithDetails[]>([]);
	const [enrichedBooks, setEnrichedBooks] = useState<
		Map<string, BookWithDetails>
	>(new Map());
	const [enrichedMovies, setEnrichedMovies] = useState<
		Map<string, MovieWithDetails>
	>(new Map());
	const [loading, setLoading] = useState(true);
	const [loadingProgress, setLoadingProgress] = useState({
		loaded: 0,
		total: 0,
	});
	const [selectedBook, setSelectedBook] = useState<BookWithDetails | null>(
		null,
	);
	const [selectedMovie, setSelectedMovie] = useState<MovieWithDetails | null>(
		null,
	);
	const [selectedUserBookId, setSelectedUserBookId] = useState<string | null>(
		null,
	);
	const [selectedUserMovieId, setSelectedUserMovieId] = useState<string | null>(
		null,
	);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showAddMovieModal, setShowAddMovieModal] = useState(false);
	const [showCSVModal, setShowCSVModal] = useState(false);
	const [isEnrichmentPaused, setIsEnrichmentPaused] = useState(false);
	const [isEnriching, setIsEnriching] = useState(false);
	const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
	const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');
	const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>('all');
	const [collapsedGenres, setCollapsedGenres] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState('');
	const enrichmentPausedRef = useRef(false);
	const supabase = createClient();

	const toggleGenreCollapsed = (genre: string) => {
		setCollapsedGenres((prev) => {
			const next = new Set(prev);
			if (next.has(genre)) {
				next.delete(genre);
			} else {
				next.add(genre);
			}
			return next;
		});
	};

	const collapseAllGenres = () => {
		setCollapsedGenres(new Set(sortedGenres));
	};

	const expandAllGenres = () => {
		setCollapsedGenres(new Set());
	};

	// Keep ref in sync with state
	useEffect(() => {
		enrichmentPausedRef.current = isEnrichmentPaused;
	}, [isEnrichmentPaused]);

	// Clear rate limit message when unpaused
	useEffect(() => {
		if (!isEnrichmentPaused) {
			setRateLimitMessage(null);
		}
	}, [isEnrichmentPaused]);

	const enrichBooks = useCallback(
		async (books: UserBookWithDetails[]) => {
			const enriched = new Map<string, BookWithDetails>();
			setLoadingProgress({ loaded: 0, total: books.length });
			setIsEnriching(true);
			let loaded = 0;

			for (const ub of books) {
				// Check if paused
				if (enrichmentPausedRef.current) {
					// Wait until unpaused
					await new Promise<void>((resolve) => {
						const checkPause = () => {
							if (!enrichmentPausedRef.current) {
								resolve();
							} else {
								setTimeout(checkPause, 100);
							}
						};
						checkPause();
					});
				}

				// Check if book already has cached details
				if (ub.book.details_fetched_at) {
					// Use cached data from database
					enriched.set(ub.book_id, dbBookToBookWithDetails(ub.book, ub));
					loaded++;
					setLoadingProgress({ loaded, total: books.length });
					setEnrichedBooks(new Map(enriched));
				} else if (!enriched.has(ub.book_id)) {
					// Fetch and cache details via API
					try {
						const response = await fetch(`/api/books/${ub.book_id}/details`);
						if (response.ok) {
							const { book: updatedBook } = await response.json();
							enriched.set(
								ub.book_id,
								dbBookToBookWithDetails(updatedBook, ub),
							);
						} else if (response.status === 429) {
							// Rate limited - pause enrichment
							const data = await response.json();
							setRateLimitMessage(data.error || 'Rate limited. Pausing...');
							setIsEnrichmentPaused(true);
							enrichmentPausedRef.current = true;
							// Don't increment loaded - we'll retry this book
							continue;
						}
					} catch (error) {
						if (error instanceof RateLimitError) {
							setRateLimitMessage(error.message);
							setIsEnrichmentPaused(true);
							enrichmentPausedRef.current = true;
							continue;
						}
						console.error('Error fetching book details:', error);
					}
					loaded++;
					setLoadingProgress({ loaded, total: books.length });
					setEnrichedBooks(new Map(enriched));
				}
			}
			setIsEnriching(false);
		},
		[],
	);

	const enrichMovies = useCallback(
		async (movies: UserMovieWithDetails[]) => {
			const enriched = new Map<string, MovieWithDetails>();

			for (const um of movies) {
				// Check if movie already has cached details
				if (um.movie.details_fetched_at) {
					// Use cached data from database
					enriched.set(um.movie_id, dbMovieToMovieWithDetails(um.movie, um));
					setEnrichedMovies(new Map(enriched));
				} else if (!enriched.has(um.movie_id)) {
					// Fetch and cache details via API
					try {
						const response = await fetch(`/api/movies/${um.movie_id}/details`);
						if (response.ok) {
							const { movie: updatedMovie } = await response.json();
							enriched.set(
								um.movie_id,
								dbMovieToMovieWithDetails(updatedMovie, um),
							);
							setEnrichedMovies(new Map(enriched));
						}
					} catch (error) {
						console.error('Error fetching movie details:', error);
					}
				}
			}
		},
		[],
	);

	useEffect(() => {
		if (!user) return;

		let cancelled = false;

		const fetchData = async () => {
			setLoading(true);

			// Fetch books and movies in parallel
			const [booksResult, moviesResult] = await Promise.all([
				supabase
					.from('user_books')
					.select(`
						*,
						book:books(*)
					`)
					.eq('user_id', user.id)
					.order('created_at', { ascending: false }),
				supabase
					.from('user_movies')
					.select(`
						*,
						movie:movies(*)
					`)
					.eq('user_id', user.id)
					.order('created_at', { ascending: false }),
			]);

			if (!cancelled) {
				if (!booksResult.error && booksResult.data) {
					setUserBooks(booksResult.data as UserBookWithDetails[]);
					// Enrich books in background (fetches and caches details)
					enrichBooks(booksResult.data as UserBookWithDetails[]);
				}
				if (!moviesResult.error && moviesResult.data) {
					setUserMovies(moviesResult.data as UserMovieWithDetails[]);
					// Enrich movies in background
					enrichMovies(moviesResult.data as UserMovieWithDetails[]);
				}
				setLoading(false);
			}
		};

		fetchData();

		return () => {
			cancelled = true;
		};
	}, [user, supabase, enrichBooks, enrichMovies]);

	// Update URL when selecting/deselecting a book
	const selectBook = useCallback(
		(book: BookWithDetails | null, userBookId: string | null) => {
			setSelectedBook(book);
			setSelectedUserBookId(userBookId);

			// Update URL without full page reload
			if (book) {
				router.push(`/dashboard?book=${book.id}`, { scroll: false });
			} else {
				router.push('/dashboard', { scroll: false });
			}
		},
		[router],
	);

	const handleRefreshBook = useCallback(
		async (bookId: string) => {
			try {
				const response = await fetch(`/api/books/${bookId}/details`, {
					method: 'POST',
				});
				if (response.ok) {
					const { book: updatedBook } = await response.json();
					const userBook = userBooks.find((ub) => ub.book_id === bookId);
					const bookWithDetails = dbBookToBookWithDetails(
						updatedBook,
						userBook,
					);

					setEnrichedBooks((prev) => {
						const next = new Map(prev);
						next.set(bookId, bookWithDetails);
						return next;
					});

					// Update selected book if it's the one being refreshed
					if (selectedBook?.id === bookId) {
						setSelectedBook(bookWithDetails);
					}

					return bookWithDetails;
				}
			} catch (error) {
				console.error('Error refreshing book details:', error);
			}
			return null;
		},
		[userBooks, selectedBook],
	);

	const reloadBooks = useCallback(async () => {
		if (!user) return;
		setLoading(true);
		const { data, error } = await supabase
			.from('user_books')
			.select(
				`
				*,
				book:books(*)
			`,
			)
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (!error && data) {
			setUserBooks(data as UserBookWithDetails[]);
			enrichBooks(data as UserBookWithDetails[]);
		}
		setLoading(false);
	}, [user, supabase, enrichBooks]);

	const reloadMovies = useCallback(async () => {
		if (!user) return;
		const { data, error } = await supabase
			.from('user_movies')
			.select(
				`
				*,
				movie:movies(*)
			`,
			)
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (!error && data) {
			setUserMovies(data as UserMovieWithDetails[]);
			enrichMovies(data as UserMovieWithDetails[]);
		}
	}, [user, supabase, enrichMovies]);

	const handleBookAdded = useCallback(() => {
		void reloadBooks();
		setShowAddModal(false);
		setShowCSVModal(false);
	}, [reloadBooks]);

	const handleMovieAdded = useCallback(() => {
		void reloadMovies();
		setShowAddMovieModal(false);
	}, [reloadMovies]);

	const handleRemoveBook = async (userBookId: string) => {
		const { error } = await supabase
			.from('user_books')
			.delete()
			.eq('id', userBookId);

		if (!error) {
			setUserBooks(userBooks.filter((ub) => ub.id !== userBookId));
			setSelectedBook(null);
		}
	};

	const handleRemoveMovie = async (userMovieId: string) => {
		const { error } = await supabase
			.from('user_movies')
			.delete()
			.eq('id', userMovieId);

		if (!error) {
			setUserMovies(userMovies.filter((um) => um.id !== userMovieId));
			setSelectedMovie(null);
		}
	};

	const handleRefreshMovie = useCallback(
		async (movieId: string) => {
			try {
				const response = await fetch(`/api/movies/${movieId}/details`, {
					method: 'POST',
				});
				if (response.ok) {
					const { movie: updatedMovie } = await response.json();
					const userMovie = userMovies.find((um) => um.movie_id === movieId);
					const movieWithDetails = dbMovieToMovieWithDetails(
						updatedMovie,
						userMovie,
					);

					setEnrichedMovies((prev) => {
						const next = new Map(prev);
						next.set(movieId, movieWithDetails);
						return next;
					});

					// Update selected movie if it's the one being refreshed
					if (selectedMovie?.id === movieId) {
						setSelectedMovie(movieWithDetails);
					}

					return movieWithDetails;
				}
			} catch (error) {
				console.error('Error refreshing movie details:', error);
			}
			return null;
		},
		[userMovies, selectedMovie],
	);

	const handleToggleWatched = useCallback(
		async (watched: boolean) => {
			if (!selectedUserMovieId) return;
			try {
				const response = await fetch(`/api/user-movies?id=${selectedUserMovieId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						watched,
						watched_at: watched ? new Date().toISOString() : null,
					}),
				});
				if (response.ok) {
					// Update local state
					setUserMovies((prev) =>
						prev.map((um) =>
							um.id === selectedUserMovieId ? { ...um, watched } : um
						)
					);
					if (selectedMovie) {
						setSelectedMovie({ ...selectedMovie, watched });
					}
				}
			} catch (error) {
				console.error('Error updating watched status:', error);
			}
		},
		[selectedUserMovieId, selectedMovie],
	);

	// Convert UserBook to BookWithDetails for display
	const getBookWithDetails = useCallback(
		(ub: UserBookWithDetails): BookWithDetails => {
			const enriched = enrichedBooks.get(ub.book_id);
			if (enriched) {
				return {
					...enriched,
					notes: ub.notes || undefined,
					priority: ub.priority || undefined,
				};
			}
			return {
				id: ub.book_id,
				title: ub.book.title,
				author: ub.book.author || undefined,
				genre: ub.book.genre || 'Uncategorized',
				pages: ub.book.page_count || undefined,
				notes: ub.notes || undefined,
				priority: ub.priority || undefined,
				description: ub.book.description || undefined,
				coverImage: ub.book.cover_image || undefined,
				ratings: [],
			};
		},
		[enrichedBooks],
	);

	// Convert UserMovie to MovieWithDetails for display
	const getMovieWithDetails = useCallback(
		(um: UserMovieWithDetails): MovieWithDetails => {
			const enriched = enrichedMovies.get(um.movie_id);
			if (enriched) {
				return {
					...enriched,
					notes: um.notes || undefined,
					priority: um.priority || undefined,
					watched: um.watched || false,
				};
			}
			return {
				id: um.movie_id,
				title: um.movie.title,
				director: um.movie.director || undefined,
				year: um.movie.year || undefined,
				genre: um.genre || (um.movie.genres?.[0]) || 'Uncategorized',
				runtime: um.movie.runtime_minutes || undefined,
				notes: um.notes || undefined,
				priority: um.priority || undefined,
				watched: um.watched || false,
				description: um.movie.description || undefined,
				posterImage: um.movie.poster_image || undefined,
				ratings: [],
			};
		},
		[enrichedMovies],
	);

	// Handle deep linking - open book from URL param
	useEffect(() => {
		const bookId = searchParams.get('book');
		if (bookId && userBooks.length > 0 && !loading) {
			const userBook = userBooks.find((ub) => ub.book_id === bookId);
			if (userBook) {
				setSelectedBook(getBookWithDetails(userBook));
				setSelectedUserBookId(userBook.id);
			}
		}
	}, [searchParams, userBooks, loading, getBookWithDetails]);

	// Filter books and movies by search query
	const filteredUserBooks = searchQuery
		? userBooks.filter((ub) => {
				const query = searchQuery.toLowerCase();
				return (
					ub.book.title.toLowerCase().includes(query) ||
					(ub.book.author?.toLowerCase().includes(query)) ||
					(ub.notes?.toLowerCase().includes(query))
				);
			})
		: userBooks;

	const filteredUserMovies = searchQuery
		? userMovies.filter((um) => {
				const query = searchQuery.toLowerCase();
				return (
					um.movie.title.toLowerCase().includes(query) ||
					(um.movie.director?.toLowerCase().includes(query)) ||
					(um.notes?.toLowerCase().includes(query)) ||
					(um.movie.cast_members?.some((c) => c.toLowerCase().includes(query)))
				);
			})
		: userMovies;

	// Group books by genre (genre is now on the book, not user_books)
	const booksByGenre = filteredUserBooks.reduce(
		(acc, ub) => {
			const genre = ub.book.genre || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(ub);
			return acc;
		},
		{} as Record<string, UserBookWithDetails[]>,
	);

	// Group movies by genre
	const moviesByGenre = filteredUserMovies.reduce(
		(acc, um) => {
			const genre = um.genre || (um.movie.genres?.[0]) || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(um);
			return acc;
		},
		{} as Record<string, UserMovieWithDetails[]>,
	);

	// Combined genres (union of book and movie genres)
	const allGenres = new Set([
		...Object.keys(booksByGenre),
		...Object.keys(moviesByGenre),
	]);

	const sortedGenres = Array.from(allGenres).sort((a, b) => {
		if (a === 'Uncategorized') return 1;
		if (b === 'Uncategorized') return -1;
		return a.localeCompare(b);
	});

	// Total item count
	const totalItems = userBooks.length + userMovies.length;

	return (
		<div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
			{/* Header */}
			<header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
				<div className="max-w-7xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-zinc-900">My Shelf</h1>
							<p className="text-sm text-zinc-500">
								{authLoading ? (
									'Loading...'
								) : (
									<>
										{userBooks.length} {userBooks.length === 1 ? 'book' : 'books'}
										{userMovies.length > 0 && (
											<>, {userMovies.length} {userMovies.length === 1 ? 'movie' : 'movies'}</>
										)}
										{profile?.username && (
											<span className="ml-2">
												&middot; Public at{' '}
												<Link
													href={`/u/${profile.username}`}
													className="text-amber-600 hover:underline"
												>
													/u/{profile.username}
												</Link>
											</span>
										)}
									</>
								)}
							</p>
						</div>
						<div className="flex items-center gap-3">
							<Link
								href="/browse"
								className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
							>
								Browse Library
							</Link>
							<Link
								href="/dashboard/settings"
								className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
							>
								Settings
							</Link>
							<button
								onClick={signOut}
								className="px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
							>
								Sign Out
							</button>
						</div>
					</div>
				</div>
			</header>

			{/* Actions Bar */}
			<div className="sticky top-[73px] z-20 bg-white/90 backdrop-blur-sm border-b border-zinc-100">
				<div className="max-w-7xl mx-auto px-4 py-3">
					<div className="flex items-center justify-between flex-wrap gap-3">
						<div className="flex gap-3">
							<button
								onClick={() => setShowAddModal(true)}
								className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
								Add Book
							</button>
							<button
								onClick={() => setShowAddMovieModal(true)}
								className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
									/>
								</svg>
								Add Movie
							</button>
							<button
								onClick={() => setShowCSVModal(true)}
								className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-lg transition-colors flex items-center gap-2"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
									/>
								</svg>
								Import CSV
							</button>
						</div>

						{/* Search Input */}
						{totalItems > 0 && (
							<div className="flex-1 max-w-xs min-w-[200px]">
								<div className="relative">
									<svg
										className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400"
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
										placeholder="Search your shelf..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="w-full pl-9 pr-4 py-1.5 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
									/>
									{searchQuery && (
										<button
											onClick={() => setSearchQuery('')}
											className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									)}
								</div>
							</div>
						)}

						{/* Media Type & Genre Filter & Collapse Controls */}
						{totalItems > 0 && (
							<div className="flex items-center gap-3">
								{/* Media Type Filter */}
								{userMovies.length > 0 && (
									<div className="flex items-center gap-2">
										<label htmlFor="media-type-filter" className="text-sm text-zinc-500">
											Type:
										</label>
										<select
											id="media-type-filter"
											value={mediaTypeFilter}
											onChange={(e) => setMediaTypeFilter(e.target.value as MediaTypeFilter)}
											className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
										>
											<option value="all">All ({totalItems})</option>
											<option value="books">Books ({userBooks.length})</option>
											<option value="movies">Movies ({userMovies.length})</option>
										</select>
									</div>
								)}

								{/* Genre Filter */}
								<div className="flex items-center gap-2">
									<label htmlFor="genre-filter" className="text-sm text-zinc-500">
										Genre:
									</label>
									<select
										id="genre-filter"
										value={selectedGenreFilter}
										onChange={(e) => setSelectedGenreFilter(e.target.value)}
										className="px-3 py-1.5 text-sm border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
									>
										<option value="all">All Genres</option>
										{sortedGenres.map((genre) => {
											const bookCount = booksByGenre[genre]?.length || 0;
											const movieCount = moviesByGenre[genre]?.length || 0;
											const total = bookCount + movieCount;
											return (
												<option key={genre} value={genre}>
													{genre} ({total})
												</option>
											);
										})}
									</select>
								</div>

								{/* Collapse/Expand All */}
								{selectedGenreFilter === 'all' && sortedGenres.length > 1 && (
									<div className="flex items-center gap-1 border-l border-zinc-200 pl-3">
										<button
											onClick={expandAllGenres}
											className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
											title="Expand all sections"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
											</svg>
										</button>
										<button
											onClick={collapseAllGenres}
											className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
											title="Collapse all sections"
										>
											<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
											</svg>
										</button>
									</div>
								)}
							</div>
						)}

						{/* Loading Progress & Pause Button */}
						{isEnriching && loadingProgress.total > 0 && (
							<div className="flex items-center gap-3">
								{rateLimitMessage && (
									<span className="text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
										{rateLimitMessage}
									</span>
								)}
								<div className="flex items-center gap-2 text-sm text-zinc-500">
									<div className="w-32 h-2 bg-zinc-200 rounded-full overflow-hidden">
										<div
											className={`h-full transition-all duration-300 ${
												isEnrichmentPaused ? 'bg-amber-400' : 'bg-amber-500'
											}`}
											style={{
												width: `${(loadingProgress.loaded / loadingProgress.total) * 100}%`,
											}}
										/>
									</div>
									<span>
										{loadingProgress.loaded}/{loadingProgress.total}
									</span>
								</div>
								<button
									onClick={() => setIsEnrichmentPaused(!isEnrichmentPaused)}
									className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
										isEnrichmentPaused
											? 'bg-green-100 text-green-700 hover:bg-green-200'
											: 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
									}`}
								>
									{isEnrichmentPaused ? (
										<>
											<svg
												className="w-4 h-4"
												fill="currentColor"
												viewBox="0 0 24 24"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
											Resume
										</>
									) : (
										<>
											<svg
												className="w-4 h-4"
												fill="currentColor"
												viewBox="0 0 24 24"
											>
												<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
											</svg>
											Pause
										</>
									)}
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Main Content */}
			<main className="max-w-7xl mx-auto px-4 py-8">
				{authLoading || loading ? (
					<div className="flex flex-col items-center justify-center py-20">
						<div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4" />
						<p className="text-zinc-500">
							{authLoading ? 'Checking authentication...' : 'Loading your bookshelf...'}
						</p>
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
							Your shelf is empty
						</h2>
						<p className="text-zinc-500 mb-6">
							Add books or movies to get started
						</p>
						<div className="flex justify-center gap-3">
							<button
								onClick={() => setShowAddModal(true)}
								className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
							>
								Add a Book
							</button>
							<button
								onClick={() => setShowAddMovieModal(true)}
								className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
							>
								Add a Movie
							</button>
						</div>
					</div>
				) : (
					(selectedGenreFilter === 'all' ? sortedGenres : [selectedGenreFilter])
						.filter((genre) => {
							// Filter genres based on media type
							const hasBooks = booksByGenre[genre]?.length > 0;
							const hasMovies = moviesByGenre[genre]?.length > 0;
							if (mediaTypeFilter === 'books') return hasBooks;
							if (mediaTypeFilter === 'movies') return hasMovies;
							return hasBooks || hasMovies;
						})
						.map((genre) => {
							const isCollapsed = collapsedGenres.has(genre) && selectedGenreFilter === 'all';
							const genreBooks = booksByGenre[genre] || [];
							const genreMovies = moviesByGenre[genre] || [];

							// Filter items based on media type
							const showBooks = mediaTypeFilter !== 'movies';
							const showMovies = mediaTypeFilter !== 'books';

							// Count for badge
							const itemCount =
								(showBooks ? genreBooks.length : 0) +
								(showMovies ? genreMovies.length : 0);

							return (
								<section key={genre} className="mb-8">
									<button
										onClick={() => selectedGenreFilter === 'all' && toggleGenreCollapsed(genre)}
										className={`w-full flex items-center gap-3 mb-4 pb-3 border-b-2 border-zinc-200 text-left group ${
											selectedGenreFilter === 'all' ? 'cursor-pointer hover:border-amber-300' : 'cursor-default'
										}`}
									>
										{selectedGenreFilter === 'all' && (
											<svg
												className={`w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition-transform ${
													isCollapsed ? '' : 'rotate-90'
												}`}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										)}
										<h2 className="text-xl font-bold text-zinc-800">{genre}</h2>
										<span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-600">
											{itemCount}
										</span>
									</button>
									{!isCollapsed && (
										<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
											{/* Render books */}
											{showBooks && genreBooks.map((ub) => (
												<BookCard
													key={`book-${ub.id}`}
													book={getBookWithDetails(ub)}
													onClick={() => {
														setSelectedMovie(null);
														setSelectedUserMovieId(null);
														selectBook(getBookWithDetails(ub), ub.id);
													}}
												/>
											))}
											{/* Render movies */}
											{showMovies && genreMovies.map((um) => (
												<MovieCard
													key={`movie-${um.id}`}
													movie={getMovieWithDetails(um)}
													onClick={() => {
														selectBook(null, null);
														setSelectedMovie(getMovieWithDetails(um));
														setSelectedUserMovieId(um.id);
													}}
												/>
											))}
										</div>
									)}
								</section>
							);
						})
				)}
			</main>

			{/* Modals */}
			{showAddModal && (
				<AddBookModal
					onClose={() => setShowAddModal(false)}
					onBookAdded={handleBookAdded}
				/>
			)}

			{showAddMovieModal && (
				<AddMovieModal
					onClose={() => setShowAddMovieModal(false)}
					onMovieAdded={handleMovieAdded}
				/>
			)}

			{showCSVModal && (
				<CSVUploadModal
					onClose={() => setShowCSVModal(false)}
					onImportComplete={handleBookAdded}
				/>
			)}

			{/* Book Details Sidebar */}
			<BookDetailsSidebar
				book={selectedBook}
				onClose={() => {
					selectBook(null, null);
				}}
				onRefresh={
					selectedBook ? () => handleRefreshBook(selectedBook.id) : undefined
				}
				onRemove={
					selectedUserBookId
						? async () => {
								await handleRemoveBook(selectedUserBookId);
								selectBook(null, null);
							}
						: undefined
				}
			/>

			{/* Movie Details Sidebar */}
			<MovieDetailsSidebar
				movie={selectedMovie}
				onClose={() => {
					setSelectedMovie(null);
					setSelectedUserMovieId(null);
				}}
				onRefresh={
					selectedMovie ? () => handleRefreshMovie(selectedMovie.id) : undefined
				}
				onRemove={
					selectedUserMovieId
						? async () => {
								await handleRemoveMovie(selectedUserMovieId);
								setSelectedMovie(null);
								setSelectedUserMovieId(null);
							}
						: undefined
				}
				onToggleWatched={handleToggleWatched}
			/>
		</div>
	);
}

// Main component with Suspense boundary for useSearchParams
export default function DashboardPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
					<div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
				</div>
			}
		>
			<DashboardPageInner />
		</Suspense>
	);
}
