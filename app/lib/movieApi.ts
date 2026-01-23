import { Movie, MovieWithDetails, MovieRatingSource, TMDB_GENRE_MAP, getPrimaryGenre } from './movies';

// TMDB API types
interface TMDBMovieResult {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
}

interface TMDBSearchResponse {
  page: number;
  results: TMDBMovieResult[];
  total_pages: number;
  total_results: number;
}

interface TMDBMovieDetails {
  id: number;
  title: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  vote_average: number;
  vote_count: number;
  budget: number;
  revenue: number;
  genres: Array<{ id: number; name: string }>;
  production_companies: Array<{ id: number; name: string }>;
  imdb_id: string | null;
}

interface TMDBCredits {
  id: number;
  cast: Array<{
    id: number;
    name: string;
    character: string;
    order: number;
  }>;
  crew: Array<{
    id: number;
    name: string;
    job: string;
    department: string;
  }>;
}

// OMDB API types
interface OMDBRating {
  Source: string;
  Value: string;
}

interface OMDBResponse {
  Title: string;
  Year: string;
  Rated: string;
  Released: string;
  Runtime: string;
  Genre: string;
  Director: string;
  Writer: string;
  Actors: string;
  Plot: string;
  Language: string;
  Country: string;
  Awards: string;
  Poster: string;
  Ratings: OMDBRating[];
  Metascore: string;
  imdbRating: string;
  imdbVotes: string;
  imdbID: string;
  Type: string;
  Response: string;
  Error?: string;
}

// In-memory cache to avoid repeated API calls
const cache = new Map<string, MovieWithDetails>();

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Custom error for rate limiting - can be caught by UI to pause
export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

async function rateLimitedFetch(url: string, headers?: Record<string, string>): Promise<Response | null> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JackBookshelf/1.0 (movie collection app)',
        ...headers,
      },
    });

    // Handle rate limiting (429) - throw error so UI can pause
    if (response.status === 429) {
      throw new RateLimitError('Rate limited by API. Please wait before continuing.');
    }

    // Server errors - just return null and continue with other movies
    if (response.status >= 500) {
      console.error(`Server error (${response.status}) for ${url}`);
      return null;
    }

    return response;
  } catch (error) {
    // Re-throw RateLimitError so it bubbles up
    if (error instanceof RateLimitError) {
      throw error;
    }
    // Network error (e.g., "Failed to fetch") - throw as rate limit to pause
    console.error(`Network error for ${url}:`, error);
    throw new RateLimitError('Network error. Please check your connection and try again.');
  }
}

// Get TMDB image URL
function getTMDBImageUrl(path: string | null | undefined, size: 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'): string | undefined {
  if (!path) return undefined;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// Generate IMDb URL
function getIMDbUrl(imdbId: string): string {
  return `https://www.imdb.com/title/${imdbId}`;
}

// Generate Letterboxd search URL
function getLetterboxdUrl(title: string, year?: number): string {
  const query = encodeURIComponent(year ? `${title} ${year}` : title);
  return `https://letterboxd.com/search/${query}/`;
}

// Search movies using TMDB API
export async function searchTMDBMovies(query: string, year?: number): Promise<TMDBMovieResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error('TMDB_API_KEY not configured');
    return [];
  }

  try {
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
    if (year) {
      url += `&year=${year}`;
    }

    const response = await rateLimitedFetch(url);
    if (!response || !response.ok) return [];

    const data: TMDBSearchResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error searching TMDB for "${query}":`, error);
    return [];
  }
}

// Fetch movie details from TMDB (includes credits for cast/director)
async function fetchTMDBMovieDetails(tmdbId: number): Promise<{
  details?: TMDBMovieDetails;
  credits?: TMDBCredits;
}> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error('TMDB_API_KEY not configured');
    return {};
  }

  try {
    // Fetch details with credits appended
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&append_to_response=credits`;
    const response = await rateLimitedFetch(url);
    if (!response || !response.ok) return {};

    const data = await response.json();
    return {
      details: data,
      credits: data.credits,
    };
  } catch (error) {
    console.error(`Error fetching TMDB details for movie ${tmdbId}:`, error);
    return {};
  }
}

