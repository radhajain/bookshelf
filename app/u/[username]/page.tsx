import { BookWithDetails, RatingSource } from '@/app/lib/books';
import { MovieWithDetails, MovieRatingSource } from '@/app/lib/movies';
import { PodcastWithDetails, PodcastRatingSource } from '@/app/lib/podcasts';
import { TVShowWithDetails, TVShowRatingSource } from '@/app/lib/tvshows';
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPodcastRatings(podcast: any): PodcastRatingSource[] {
	const ratings: PodcastRatingSource[] = [];
	if (podcast.podcast_index_rating) {
		ratings.push({
			source: 'Podcast Index',
			rating: podcast.podcast_index_rating,
		});
	}
	return ratings;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTVShowRatings(tvshow: any): TVShowRatingSource[] {
	const ratings: TVShowRatingSource[] = [];
	if (tvshow.tmdb_rating) {
		ratings.push({
			source: 'TMDB',
			rating: tvshow.tmdb_rating,
			ratingsCount: tvshow.tmdb_ratings_count || undefined,
			displayFormat: 'stars',
		});
	}
	if (tvshow.imdb_rating) {
		ratings.push({
			source: 'IMDb',
			rating: tvshow.imdb_rating,
			ratingsCount: tvshow.imdb_ratings_count || undefined,
			url: tvshow.imdb_url || undefined,
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

	// Fetch user's books, movies, podcasts, and TV shows in parallel
	const [booksResult, moviesResult, podcastsResult, tvshowsResult] = await Promise.all([
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
		supabase
			.from('user_podcasts')
			.select(`
				*,
				podcast:podcasts(*)
			`)
			.eq('user_id', profile.id)
			.order('created_at', { ascending: false }),
		supabase
			.from('user_tvshows')
			.select(`
				*,
				tvshow:tvshows(*)
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
	if (podcastsResult.error) {
		console.error('Error fetching podcasts:', podcastsResult.error);
	}
	if (tvshowsResult.error) {
		console.error('Error fetching TV shows:', tvshowsResult.error);
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

	// Convert to PodcastWithDetails format with all cached details
	const podcasts: PodcastWithDetails[] = (podcastsResult.data || []).map((up) => ({
		id: up.podcast_id,
		title: up.podcast.title,
		creator: up.podcast.creator || undefined,
		genre: up.genre || (up.podcast.genres?.[0]) || 'Uncategorized',
		notes: up.notes || undefined,
		priority: up.priority || undefined,
		description: up.podcast.description || undefined,
		coverImage: up.podcast.cover_image || undefined,
		podcastIndexId: up.podcast.podcast_index_id || undefined,
		itunesId: up.podcast.itunes_id || undefined,
		rssFeedUrl: up.podcast.rss_feed_url || undefined,
		totalEpisodes: up.podcast.total_episodes || undefined,
		genres: up.podcast.genres || undefined,
		language: up.podcast.language || undefined,
		publisher: up.podcast.publisher || undefined,
		websiteUrl: up.podcast.website_url || undefined,
		ratings: buildPodcastRatings(up.podcast),
		detailsFetchedAt: up.podcast.details_fetched_at || undefined,
	}));

	// Convert to TVShowWithDetails format with all cached details
	const tvshows: TVShowWithDetails[] = (tvshowsResult.data || []).map((ut) => ({
		id: ut.tvshow_id,
		title: ut.tvshow.title,
		creator: ut.tvshow.creator || undefined,
		firstAirDate: ut.tvshow.first_air_date || undefined,
		genre: ut.genre || (ut.tvshow.genres?.[0]) || 'Uncategorized',
		notes: ut.notes || undefined,
		priority: ut.priority || undefined,
		watchingStatus: ut.watching_status || 'want_to_watch',
		currentSeason: ut.current_season || undefined,
		currentEpisode: ut.current_episode || undefined,
		rating: ut.rating || undefined,
		description: ut.tvshow.description || undefined,
		tagline: ut.tvshow.tagline || undefined,
		posterImage: ut.tvshow.poster_image || undefined,
		backdropImage: ut.tvshow.backdrop_image || undefined,
		cast: ut.tvshow.cast_members || undefined,
		genres: ut.tvshow.genres || undefined,
		networks: ut.tvshow.networks || undefined,
		numberOfSeasons: ut.tvshow.number_of_seasons || undefined,
		numberOfEpisodes: ut.tvshow.number_of_episodes || undefined,
		episodeRunTime: ut.tvshow.episode_run_time || undefined,
		status: ut.tvshow.status || undefined,
		inProduction: ut.tvshow.in_production || false,
		tmdbId: ut.tvshow.tmdb_id || undefined,
		imdbId: ut.tvshow.imdb_id || undefined,
		lastAirDate: ut.tvshow.last_air_date || undefined,
		productionCompanies: ut.tvshow.production_companies || undefined,
		originCountry: ut.tvshow.origin_country || undefined,
		originalLanguage: ut.tvshow.original_language || undefined,
		imdbUrl: ut.tvshow.imdb_url || undefined,
		ratings: buildTVShowRatings(ut.tvshow),
		detailsFetchedAt: ut.tvshow.details_fetched_at || undefined,
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

	// Group podcasts by genre
	const podcastsByGenre = podcasts.reduce(
		(acc, podcast) => {
			const genre = podcast.genre || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(podcast);
			return acc;
		},
		{} as Record<string, PodcastWithDetails[]>,
	);

	// Group TV shows by genre
	const tvshowsByGenre = tvshows.reduce(
		(acc, tvshow) => {
			const genre = tvshow.genre || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(tvshow);
			return acc;
		},
		{} as Record<string, TVShowWithDetails[]>,
	);

	// Combined genres (union of book, movie, podcast, and TV show genres)
	const allGenres = new Set([
		...Object.keys(booksByGenre),
		...Object.keys(moviesByGenre),
		...Object.keys(podcastsByGenre),
		...Object.keys(tvshowsByGenre),
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
			podcasts={podcasts}
			tvshows={tvshows}
			booksByGenre={booksByGenre}
			moviesByGenre={moviesByGenre}
			podcastsByGenre={podcastsByGenre}
			tvshowsByGenre={tvshowsByGenre}
			sortedGenres={sortedGenres}
		/>
	);
}
