// Movie data types for the application

export interface Movie {
  id: string;
  title: string;
  director?: string;
  year?: number;
  genre: string;
  runtime?: number;
  notes?: string;
  priority?: string;
  watched?: boolean;
}

export interface MovieRatingSource {
  source: 'TMDB' | 'Rotten Tomatoes' | 'Rotten Tomatoes Audience' | 'Metacritic' | 'IMDb' | 'Letterboxd';
  rating?: number;
  ratingsCount?: number;
  url?: string;
  displayFormat: 'percentage' | 'stars' | 'score';
}

export interface MovieWithDetails extends Movie {
  description?: string;
  tagline?: string;
  ratings: MovieRatingSource[];
  posterImage?: string;
  backdropImage?: string;
  cast?: string[];
  genres?: string[];
  tmdbId?: number;
  imdbId?: string;
  releaseDate?: string;
  budget?: number;
  revenue?: number;
  productionCompanies?: string[];
  imdbUrl?: string;
  letterboxdUrl?: string;
  detailsFetchedAt?: string;
}

// Movie genre categories (commonly used in film)
export const MOVIE_GENRE_CATEGORIES = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Family',
  'Fantasy',
  'History',
  'Horror',
  'Music',
  'Mystery',
  'Romance',
  'Science Fiction',
  'Thriller',
  'War',
  'Western',
  'Uncategorized',
] as const;

// Map TMDB genre IDs to genre names
export const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

// Group movies by genre
export function getMoviesByGenre(movies: Movie[]): Record<string, Movie[]> {
  const grouped: Record<string, Movie[]> = {};

  for (const movie of movies) {
    const genre = movie.genre || 'Uncategorized';
    if (!grouped[genre]) {
      grouped[genre] = [];
    }
    grouped[genre].push(movie);
  }

  // Sort genres alphabetically, but put "Uncategorized" last
  const sortedGrouped: Record<string, Movie[]> = {};
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  for (const key of sortedKeys) {
    sortedGrouped[key] = grouped[key];
  }

  return sortedGrouped;
}

// Get all unique genres from a list of movies
export function getMovieGenres(movies: Movie[]): string[] {
  const genres = new Set(movies.map(movie => movie.genre || 'Uncategorized'));
  return Array.from(genres).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });
}

// Format runtime in hours and minutes
export function formatRuntime(minutes?: number): string {
  if (!minutes) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Format budget/revenue as currency
export function formatMoney(amount?: number): string {
  if (!amount) return '';
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  return `$${amount.toLocaleString()}`;
}

// Get the primary genre from a movie's genre list
export function getPrimaryGenre(genres?: string[]): string {
  if (!genres || genres.length === 0) return 'Uncategorized';
  return genres[0];
}