// Fetch ratings from OMDB (includes Rotten Tomatoes, Metacritic)
async function fetchOMDBRatings(title: string, year?: number): Promise<{
  rottenTomatoesScore?: number;
  rottenTomatoesAudienceScore?: number;
  metacriticScore?: number;
  imdbRating?: number;
  imdbVotes?: number;
}> {
  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    console.error('OMDB_API_KEY not configured');
    return {};
  }

  try {
    let url = `https://www.omdbapi.com/?apikey=${apiKey}&t=${encodeURIComponent(title)}&type=movie`;
    if (year) {
      url += `&y=${year}`;
    }

    const response = await rateLimitedFetch(url);
    if (!response || !response.ok) return {};

    const data: OMDBResponse = await response.json();
    if (data.Response === 'False') return {};

    const result: {
      rottenTomatoesScore?: number;
      rottenTomatoesAudienceScore?: number;
      metacriticScore?: number;
      imdbRating?: number;
      imdbVotes?: number;
    } = {};

    // Parse Rotten Tomatoes score
    const rtRating = data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');
    if (rtRating?.Value) {
      const score = parseInt(rtRating.Value.replace('%', ''), 10);
      if (!isNaN(score)) {
        result.rottenTomatoesScore = score;
      }
    }

    // Parse Metacritic score
    if (data.Metascore && data.Metascore !== 'N/A') {
      const score = parseInt(data.Metascore, 10);
      if (!isNaN(score)) {
        result.metacriticScore = score;
      }
    }

    // Parse IMDb rating
    if (data.imdbRating && data.imdbRating !== 'N/A') {
      const rating = parseFloat(data.imdbRating);
      if (!isNaN(rating)) {
        result.imdbRating = rating;
      }
    }

    // Parse IMDb votes
    if (data.imdbVotes && data.imdbVotes !== 'N/A') {
      const votes = parseInt(data.imdbVotes.replace(/,/g, ''), 10);
      if (!isNaN(votes)) {
        result.imdbVotes = votes;
      }
    }

    return result;
  } catch (error) {
    console.error(`Error fetching OMDB ratings for "${title}":`, error);
    return {};
  }
}

// Search for movie directors (similar to searchBookAuthors)
export async function searchMovieDirectors(title: string): Promise<{
  directors: string[];
  hasMultipleDistinctDirectors: boolean;
}> {
  try {
    const results = await searchTMDBMovies(title);
    if (results.length === 0) {
      return { directors: [], hasMultipleDistinctDirectors: false };
    }

    // Fetch details for top results to get director info
    const directorsMap = new Map<string, number>(); // director name -> popularity score

    for (const result of results.slice(0, 5)) {
      const { credits } = await fetchTMDBMovieDetails(result.id);
      if (credits?.crew) {
        const directors = credits.crew.filter(c => c.job === 'Director');
        for (const director of directors) {
          const current = directorsMap.get(director.name) || 0;
          directorsMap.set(director.name, current + result.vote_count);
        }
      }
    }

    if (directorsMap.size === 0) {
      return { directors: [], hasMultipleDistinctDirectors: false };
    }

    // Sort by popularity
    const sortedDirectors = Array.from(directorsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    // Check if we need clarification (multiple directors with similar popularity)
    const hasMultipleDistinctDirectors = sortedDirectors.length > 1;

    return {
      directors: sortedDirectors,
      hasMultipleDistinctDirectors,
    };
  } catch (error) {
    console.error(`Error searching directors for "${title}":`, error);
    return { directors: [], hasMultipleDistinctDirectors: false };
  }
}

// Main function to fetch movie details from multiple sources
export async function fetchMovieDetails(movie: Movie): Promise<MovieWithDetails> {
  const cacheKey = `${movie.title}-${movie.director || ''}-${movie.year || ''}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // First, search TMDB to find the movie
  const searchResults = await searchTMDBMovies(movie.title, movie.year);

  let tmdbData: {
    details?: TMDBMovieDetails;
    credits?: TMDBCredits;
  } = {};

  if (searchResults.length > 0) {
    // Find best match (preferring exact title match and year match)
    let bestMatch = searchResults[0];
    for (const result of searchResults) {
      const titleMatch = result.title.toLowerCase() === movie.title.toLowerCase();
      const yearMatch = movie.year && result.release_date?.startsWith(String(movie.year));
      if (titleMatch && yearMatch) {
        bestMatch = result;
        break;
      }
      if (titleMatch) {
        bestMatch = result;
      }
    }

    // Fetch full details
    tmdbData = await fetchTMDBMovieDetails(bestMatch.id);
  }

  // Fetch OMDB data for Rotten Tomatoes ratings
  const omdbData = await fetchOMDBRatings(
    movie.title,
    movie.year || (tmdbData.details?.release_date ? parseInt(tmdbData.details.release_date.slice(0, 4), 10) : undefined)
  );

  // Build ratings array
  const ratings: MovieRatingSource[] = [];

  // TMDB rating
  if (tmdbData.details?.vote_average) {
    ratings.push({
      source: 'TMDB',
      rating: tmdbData.details.vote_average,
      ratingsCount: tmdbData.details.vote_count,
      url: `https://www.themoviedb.org/movie/${tmdbData.details.id}`,
      displayFormat: 'stars',
    });
  }

  // Rotten Tomatoes Critics
  if (omdbData.rottenTomatoesScore !== undefined) {
    ratings.push({
      source: 'Rotten Tomatoes',
      rating: omdbData.rottenTomatoesScore,
      url: `https://www.rottentomatoes.com/search?search=${encodeURIComponent(movie.title)}`,
      displayFormat: 'percentage',
    });
  }

  // Metacritic
  if (omdbData.metacriticScore !== undefined) {
    ratings.push({
      source: 'Metacritic',
      rating: omdbData.metacriticScore,
      url: `https://www.metacritic.com/search/${encodeURIComponent(movie.title)}/`,
      displayFormat: 'score',
    });
  }

  // IMDb
  if (omdbData.imdbRating !== undefined) {
    const imdbId = tmdbData.details?.imdb_id;
    ratings.push({
      source: 'IMDb',
      rating: omdbData.imdbRating,
      ratingsCount: omdbData.imdbVotes,
      url: imdbId ? getIMDbUrl(imdbId) : `https://www.imdb.com/find?q=${encodeURIComponent(movie.title)}`,
      displayFormat: 'stars',
    });
  }

  // Add Letterboxd as link-only (no public API)
  ratings.push({
    source: 'Letterboxd',
    url: getLetterboxdUrl(movie.title, movie.year),
    displayFormat: 'stars',
  });

  // Extract director from credits
  let director = movie.director;
  if (!director && tmdbData.credits?.crew) {
    const directorCredit = tmdbData.credits.crew.find(c => c.job === 'Director');
    if (directorCredit) {
      director = directorCredit.name;
    }
  }

  // Extract cast (top 10)
  const cast = tmdbData.credits?.cast
    ?.sort((a, b) => a.order - b.order)
    .slice(0, 10)
    .map(c => c.name);

  // Extract genres
  const genres = tmdbData.details?.genres?.map(g => g.name);

  // Build the full details object
  const movieWithDetails: MovieWithDetails = {
    ...movie,
    director,
    year: movie.year || (tmdbData.details?.release_date ? parseInt(tmdbData.details.release_date.slice(0, 4), 10) : undefined),
    genre: movie.genre || getPrimaryGenre(genres),
    runtime: tmdbData.details?.runtime,
    description: tmdbData.details?.overview,
    tagline: tmdbData.details?.tagline,
    ratings,
    posterImage: getTMDBImageUrl(tmdbData.details?.poster_path),
    backdropImage: getTMDBImageUrl(tmdbData.details?.backdrop_path, 'w780'),
    cast,
    genres,
    tmdbId: tmdbData.details?.id,
    imdbId: tmdbData.details?.imdb_id || undefined,
    releaseDate: tmdbData.details?.release_date,
    budget: tmdbData.details?.budget,
    revenue: tmdbData.details?.revenue,
    productionCompanies: tmdbData.details?.production_companies?.map(c => c.name),
    imdbUrl: tmdbData.details?.imdb_id ? getIMDbUrl(tmdbData.details.imdb_id) : undefined,
    letterboxdUrl: getLetterboxdUrl(movie.title, movie.year),
  };

  cache.set(cacheKey, movieWithDetails);
  return movieWithDetails;
}

