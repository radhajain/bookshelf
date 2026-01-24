'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { createClient } from '@/app/lib/supabase/client';
import {
	UserBookWithDetails,
	DbBook,
	UserMovieWithDetails,
	DbMovie,
	UserPodcastWithDetails,
	DbPodcast,
	UserArticleWithDetails,
	DbArticle,
} from '@/app/lib/types/database';
import { BookWithDetails, RatingSource } from '@/app/lib/books';
import { MovieWithDetails, MovieRatingSource } from '@/app/lib/movies';
import { PodcastWithDetails, PodcastRatingSource } from '@/app/lib/podcasts';
import { ArticleWithDetails } from '@/app/lib/articles';
import { RateLimitError } from '@/app/lib/bookApi';
import BookCard from '@/app/components/BookCard';
import BookDetailsSidebar from '@/app/components/BookDetailsSidebar';
import MovieCard from '@/app/components/movies/MovieCard';
import MovieDetailsSidebar from '@/app/components/movies/MovieDetailsSidebar';
import PodcastCard from '@/app/components/PodcastCard';
import PodcastDetailsSidebar from '@/app/components/podcasts/PodcastDetailsSidebar';
import ArticleCard from '@/app/components/ArticleCard';
import { AddArticleModal, ArticleDetailsSidebar } from '@/app/components/articles';
import AddBookModal from '@/app/components/books/AddBookModal';
import AddMovieModal from '@/app/components/movies/AddMovieModal';
import AddPodcastModal from '@/app/components/podcasts/AddPodcastModal';
import CSVUploadModal from '@/app/components/books/CSVUploadModal';
import ChatSidebar from '@/app/components/ChatSidebar';
import TasteProfileModal from '@/app/components/TasteProfileModal';
import { SkeletonGrid } from '@/app/components/SkeletonCard';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

// Media type filter
type MediaTypeFilter = 'all' | 'books' | 'movies' | 'podcasts' | 'articles';

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
		read: userBook?.read || false,
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
		genre: userMovie?.genre || dbMovie.genres?.[0] || 'Uncategorized',
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

