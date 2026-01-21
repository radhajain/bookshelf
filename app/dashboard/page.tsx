'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/app/components/auth/AuthProvider';
import { createClient } from '@/app/lib/supabase/client';
import { UserBookWithDetails, DbBook } from '@/app/lib/types/database';
import { BookWithDetails, RatingSource } from '@/app/lib/books';
import { RateLimitError } from '@/app/lib/bookApi';
import BookCard from '@/app/components/BookCard';
import BookDetailsSidebar from '@/app/components/BookDetailsSidebar';
import AddBookModal from '@/app/components/books/AddBookModal';
import CSVUploadModal from '@/app/components/books/CSVUploadModal';
import Link from 'next/link';

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
		genre: userBook?.genre || 'Uncategorized',
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
	};
}

export default function DashboardPage() {
	const { user, profile, signOut, loading: authLoading } = useAuth();
	const [userBooks, setUserBooks] = useState<UserBookWithDetails[]>([]);
	const [enrichedBooks, setEnrichedBooks] = useState<
		Map<string, BookWithDetails>
	>(new Map());
	const [loading, setLoading] = useState(true);
	const [loadingProgress, setLoadingProgress] = useState({
		loaded: 0,
		total: 0,
	});
	const [selectedBook, setSelectedBook] = useState<BookWithDetails | null>(
		null,
	);
	const [selectedUserBookId, setSelectedUserBookId] = useState<string | null>(
		null,
	);
	const [showAddModal, setShowAddModal] = useState(false);
	const [showCSVModal, setShowCSVModal] = useState(false);
	const [isEnrichmentPaused, setIsEnrichmentPaused] = useState(false);
	const [isEnriching, setIsEnriching] = useState(false);
	const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
	const enrichmentPausedRef = useRef(false);
	const supabase = createClient();

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

	useEffect(() => {
		if (!user) return;

		let cancelled = false;

		const fetchBooks = async () => {
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

			if (!cancelled && !error && data) {
				setUserBooks(data as UserBookWithDetails[]);
				// Enrich books in background (fetches and caches details)
				enrichBooks(data as UserBookWithDetails[]);
			}
			if (!cancelled) {
				setLoading(false);
			}
		};

		fetchBooks();

		return () => {
			cancelled = true;
		};
	}, [user, supabase, enrichBooks]);

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

	const handleBookAdded = useCallback(() => {
		void reloadBooks();
		setShowAddModal(false);
		setShowCSVModal(false);
	}, [reloadBooks]);

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

	// Convert UserBook to BookWithDetails for display
	const getBookWithDetails = (ub: UserBookWithDetails): BookWithDetails => {
		const enriched = enrichedBooks.get(ub.book_id);
		if (enriched) {
			return {
				...enriched,
				genre: ub.genre,
				notes: ub.notes || undefined,
				priority: ub.priority || undefined,
			};
		}
		return {
			id: ub.book_id,
			title: ub.book.title,
			author: ub.book.author || undefined,
			genre: ub.genre,
			pages: ub.book.page_count || undefined,
			notes: ub.notes || undefined,
			priority: ub.priority || undefined,
			description: ub.book.description || undefined,
			coverImage: ub.book.cover_image || undefined,
			ratings: [],
		};
	};

	// Group books by genre
	const booksByGenre = userBooks.reduce(
		(acc, ub) => {
			const genre = ub.genre || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(ub);
			return acc;
		},
		{} as Record<string, UserBookWithDetails[]>,
	);

	const sortedGenres = Object.keys(booksByGenre).sort((a, b) => {
		if (a === 'Uncategorized') return 1;
		if (b === 'Uncategorized') return -1;
		return a.localeCompare(b);
	});

	return (
		<div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
			{/* Header */}
			<header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
				<div className="max-w-7xl mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div>
							<h1 className="text-2xl font-bold text-zinc-900">My Bookshelf</h1>
							<p className="text-sm text-zinc-500">
								{authLoading ? (
									'Loading...'
								) : (
									<>
										{userBooks.length} {userBooks.length === 1 ? 'book' : 'books'}
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
					<div className="flex items-center justify-between">
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
										d="M12 4v16m8-8H4"
									/>
								</svg>
								Add Book
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
				) : userBooks.length === 0 ? (
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
							Your bookshelf is empty
						</h2>
						<p className="text-zinc-500 mb-6">
							Add books manually or import from a CSV file
						</p>
						<div className="flex justify-center gap-3">
							<button
								onClick={() => setShowAddModal(true)}
								className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors"
							>
								Add Your First Book
							</button>
							<button
								onClick={() => setShowCSVModal(true)}
								className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-lg transition-colors"
							>
								Import CSV
							</button>
						</div>
					</div>
				) : (
					sortedGenres.map((genre) => (
						<section key={genre} className="mb-12">
							<div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-zinc-200">
								<h2 className="text-xl font-bold text-zinc-800">{genre}</h2>
								<span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-600">
									{booksByGenre[genre].length}
								</span>
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
								{booksByGenre[genre].map((ub) => (
									<BookCard
										key={ub.id}
										book={getBookWithDetails(ub)}
										onClick={() => {
											setSelectedBook(getBookWithDetails(ub));
											setSelectedUserBookId(ub.id);
										}}
									/>
								))}
							</div>
						</section>
					))
				)}
			</main>

			{/* Modals */}
			{showAddModal && (
				<AddBookModal
					onClose={() => setShowAddModal(false)}
					onBookAdded={handleBookAdded}
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
					setSelectedBook(null);
					setSelectedUserBookId(null);
				}}
				onRefresh={
					selectedBook ? () => handleRefreshBook(selectedBook.id) : undefined
				}
				onRemove={
					selectedUserBookId
						? async () => {
								await handleRemoveBook(selectedUserBookId);
							}
						: undefined
				}
			/>
		</div>
	);
}
