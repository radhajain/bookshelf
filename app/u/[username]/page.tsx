import { BookWithDetails, RatingSource } from '@/app/lib/books';
import { MovieWithDetails, MovieRatingSource } from '@/app/lib/movies';
import { createClient } from '@/app/lib/supabase/server';
import { notFound } from 'next/navigation';
import PublicBookshelf from './PublicBookshelf';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildBookRatings(book: any): RatingSource[] {
	const ratings: RatingSource[] = [];
	if (book.google_rating) {
		ratings.push({
			source: 'Google Books',
			rating: book.google_rating,
			ratingsCount: book.google_ratings_count || undefined,
		});
	}
	if (book.open_library_rating) {
		ratings.push({
			source: 'Open Library',
			rating: book.open_library_rating,
			ratingsCount: book.open_library_ratings_count || undefined,
		});
	}
	return ratings;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMovieRatings(movie: any): MovieRatingSource[] {
	const ratings: MovieRatingSource[] = [];
	if (movie.tmdb_rating) {
		ratings.push({
			source: 'TMDB',
			rating: movie.tmdb_rating,
			ratingsCount: movie.tmdb_ratings_count || undefined,
			displayFormat: 'stars',
		});
	}
	if (movie.rotten_tomatoes_score) {
		ratings.push({
			source: 'Rotten Tomatoes',
			rating: movie.rotten_tomatoes_score,
			displayFormat: 'percentage',
		});
	}
	if (movie.metacritic_score) {
		ratings.push({
			source: 'Metacritic',
			rating: movie.metacritic_score,
			displayFormat: 'score',
		});
	}
	if (movie.imdb_rating) {
		ratings.push({
			source: 'IMDb',
			rating: movie.imdb_rating,
			ratingsCount: movie.imdb_ratings_count || undefined,
			url: movie.imdb_url || undefined,
			displayFormat: 'stars',
		});
	}
	return ratings;
}

interface PageProps {
	params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
	const { username } = await params;
	const supabase = await createClient();

	// Fetch the profile by username
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('*')
		.eq('username', username)
		.single();

	if (profileError || !profile) {
		notFound();
	}

	// Fetch user's books and movies in parallel
	const [booksResult, moviesResult] = await Promise.all([
		supabase
			.from('user_books')
			.select(`
				*,
				book:books(*)
			`)
			.eq('user_id', profile.id)
			.order('created_at', { ascending: false }),
		supabase
			.from('user_movies')
			.select(`
				*,
				movie:movies(*)
			`)
			.eq('user_id', profile.id)
			.order('created_at', { ascending: false }),
	]);

	if (booksResult.error) {
		console.error('Error fetching books:', booksResult.error);
	}
	if (moviesResult.error) {
		console.error('Error fetching movies:', moviesResult.error);
	}

	// Convert to BookWithDetails format with all cached details
	const books: BookWithDetails[] = (booksResult.data || []).map((ub) => ({
		id: ub.book_id,
		title: ub.book.title,
		author: ub.book.author || undefined,
		genre: ub.book.genre || 'Uncategorized',
		pages: ub.book.page_count || undefined,
		notes: ub.notes || undefined,
		priority: ub.priority || undefined,
		description: ub.book.description || undefined,
		coverImage: ub.book.cover_image || undefined,
		isbn: ub.book.isbn || undefined,
		publishedDate: ub.book.published_date || undefined,
		publisher: ub.book.publisher || undefined,
		subjects: ub.book.subjects || undefined,
		goodreadsUrl: ub.book.goodreads_url || undefined,
		amazonUrl: ub.book.amazon_url || undefined,
		ratings: buildBookRatings(ub.book),
		detailsFetchedAt: ub.book.details_fetched_at || undefined,
	}));

	// Convert to MovieWithDetails format with all cached details
	const movies: MovieWithDetails[] = (moviesResult.data || []).map((um) => ({
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
		tagline: um.movie.tagline || undefined,
		posterImage: um.movie.poster_image || undefined,
		backdropImage: um.movie.backdrop_image || undefined,
		cast: um.movie.cast_members || undefined,
		genres: um.movie.genres || undefined,
		tmdbId: um.movie.tmdb_id || undefined,
		imdbId: um.movie.imdb_id || undefined,
		releaseDate: um.movie.release_date || undefined,
		budget: um.movie.budget || undefined,
		revenue: um.movie.revenue || undefined,
		productionCompanies: um.movie.production_companies || undefined,
		imdbUrl: um.movie.imdb_url || undefined,
		letterboxdUrl: um.movie.letterboxd_url || undefined,
		ratings: buildMovieRatings(um.movie),
		detailsFetchedAt: um.movie.details_fetched_at || undefined,
	}));

	// Group books by genre
	const booksByGenre = books.reduce(
		(acc, book) => {
			const genre = book.genre || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(book);
			return acc;
		},
		{} as Record<string, BookWithDetails[]>,
	);

	// Group movies by genre
	const moviesByGenre = movies.reduce(
		(acc, movie) => {
			const genre = movie.genre || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(movie);
			return acc;
		},
		{} as Record<string, MovieWithDetails[]>,
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

	return (
		<PublicBookshelf
			profile={profile}
			books={books}
			movies={movies}
			booksByGenre={booksByGenre}
			moviesByGenre={moviesByGenre}
			sortedGenres={sortedGenres}
		/>
	);
}