// Convert DB podcast to PodcastWithDetails format
function dbPodcastToPodcastWithDetails(
	dbPodcast: DbPodcast,
	userPodcast?: UserPodcastWithDetails,
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
		genre: userPodcast?.genre || dbPodcast.genres?.[0] || 'Uncategorized',
		notes: userPodcast?.notes || undefined,
		priority: userPodcast?.priority || undefined,
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

// Convert DB article to ArticleWithDetails format
function dbArticleToArticleWithDetails(
	dbArticle: DbArticle,
	userArticle?: UserArticleWithDetails,
): ArticleWithDetails {
	return {
		id: dbArticle.id,
		title: dbArticle.title,
		author: dbArticle.author || undefined,
		publication: dbArticle.publication || undefined,
		publicationDate: dbArticle.publication_date || undefined,
		articleUrl: dbArticle.article_url,
		genre: userArticle?.genre || dbArticle.section || 'Uncategorized',
		notes: userArticle?.notes || undefined,
		priority: userArticle?.priority || undefined,
		read: userArticle?.read || false,
		readAt: userArticle?.read_at || undefined,
		description: dbArticle.description || undefined,
		thumbnailImage: dbArticle.thumbnail_image || undefined,
		section: dbArticle.section || undefined,
		readingTimeMinutes: dbArticle.reading_time_minutes || undefined,
		wordCount: dbArticle.word_count || undefined,
		subjects: dbArticle.subjects || undefined,
		detailsFetchedAt: dbArticle.details_fetched_at || undefined,
	};
}

function DashboardPageInner() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { user, profile, signOut, loading: authLoading } = useAuth();

	// Redirect non-logged in users to /browse
	useEffect(() => {
		if (!authLoading && !user) {
			router.replace('/browse');
		}
	}, [authLoading, user, router]);

	const [userBooks, setUserBooks] = useState<UserBookWithDetails[]>([]);
	const [userMovies, setUserMovies] = useState<UserMovieWithDetails[]>([]);
	const [userPodcasts, setUserPodcasts] = useState<UserPodcastWithDetails[]>(
		[],
	);
	const [userArticles, setUserArticles] = useState<UserArticleWithDetails[]>(
		[],
	);
	const [enrichedBooks, setEnrichedBooks] = useState<
		Map<string, BookWithDetails>
	>(new Map());
	const [enrichedMovies, setEnrichedMovies] = useState<
		Map<string, MovieWithDetails>
	>(new Map());
	const [enrichedPodcasts, setEnrichedPodcasts] = useState<
		Map<string, PodcastWithDetails>
	>(new Map());
	const [enrichedArticles, setEnrichedArticles] = useState<
		Map<string, ArticleWithDetails>
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
	const [selectedPodcast, setSelectedPodcast] =
		useState<PodcastWithDetails | null>(null);
	const [selectedUserBookId, setSelectedUserBookId] = useState<string | null>(
		null,
	);
	const [selectedUserMovieId, setSelectedUserMovieId] = useState<string | null>(
		null,
	);
	const [selectedUserPodcastId, setSelectedUserPodcastId] = useState<
		string | null
	>(null);
	const [selectedArticle, setSelectedArticle] =
		useState<ArticleWithDetails | null>(null);
	const [selectedUserArticleId, setSelectedUserArticleId] = useState<
		string | null
	>(null);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showAddMovieModal, setShowAddMovieModal] = useState(false);
	const [showAddPodcastModal, setShowAddPodcastModal] = useState(false);
	const [showAddArticleModal, setShowAddArticleModal] = useState(false);
	const [showCSVModal, setShowCSVModal] = useState(false);
	const [showAddDropdown, setShowAddDropdown] = useState(false);
	const [showChat, setShowChat] = useState(false);
	const [showTasteProfile, setShowTasteProfile] = useState(false);
	const [showMobileMenu, setShowMobileMenu] = useState(false);
	const [isEnrichmentPaused, setIsEnrichmentPaused] = useState(false);
	const [isEnriching, setIsEnriching] = useState(false);
	const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
	const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');
	const [mediaTypeFilter, setMediaTypeFilter] =
		useState<MediaTypeFilter>('all');
	const [collapsedGenres, setCollapsedGenres] = useState<Set<string>>(
		new Set(),
	);
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

	const enrichBooks = useCallback(async (books: UserBookWithDetails[]) => {
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
						enriched.set(ub.book_id, dbBookToBookWithDetails(updatedBook, ub));
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
	}, []);

	const enrichMovies = useCallback(async (movies: UserMovieWithDetails[]) => {
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
	}, []);

	const enrichPodcasts = useCallback(
		async (podcasts: UserPodcastWithDetails[]) => {
			const enriched = new Map<string, PodcastWithDetails>();

			for (const up of podcasts) {
				// Check if podcast already has cached details
				if (up.podcast.details_fetched_at) {
					// Use cached data from database
					enriched.set(
						up.podcast_id,
						dbPodcastToPodcastWithDetails(up.podcast, up),
					);
					setEnrichedPodcasts(new Map(enriched));
				} else if (!enriched.has(up.podcast_id)) {
					// Fetch and cache details via API
					try {
						const response = await fetch(
							`/api/podcasts/${up.podcast_id}/details`,
						);
						if (response.ok) {
							const { podcast: updatedPodcast } = await response.json();
							enriched.set(
								up.podcast_id,
								dbPodcastToPodcastWithDetails(updatedPodcast, up),
							);
							setEnrichedPodcasts(new Map(enriched));
						}
					} catch (error) {
						console.error('Error fetching podcast details:', error);
					}
				}
			}
		},
		[],
	);

	const enrichArticles = useCallback(
		async (articles: UserArticleWithDetails[]) => {
			const enriched = new Map<string, ArticleWithDetails>();

			for (const ua of articles) {
				// Articles don't need external API enrichment like books/movies
				// Just convert the DB format to the app format
				enriched.set(
					ua.article_id,
					dbArticleToArticleWithDetails(ua.article, ua),
				);
				setEnrichedArticles(new Map(enriched));
			}
		},
		[],
	);

	useEffect(() => {
		if (!user) return;

		let cancelled = false;

		const fetchData = async () => {
			setLoading(true);

			// Fetch books, movies, podcasts, and articles in parallel
			const [booksResult, moviesResult, podcastsResult, articlesResult] = await Promise.all([
				supabase
					.from('user_books')
					.select(
						`
						*,
						book:books(*)
					`,
					)
					.eq('user_id', user.id)
					.order('created_at', { ascending: false }),
				supabase
					.from('user_movies')
					.select(
						`
						*,
						movie:movies(*)
					`,
					)
					.eq('user_id', user.id)
					.order('created_at', { ascending: false }),
				supabase
					.from('user_podcasts')
					.select(
						`
						*,
						podcast:podcasts(*)
					`,
					)
					.eq('user_id', user.id)
					.order('created_at', { ascending: false }),
				supabase
					.from('user_articles')
					.select(
						`
						*,
						article:articles(*)
					`,
					)
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
				if (!podcastsResult.error && podcastsResult.data) {
					setUserPodcasts(podcastsResult.data as UserPodcastWithDetails[]);
					// Enrich podcasts in background
					enrichPodcasts(podcastsResult.data as UserPodcastWithDetails[]);
				}
				if (!articlesResult.error && articlesResult.data) {
					setUserArticles(articlesResult.data as UserArticleWithDetails[]);
					// Enrich articles in background
					enrichArticles(articlesResult.data as UserArticleWithDetails[]);
				}
				setLoading(false);
			}
		};

		fetchData();

		return () => {
			cancelled = true;
		};
	}, [user, supabase, enrichBooks, enrichMovies, enrichPodcasts, enrichArticles]);

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

	// Update URL when selecting/deselecting a movie
	const selectMovie = useCallback(
		(movie: MovieWithDetails | null, userMovieId: string | null) => {
			setSelectedMovie(movie);
			setSelectedUserMovieId(userMovieId);

			// Update URL without full page reload
			if (movie) {
				router.push(`/dashboard?movie=${movie.id}`, { scroll: false });
			} else {
				router.push('/dashboard', { scroll: false });
			}
		},
		[router],
	);

	// Update URL when selecting/deselecting a podcast
	const selectPodcast = useCallback(
		(podcast: PodcastWithDetails | null, userPodcastId: string | null) => {
			setSelectedPodcast(podcast);
			setSelectedUserPodcastId(userPodcastId);

			// Update URL without full page reload
			if (podcast) {
				router.push(`/dashboard?podcast=${podcast.id}`, { scroll: false });
			} else {
				router.push('/dashboard', { scroll: false });
			}
		},
		[router],
	);

	// Update URL when selecting/deselecting an article
	const selectArticle = useCallback(
		(article: ArticleWithDetails | null, userArticleId: string | null) => {
			setSelectedArticle(article);
			setSelectedUserArticleId(userArticleId);

			// Update URL without full page reload
			if (article) {
				router.push(`/dashboard?article=${article.id}`, { scroll: false });
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

	const reloadPodcasts = useCallback(async () => {
		if (!user) return;
		const { data, error } = await supabase
			.from('user_podcasts')
			.select(
				`
				*,
				podcast:podcasts(*)
			`,
			)
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (!error && data) {
			setUserPodcasts(data as UserPodcastWithDetails[]);
			enrichPodcasts(data as UserPodcastWithDetails[]);
		}
	}, [user, supabase, enrichPodcasts]);

	const reloadArticles = useCallback(async () => {
		if (!user) return;
		const { data, error } = await supabase
			.from('user_articles')
			.select(
				`
				*,
				article:articles(*)
			`,
			)
			.eq('user_id', user.id)
			.order('created_at', { ascending: false });

		if (!error && data) {
			setUserArticles(data as UserArticleWithDetails[]);
			enrichArticles(data as UserArticleWithDetails[]);
		}
	}, [user, supabase, enrichArticles]);

	const handleBookAdded = useCallback(() => {
		void reloadBooks();
		setShowAddModal(false);
		setShowCSVModal(false);
	}, [reloadBooks]);

	const handleMovieAdded = useCallback(() => {
		void reloadMovies();
		setShowAddMovieModal(false);
	}, [reloadMovies]);

	const handlePodcastAdded = useCallback(() => {
		void reloadPodcasts();
		setShowAddPodcastModal(false);
	}, [reloadPodcasts]);

	const handleArticleAdded = useCallback(() => {
		void reloadArticles();
		setShowAddArticleModal(false);
	}, [reloadArticles]);

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

	const handleRemovePodcast = async (userPodcastId: string) => {
		const { error } = await supabase
			.from('user_podcasts')
			.delete()
			.eq('id', userPodcastId);

		if (!error) {
			setUserPodcasts(userPodcasts.filter((up) => up.id !== userPodcastId));
			setSelectedPodcast(null);
		}
	};

	const handleRemoveArticle = async (userArticleId: string) => {
		const { error } = await supabase
			.from('user_articles')
			.delete()
			.eq('id', userArticleId);

		if (!error) {
			setUserArticles(userArticles.filter((ua) => ua.id !== userArticleId));
			setSelectedArticle(null);
		}
	};

	const handleUpdateArticle = useCallback(
		async (updates: Partial<ArticleWithDetails>) => {
			if (!selectedUserArticleId) return;
			try {
				const response = await fetch(
					`/api/user-articles?id=${selectedUserArticleId}`,
					{
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							read: updates.read,
							read_at: updates.readAt,
							notes: updates.notes,
							priority: updates.priority,
							genre: updates.genre,
						}),
					},
				);
				if (response.ok) {
					// Update local state
					setUserArticles((prev) =>
						prev.map((ua) =>
							ua.id === selectedUserArticleId
								? { ...ua, read: updates.read ?? ua.read, read_at: updates.readAt ?? ua.read_at }
								: ua,
						),
					);
					if (selectedArticle) {
						setSelectedArticle({ ...selectedArticle, ...updates });
					}
				}
			} catch (error) {
				console.error('Error updating article:', error);
			}
		},
		[selectedUserArticleId, selectedArticle],
	);

	const handleRefreshPodcast = useCallback(
		async (podcastId: string) => {
			try {
				const response = await fetch(`/api/podcasts/${podcastId}/details`, {
					method: 'POST',
				});
				if (response.ok) {
					const { podcast: updatedPodcast } = await response.json();
					const userPodcast = userPodcasts.find(
						(up) => up.podcast_id === podcastId,
					);
					const podcastWithDetails = dbPodcastToPodcastWithDetails(
						updatedPodcast,
						userPodcast,
					);

					setEnrichedPodcasts((prev) => {
						const next = new Map(prev);
						next.set(podcastId, podcastWithDetails);
						return next;
					});

					// Update selected podcast if it's the one being refreshed
					if (selectedPodcast?.id === podcastId) {
						setSelectedPodcast(podcastWithDetails);
					}

					return podcastWithDetails;
				}
			} catch (error) {
				console.error('Error refreshing podcast details:', error);
			}
			return null;
		},
		[userPodcasts, selectedPodcast],
	);

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
				const response = await fetch(
					`/api/user-movies?id=${selectedUserMovieId}`,
					{
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							watched,
							watched_at: watched ? new Date().toISOString() : null,
						}),
					},
				);
				if (response.ok) {
					// Update local state
					setUserMovies((prev) =>
						prev.map((um) =>
							um.id === selectedUserMovieId ? { ...um, watched } : um,
						),
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

	const handleToggleRead = useCallback(
		async (read: boolean) => {
			if (!selectedUserBookId) return;
			try {
				const response = await fetch(
					`/api/user-books?id=${selectedUserBookId}`,
					{
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							read,
							read_at: read ? new Date().toISOString() : null,
						}),
					},
				);
				if (response.ok) {
					// Update local state
					setUserBooks((prev) =>
						prev.map((ub) =>
							ub.id === selectedUserBookId ? { ...ub, read } : ub,
						),
					);
					if (selectedBook) {
						setSelectedBook({ ...selectedBook, read });
					}
				}
			} catch (error) {
				console.error('Error updating read status:', error);
			}
		},
		[selectedUserBookId, selectedBook],
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
				genre: um.genre || um.movie.genres?.[0] || 'Uncategorized',
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

	// Convert UserPodcast to PodcastWithDetails for display
	const getPodcastWithDetails = useCallback(
		(up: UserPodcastWithDetails): PodcastWithDetails => {
			const enriched = enrichedPodcasts.get(up.podcast_id);
			if (enriched) {
				return {
					...enriched,
					notes: up.notes || undefined,
					priority: up.priority || undefined,
				};
			}
			return {
				id: up.podcast_id,
				title: up.podcast.title,
				creator: up.podcast.creator || undefined,
				genre: up.genre || up.podcast.genres?.[0] || 'Uncategorized',
				notes: up.notes || undefined,
				priority: up.priority || undefined,
				description: up.podcast.description || undefined,
				coverImage: up.podcast.cover_image || undefined,
				totalEpisodes: up.podcast.total_episodes || undefined,
				ratings: [],
			};
		},
		[enrichedPodcasts],
	);

	// Convert UserArticle to ArticleWithDetails for display
	const getArticleWithDetails = useCallback(
		(ua: UserArticleWithDetails): ArticleWithDetails => {
			const enriched = enrichedArticles.get(ua.article_id);
			if (enriched) {
				return {
					...enriched,
					notes: ua.notes || undefined,
					priority: ua.priority || undefined,
					read: ua.read || false,
					readAt: ua.read_at || undefined,
				};
			}
			return {
				id: ua.article_id,
				title: ua.article.title,
				author: ua.article.author || undefined,
				publication: ua.article.publication || undefined,
				publicationDate: ua.article.publication_date || undefined,
				articleUrl: ua.article.article_url,
				genre: ua.genre || ua.article.section || 'Uncategorized',
				notes: ua.notes || undefined,
				priority: ua.priority || undefined,
				read: ua.read || false,
				readAt: ua.read_at || undefined,
				description: ua.article.description || undefined,
				thumbnailImage: ua.article.thumbnail_image || undefined,
				section: ua.article.section || undefined,
				readingTimeMinutes: ua.article.reading_time_minutes || undefined,
				wordCount: ua.article.word_count || undefined,
				subjects: ua.article.subjects || undefined,
			};
		},
		[enrichedArticles],
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

	// Handle deep linking - open movie from URL param
	useEffect(() => {
		const movieId = searchParams.get('movie');
		if (movieId && userMovies.length > 0 && !loading) {
			const userMovie = userMovies.find((um) => um.movie_id === movieId);
			if (userMovie) {
				setSelectedMovie(getMovieWithDetails(userMovie));
				setSelectedUserMovieId(userMovie.id);
			}
		}
	}, [searchParams, userMovies, loading, getMovieWithDetails]);

	// Handle deep linking - open podcast from URL param
	useEffect(() => {
		const podcastId = searchParams.get('podcast');
		if (podcastId && userPodcasts.length > 0 && !loading) {
			const userPodcast = userPodcasts.find(
				(up) => up.podcast_id === podcastId,
			);
			if (userPodcast) {
				setSelectedPodcast(getPodcastWithDetails(userPodcast));
				setSelectedUserPodcastId(userPodcast.id);
			}
		}
	}, [searchParams, userPodcasts, loading, getPodcastWithDetails]);

	// Handle deep linking - open article from URL param
	useEffect(() => {
		const articleId = searchParams.get('article');
		if (articleId && userArticles.length > 0 && !loading) {
			const userArticle = userArticles.find(
				(ua) => ua.article_id === articleId,
			);
			if (userArticle) {
				setSelectedArticle(getArticleWithDetails(userArticle));
				setSelectedUserArticleId(userArticle.id);
			}
		}
	}, [searchParams, userArticles, loading, getArticleWithDetails]);

	// Filter books and movies by search query
	const filteredUserBooks = searchQuery
		? userBooks.filter((ub) => {
				const query = searchQuery.toLowerCase();
				return (
					ub.book.title.toLowerCase().includes(query) ||
					ub.book.author?.toLowerCase().includes(query) ||
					ub.notes?.toLowerCase().includes(query)
				);
			})
		: userBooks;

	const filteredUserMovies = searchQuery
		? userMovies.filter((um) => {
				const query = searchQuery.toLowerCase();
				return (
					um.movie.title.toLowerCase().includes(query) ||
					um.movie.director?.toLowerCase().includes(query) ||
					um.notes?.toLowerCase().includes(query) ||
					um.movie.cast_members?.some((c) => c.toLowerCase().includes(query))
				);
			})
		: userMovies;

	const filteredUserPodcasts = searchQuery
		? userPodcasts.filter((up) => {
				const query = searchQuery.toLowerCase();
				return (
					up.podcast.title.toLowerCase().includes(query) ||
					up.podcast.creator?.toLowerCase().includes(query) ||
					up.notes?.toLowerCase().includes(query)
				);
			})
		: userPodcasts;

	const filteredUserArticles = searchQuery
		? userArticles.filter((ua) => {
				const query = searchQuery.toLowerCase();
				return (
					ua.article.title.toLowerCase().includes(query) ||
					ua.article.author?.toLowerCase().includes(query) ||
					ua.article.publication?.toLowerCase().includes(query) ||
					ua.notes?.toLowerCase().includes(query)
				);
			})
		: userArticles;

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
			const genre = um.genre || um.movie.genres?.[0] || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(um);
			return acc;
		},
		{} as Record<string, UserMovieWithDetails[]>,
	);

	// Group podcasts by genre
	const podcastsByGenre = filteredUserPodcasts.reduce(
		(acc, up) => {
			const genre = up.genre || up.podcast.genres?.[0] || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(up);
			return acc;
		},
		{} as Record<string, UserPodcastWithDetails[]>,
	);

	// Group articles by genre
	const articlesByGenre = filteredUserArticles.reduce(
		(acc, ua) => {
			const genre = ua.genre || ua.article.section || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(ua);
			return acc;
		},
		{} as Record<string, UserArticleWithDetails[]>,
	);

	// Combined genres (union of book, movie, podcast, and article genres)
	const allGenres = new Set([
		...Object.keys(booksByGenre),
		...Object.keys(moviesByGenre),
		...Object.keys(podcastsByGenre),
		...Object.keys(articlesByGenre),
	]);

	const sortedGenres = Array.from(allGenres).sort((a, b) => {
		if (a === 'Uncategorized') return 1;
		if (b === 'Uncategorized') return -1;
		return a.localeCompare(b);
	});

	// Total item count
	const totalItems = userBooks.length + userMovies.length + userPodcasts.length + userArticles.length;

	return (
		<div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
			{/* Header */}
			<header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
				<div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
					<div className="flex items-center justify-between">
						<div className="min-w-0 flex-1">
							<h1 className="text-xl sm:text-2xl font-bold text-zinc-900">My Shelf</h1>
							<p className="text-xs sm:text-sm text-zinc-500 truncate">
								{authLoading ? (
									'Loading...'
								) : (
									<>
										{userBooks.length}{' '}
										{userBooks.length === 1 ? 'book' : 'books'}
										{userMovies.length > 0 && (
											<>
												, {userMovies.length}{' '}
												{userMovies.length === 1 ? 'movie' : 'movies'}
											</>
										)}
										{userPodcasts.length > 0 && (
											<>
												, {userPodcasts.length}{' '}
												{userPodcasts.length === 1 ? 'podcast' : 'podcasts'}
											</>
										)}
										{userArticles.length > 0 && (
											<>
												, {userArticles.length}{' '}
												{userArticles.length === 1 ? 'article' : 'articles'}
											</>
										)}
										{profile?.username && (
											<span className="hidden sm:inline ml-2">
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

						{/* Desktop Navigation */}
						<div className="hidden md:flex items-center gap-2 lg:gap-3">
							<button
								onClick={() => setShowTasteProfile(true)}
								className="px-2 lg:px-3 py-2 text-sm text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
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
										d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									/>
								</svg>
								<span className="hidden lg:inline">Taste Profile</span>
							</button>
							<button
								onClick={() => setShowChat(true)}
								className="px-2 lg:px-3 py-2 text-sm text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1.5 font-medium"
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
										d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
									/>
								</svg>
								<span className="hidden lg:inline">Librarian</span>
							</button>
							<Link
								href="/browse"
								className="px-2 lg:px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
							>
								<span className="hidden lg:inline">Browse Library</span>
								<span className="lg:hidden">Browse</span>
							</Link>
							<Link
								href="/dashboard/settings"
								className="px-2 lg:px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
							>
								Profile
							</Link>
							<button
								onClick={signOut}
								className="px-2 lg:px-3 py-2 text-sm text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
							>
								Sign Out
							</button>
						</div>

						{/* Mobile Menu Button */}
						<div className="flex md:hidden items-center gap-2">
							<button
								onClick={() => setShowChat(true)}
								className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
								aria-label="Open chat"
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
										d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
									/>
								</svg>
							</button>
							<button
								onClick={() => setShowMobileMenu(!showMobileMenu)}
								className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
								aria-label="Toggle menu"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									{showMobileMenu ? (
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									) : (
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M4 6h16M4 12h16M4 18h16"
										/>
									)}
								</svg>
							</button>
						</div>
					</div>

					{/* Mobile Menu Dropdown */}
					{showMobileMenu && (
						<div className="md:hidden mt-3 pt-3 border-t border-zinc-200 space-y-1">
							<button
								onClick={() => {
									setShowTasteProfile(true);
									setShowMobileMenu(false);
								}}
								className="w-full px-3 py-2.5 text-left text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-2 font-medium"
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
										d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
									/>
								</svg>
								Taste Profile
							</button>
							<Link
								href="/browse"
								onClick={() => setShowMobileMenu(false)}
								className="block px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
							>
								Browse Library
							</Link>
							<Link
								href="/dashboard/settings"
								onClick={() => setShowMobileMenu(false)}
								className="block px-3 py-2.5 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
							>
								Profile Settings
							</Link>
							{profile?.username && (
								<Link
									href={`/u/${profile.username}`}
									onClick={() => setShowMobileMenu(false)}
									className="block px-3 py-2.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
								>
									View Public Profile
								</Link>
							)}
							<button
								onClick={() => {
									signOut();
									setShowMobileMenu(false);
								}}
								className="w-full px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
							>
								Sign Out
							</button>
						</div>
					)}
				</div>
			</header>

			{/* Actions Bar */}
			<div className="sticky top-[57px] sm:top-[65px] md:top-[73px] z-20 bg-white/90 backdrop-blur-sm border-b border-zinc-100">
				<div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
					<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
						{/* First row on mobile: Add button + Search */}
						<div className="flex items-center gap-2 sm:gap-3">
							{/* Add Dropdown */}
							<div className="relative">
								<button
									onClick={() => setShowAddDropdown(!showAddDropdown)}
									className="px-3 sm:px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
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
											d="M12 4v16m8-8H4"
										/>
									</svg>
									Add
									<svg
										className={`w-4 h-4 transition-transform ${showAddDropdown ? 'rotate-180' : ''}`}
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M19 9l-7 7-7-7"
										/>
									</svg>
								</button>

								{showAddDropdown && (
									<>
										{/* Backdrop to close dropdown */}
										<div
											className="fixed inset-0 z-10"
											onClick={() => setShowAddDropdown(false)}
										/>
										<div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-zinc-200 z-20 overflow-hidden">
											<button
												onClick={() => {
													setShowAddModal(true);
													setShowAddDropdown(false);
												}}
												className="w-full px-4 py-3 text-left hover:bg-amber-50 flex items-center gap-3 transition-colors"
											>
												<svg
													className="w-5 h-5 text-amber-500"
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
												<span className="font-medium text-zinc-700">Book</span>
											</button>
											<button
												onClick={() => {
													setShowAddMovieModal(true);
													setShowAddDropdown(false);
												}}
												className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center gap-3 transition-colors"
											>
												<svg
													className="w-5 h-5 text-blue-500"
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
												<span className="font-medium text-zinc-700">Movie</span>
											</button>
											<button
												onClick={() => {
													setShowAddPodcastModal(true);
													setShowAddDropdown(false);
												}}
												className="w-full px-4 py-3 text-left hover:bg-purple-50 flex items-center gap-3 transition-colors"
											>
												<svg
													className="w-5 h-5 text-purple-500"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
													/>
												</svg>
												<span className="font-medium text-zinc-700">
													Podcast
												</span>
											</button>
											<button
												onClick={() => {
													setShowAddArticleModal(true);
													setShowAddDropdown(false);
												}}
												className="w-full px-4 py-3 text-left hover:bg-teal-50 flex items-center gap-3 transition-colors"
											>
												<svg
													className="w-5 h-5 text-teal-500"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
													/>
												</svg>
												<span className="font-medium text-zinc-700">
													Article
												</span>
											</button>
											<div className="border-t border-zinc-100">
												<button
													onClick={() => {
														setShowCSVModal(true);
														setShowAddDropdown(false);
													}}
													className="w-full px-4 py-3 text-left hover:bg-zinc-50 flex items-center gap-3 transition-colors"
												>
													<svg
														className="w-5 h-5 text-zinc-500"
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
													<span className="font-medium text-zinc-700">
														Import CSV
													</span>
												</button>
											</div>
										</div>
									</>
								)}
							</div>

							{/* Search Input - grows to fill space on larger screens */}
							{totalItems > 0 && (
								<div className="flex-1 min-w-0 sm:max-w-xs">
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
											placeholder="Search..."
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
											className="w-full pl-9 pr-8 py-1.5 text-sm border border-zinc-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
										/>
										{searchQuery && (
											<button
												onClick={() => setSearchQuery('')}
												className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600"
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
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Second row on mobile: Filters */}
						{totalItems > 0 && (
							<div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-hide">
								{/* Media Type Filter */}
								{(userMovies.length > 0 || userPodcasts.length > 0 || userArticles.length > 0) && (
									<div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
										<label
											htmlFor="media-type-filter"
											className="text-xs sm:text-sm text-zinc-500 hidden sm:inline"
										>
											Type:
										</label>
										<select
											id="media-type-filter"
											value={mediaTypeFilter}
											onChange={(e) =>
												setMediaTypeFilter(e.target.value as MediaTypeFilter)
											}
											className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
										>
											<option value="all">All ({totalItems})</option>
											<option value="books">Books ({userBooks.length})</option>
											<option value="movies">
												Movies ({userMovies.length})
											</option>
											<option value="podcasts">
												Podcasts ({userPodcasts.length})
											</option>
											<option value="articles">
												Articles ({userArticles.length})
											</option>
										</select>
									</div>
								)}

								{/* Genre Filter */}
								<div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
									<label
										htmlFor="genre-filter"
										className="text-xs sm:text-sm text-zinc-500 hidden sm:inline"
									>
										Genre:
									</label>
									<select
										id="genre-filter"
										value={selectedGenreFilter}
										onChange={(e) => setSelectedGenreFilter(e.target.value)}
										className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm border border-zinc-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 max-w-[140px] sm:max-w-none"
									>
										<option value="all">All Genres</option>
										{sortedGenres.map((genre) => {
											const bookCount = booksByGenre[genre]?.length || 0;
											const movieCount = moviesByGenre[genre]?.length || 0;
											const podcastCount = podcastsByGenre[genre]?.length || 0;
											const articleCount = articlesByGenre[genre]?.length || 0;
											const total = bookCount + movieCount + podcastCount + articleCount;
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
									<div className="hidden sm:flex items-center gap-1 border-l border-zinc-200 pl-2 sm:pl-3 flex-shrink-0">
										<button
											onClick={expandAllGenres}
											className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
											title="Expand all sections"
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
													d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
												/>
											</svg>
										</button>
										<button
											onClick={collapseAllGenres}
											className="p-1.5 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
											title="Collapse all sections"
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
													d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
												/>
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
			<main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
				{authLoading || loading ? (
					<SkeletonGrid count={8} />
				) : totalItems === 0 ? (
					<div className="text-center py-12 sm:py-20">
						<svg
							className="w-12 h-12 sm:w-16 sm:h-16 text-zinc-300 mx-auto mb-3 sm:mb-4"
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
						<h2 className="text-lg sm:text-xl font-semibold text-zinc-700 mb-2">
							Your shelf is empty
						</h2>
						<p className="text-sm sm:text-base text-zinc-500 mb-4 sm:mb-6 px-4">
							Add books, movies, or podcasts to get started
						</p>
						<div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-3 px-4">
							<button
								onClick={() => setShowAddModal(true)}
								className="px-4 py-2.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
							>
								Add a Book
							</button>
							<button
								onClick={() => setShowAddMovieModal(true)}
								className="px-4 py-2.5 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
							>
								Add a Movie
							</button>
							<button
								onClick={() => setShowAddPodcastModal(true)}
								className="px-4 py-2.5 sm:py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
							>
								Add a Podcast
							</button>
							<button
								onClick={() => setShowAddArticleModal(true)}
								className="px-4 py-2.5 sm:py-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition-colors"
							>
								Add an Article
							</button>
						</div>
					</div>
				) : (
					(selectedGenreFilter === 'all' ? sortedGenres : [selectedGenreFilter])
						.filter((genre) => {
							// Filter genres based on media type
							const hasBooks = booksByGenre[genre]?.length > 0;
							const hasMovies = moviesByGenre[genre]?.length > 0;
							const hasPodcasts = podcastsByGenre[genre]?.length > 0;
							const hasArticles = articlesByGenre[genre]?.length > 0;
							if (mediaTypeFilter === 'books') return hasBooks;
							if (mediaTypeFilter === 'movies') return hasMovies;
							if (mediaTypeFilter === 'podcasts') return hasPodcasts;
							if (mediaTypeFilter === 'articles') return hasArticles;
							return hasBooks || hasMovies || hasPodcasts || hasArticles;
						})
						.map((genre) => {
							const isCollapsed =
								collapsedGenres.has(genre) && selectedGenreFilter === 'all';
							const genreBooks = booksByGenre[genre] || [];
							const genreMovies = moviesByGenre[genre] || [];
							const genrePodcasts = podcastsByGenre[genre] || [];
							const genreArticles = articlesByGenre[genre] || [];

							// Filter items based on media type
							const showBooks =
								mediaTypeFilter === 'all' || mediaTypeFilter === 'books';
							const showMovies =
								mediaTypeFilter === 'all' || mediaTypeFilter === 'movies';
							const showPodcasts =
								mediaTypeFilter === 'all' || mediaTypeFilter === 'podcasts';
							const showArticles =
								mediaTypeFilter === 'all' || mediaTypeFilter === 'articles';

							// Count for badge
							const itemCount =
								(showBooks ? genreBooks.length : 0) +
								(showMovies ? genreMovies.length : 0) +
								(showPodcasts ? genrePodcasts.length : 0) +
								(showArticles ? genreArticles.length : 0);

							return (
								<section key={genre} className="mb-6 sm:mb-8">
									<button
										onClick={() =>
											selectedGenreFilter === 'all' &&
											toggleGenreCollapsed(genre)
										}
										className={`w-full flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 pb-2 sm:pb-3 border-b-2 border-zinc-200 text-left group ${
											selectedGenreFilter === 'all'
												? 'cursor-pointer hover:border-amber-300'
												: 'cursor-default'
										}`}
									>
										{selectedGenreFilter === 'all' && (
											<svg
												className={`w-4 h-4 sm:w-5 sm:h-5 text-zinc-400 group-hover:text-zinc-600 transition-transform ${
													isCollapsed ? '' : 'rotate-90'
												}`}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M9 5l7 7-7 7"
												/>
											</svg>
										)}
										<h2 className="text-base sm:text-lg lg:text-xl font-bold text-zinc-800">{genre}</h2>
										<span className="px-2 sm:px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-medium bg-zinc-100 text-zinc-600">
											{itemCount}
										</span>
									</button>
									{!isCollapsed && (
										<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
											{/* Render books */}
											{showBooks &&
												genreBooks.map((ub) => (
													<BookCard
														key={`book-${ub.id}`}
														book={getBookWithDetails(ub)}
														onClick={() => {
															setSelectedMovie(null);
															setSelectedUserMovieId(null);
															setSelectedPodcast(null);
															setSelectedUserPodcastId(null);
															setSelectedArticle(null);
															setSelectedUserArticleId(null);
															selectBook(getBookWithDetails(ub), ub.id);
														}}
													/>
												))}
											{/* Render movies */}
											{showMovies &&
												genreMovies.map((um) => (
													<MovieCard
														key={`movie-${um.id}`}
														movie={getMovieWithDetails(um)}
														onClick={() => {
															setSelectedBook(null);
															setSelectedUserBookId(null);
															setSelectedPodcast(null);
															setSelectedUserPodcastId(null);
															setSelectedArticle(null);
															setSelectedUserArticleId(null);
															selectMovie(getMovieWithDetails(um), um.id);
														}}
													/>
												))}
											{/* Render podcasts */}
											{showPodcasts &&
												genrePodcasts.map((up) => (
													<PodcastCard
														key={`podcast-${up.id}`}
														podcast={getPodcastWithDetails(up)}
														onClick={() => {
															setSelectedBook(null);
															setSelectedUserBookId(null);
															setSelectedMovie(null);
															setSelectedUserMovieId(null);
															setSelectedArticle(null);
															setSelectedUserArticleId(null);
															selectPodcast(getPodcastWithDetails(up), up.id);
														}}
													/>
												))}
											{/* Render articles */}
											{showArticles &&
												genreArticles.map((ua) => (
													<ArticleCard
														key={`article-${ua.id}`}
														article={getArticleWithDetails(ua)}
														onClick={() => {
															setSelectedBook(null);
															setSelectedUserBookId(null);
															setSelectedMovie(null);
															setSelectedUserMovieId(null);
															setSelectedPodcast(null);
															setSelectedUserPodcastId(null);
															selectArticle(getArticleWithDetails(ua), ua.id);
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

			{showAddPodcastModal && (
				<AddPodcastModal
					onClose={() => setShowAddPodcastModal(false)}
					onPodcastAdded={handlePodcastAdded}
				/>
			)}

			{showAddArticleModal && (
				<AddArticleModal
					onClose={() => setShowAddArticleModal(false)}
					onArticleAdded={handleArticleAdded}
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
				onToggleRead={selectedUserBookId ? handleToggleRead : undefined}
			/>

			{/* Movie Details Sidebar */}
			<MovieDetailsSidebar
				movie={selectedMovie}
				onClose={() => {
					selectMovie(null, null);
				}}
				onRefresh={
					selectedMovie ? () => handleRefreshMovie(selectedMovie.id) : undefined
				}
				onRemove={
					selectedUserMovieId
						? async () => {
								await handleRemoveMovie(selectedUserMovieId);
								selectMovie(null, null);
							}
						: undefined
				}
				onToggleWatched={handleToggleWatched}
			/>

			{/* Podcast Details Sidebar */}
			<PodcastDetailsSidebar
				podcast={selectedPodcast}
				onClose={() => {
					selectPodcast(null, null);
				}}
				onRefresh={
					selectedPodcast
						? () => handleRefreshPodcast(selectedPodcast.id)
						: undefined
				}
				onRemove={
					selectedUserPodcastId
						? async () => {
								await handleRemovePodcast(selectedUserPodcastId);
								selectPodcast(null, null);
							}
						: undefined
				}
			/>

			{/* Article Details Sidebar */}
			<ArticleDetailsSidebar
				article={selectedArticle}
				onClose={() => {
					selectArticle(null, null);
				}}
				onRemove={
					selectedUserArticleId
						? async () => {
								await handleRemoveArticle(selectedUserArticleId);
								selectArticle(null, null);
							}
						: undefined
				}
				onUpdate={handleUpdateArticle}
			/>

			{/* Chat Sidebar */}
			<ChatSidebar isOpen={showChat} onClose={() => setShowChat(false)} />

			{/* Taste Profile Modal */}
			<TasteProfileModal
				isOpen={showTasteProfile}
				onClose={() => setShowTasteProfile(false)}
			/>
		</div>
	);
}

// Main component with Suspense boundary for useSearchParams
export default function DashboardPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
					{/* Header skeleton */}
					<header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
						<div className="max-w-7xl mx-auto px-4 py-4">
							<div className="flex items-center justify-between">
								<div>
									<div className="h-7 w-32 bg-zinc-200 rounded animate-pulse mb-2" />
									<div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" />
								</div>
								<div className="flex items-center gap-3">
									<div className="h-9 w-24 bg-zinc-100 rounded-lg animate-pulse" />
									<div className="h-9 w-24 bg-zinc-100 rounded-lg animate-pulse" />
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
			<DashboardPageInner />
		</Suspense>
	);
}