// Fetch details for multiple movies with batching
export async function fetchMoviesDetails(movies: Movie[]): Promise<MovieWithDetails[]> {
  const results: MovieWithDetails[] = [];
  const BATCH_SIZE = 3; // Smaller batch size to be gentler on APIs

  for (let i = 0; i < movies.length; i += BATCH_SIZE) {
    const batch = movies.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(movie => fetchMovieDetails(movie))
    );
    results.push(...batchResults);
  }

  return results;
}

// Search movies and return results for selection (used in AddMovieModal)
export interface MovieSearchResult {
  tmdbId: number;
  title: string;
  year?: number;
  posterImage?: string;
  overview?: string;
  director?: string;
  voteAverage?: number;
  voteCount?: number;
}

export async function searchMoviesForSelection(query: string): Promise<MovieSearchResult[]> {
  const results = await searchTMDBMovies(query);

  // Get director info for top results
  const moviesWithDirectors: MovieSearchResult[] = [];

  for (const result of results.slice(0, 10)) {
    const { credits } = await fetchTMDBMovieDetails(result.id);
    const director = credits?.crew?.find(c => c.job === 'Director')?.name;

    moviesWithDirectors.push({
      tmdbId: result.id,
      title: result.title,
      year: result.release_date ? parseInt(result.release_date.slice(0, 4), 10) : undefined,
      posterImage: getTMDBImageUrl(result.poster_path, 'w185'),
      overview: result.overview,
      director,
      voteAverage: result.vote_average,
      voteCount: result.vote_count,
    });
  }

  return moviesWithDirectors;
}
