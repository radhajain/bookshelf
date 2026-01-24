import { TVShow, TVShowWithDetails, TVShowRatingSource, TMDB_TV_GENRE_MAP, getPrimaryGenre } from './tvshows';

// TMDB TV API types
interface TMDBTVShowResult {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  origin_country: string[];
}

interface TMDBTVSearchResponse {
  page: number;
  results: TMDBTVShowResult[];
  total_pages: number;
  total_results: number;
}

interface TMDBTVShowDetails {
  id: number;
  name: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  vote_average: number;
  vote_count: number;
  status: string;
  in_production: boolean;
  genres: Array<{ id: number; name: string }>;
  networks: Array<{ id: number; name: string; logo_path: string | null }>;
  production_companies: Array<{ id: number; name: string }>;
  origin_country: string[];
  original_language: string;
  created_by: Array<{ id: number; name: string }>;
}

interface TMDBTVCredits {
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

interface TMDBExternalIds {
  imdb_id: string | null;
  tvdb_id: number | null;
  facebook_id: string | null;
  instagram_id: string | null;
  twitter_id: string | null;
}

// In-memory cache to avoid repeated API calls
const cache = new Map<string, TVShowWithDetails>();

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
        'User-Agent': 'JackBookshelf/1.0 (tv show collection app)',
        ...headers,
      },
    });

    // Handle rate limiting (429) - throw error so UI can pause
    if (response.status === 429) {
      throw new RateLimitError('Rate limited by API. Please wait before continuing.');
    }

    // Server errors - just return null and continue with other shows
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

// Search TV shows using TMDB API
export async function searchTMDBTVShows(query: string, year?: number): Promise<TMDBTVShowResult[]> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error('TMDB_API_KEY not configured');
    return [];
  }

  try {
    let url = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}`;
    if (year) {
      url += `&first_air_date_year=${year}`;
    }

    const response = await rateLimitedFetch(url);
    if (!response || !response.ok) return [];

    const data: TMDBTVSearchResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error searching TMDB for TV show "${query}":`, error);
    return [];
  }
}

// Fetch TV show details from TMDB (includes credits and external IDs)
async function fetchTMDBTVShowDetails(tmdbId: number): Promise<{
  details?: TMDBTVShowDetails;
  credits?: TMDBTVCredits;
  externalIds?: TMDBExternalIds;
}> {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.error('TMDB_API_KEY not configured');
    return {};
  }

  try {
    // Fetch details with credits and external IDs appended
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&append_to_response=credits,external_ids`;
    const response = await rateLimitedFetch(url);
    if (!response || !response.ok) return {};

    const data = await response.json();
    return {
      details: data,
      credits: data.credits,
      externalIds: data.external_ids,
    };
  } catch (error) {
    console.error(`Error fetching TMDB details for TV show ${tmdbId}:`, error);
    return {};
  }
}

// Search for TV show creators
export async function searchTVShowCreators(title: string): Promise<{
  creators: string[];
  hasMultipleDistinctCreators: boolean;
}> {
  try {
    const results = await searchTMDBTVShows(title);
    if (results.length === 0) {
      return { creators: [], hasMultipleDistinctCreators: false };
    }

    // Fetch details for top results to get creator info
    const creatorsMap = new Map<string, number>(); // creator name -> popularity score

    for (const result of results.slice(0, 5)) {
      const { details } = await fetchTMDBTVShowDetails(result.id);
      if (details?.created_by) {
        for (const creator of details.created_by) {
          const current = creatorsMap.get(creator.name) || 0;
          creatorsMap.set(creator.name, current + result.vote_count);
        }
      }
    }

    if (creatorsMap.size === 0) {
      return { creators: [], hasMultipleDistinctCreators: false };
    }

    // Sort by popularity
    const sortedCreators = Array.from(creatorsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    // Check if we need clarification (multiple creators with similar popularity)
    const hasMultipleDistinctCreators = sortedCreators.length > 1;

    return {
      creators: sortedCreators,
      hasMultipleDistinctCreators,
    };
  } catch (error) {
    console.error(`Error searching creators for "${title}":`, error);
    return { creators: [], hasMultipleDistinctCreators: false };
  }
}

// Main function to fetch TV show details from multiple sources
export async function fetchTVShowDetails(tvshow: TVShow): Promise<TVShowWithDetails> {
  const cacheKey = `${tvshow.title}-${tvshow.creator || ''}-${tvshow.firstAirDate || ''}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // First, search TMDB to find the TV show
  const year = tvshow.firstAirDate ? parseInt(tvshow.firstAirDate.slice(0, 4), 10) : undefined;
  const searchResults = await searchTMDBTVShows(tvshow.title, year);

  let tmdbData: {
    details?: TMDBTVShowDetails;
    credits?: TMDBTVCredits;
    externalIds?: TMDBExternalIds;
  } = {};

  if (searchResults.length > 0) {
    // Find best match (preferring exact title match and year match)
    let bestMatch = searchResults[0];
    for (const result of searchResults) {
      const titleMatch = result.name.toLowerCase() === tvshow.title.toLowerCase();
      const yearMatch = year && result.first_air_date?.startsWith(String(year));
      if (titleMatch && yearMatch) {
        bestMatch = result;
        break;
      }
      if (titleMatch) {
        bestMatch = result;
      }
    }

    // Fetch full details
    tmdbData = await fetchTMDBTVShowDetails(bestMatch.id);
  }

  // Build ratings array
  const ratings: TVShowRatingSource[] = [];

  // TMDB rating
  if (tmdbData.details?.vote_average) {
    ratings.push({
      source: 'TMDB',
      rating: tmdbData.details.vote_average,
      ratingsCount: tmdbData.details.vote_count,
      url: `https://www.themoviedb.org/tv/${tmdbData.details.id}`,
      displayFormat: 'stars',
    });
  }

  // IMDb (if we have the ID)
  if (tmdbData.externalIds?.imdb_id) {
    ratings.push({
      source: 'IMDb',
      url: getIMDbUrl(tmdbData.externalIds.imdb_id),
      displayFormat: 'stars',
    });
  }

  // Extract creator from details
  let creator = tvshow.creator;
  if (!creator && tmdbData.details?.created_by?.length) {
    creator = tmdbData.details.created_by.map(c => c.name).join(', ');
  }

  // Extract cast (top 10)
  const cast = tmdbData.credits?.cast
    ?.sort((a, b) => a.order - b.order)
    .slice(0, 10)
    .map(c => c.name);

  // Extract genres
  const genres = tmdbData.details?.genres?.map(g => g.name);

  // Extract networks
  const networks = tmdbData.details?.networks?.map(n => n.name);

  // Build the full details object
  const tvshowWithDetails: TVShowWithDetails = {
    ...tvshow,
    creator,
    firstAirDate: tvshow.firstAirDate || tmdbData.details?.first_air_date,
    genre: tvshow.genre || getPrimaryGenre(genres),
    description: tmdbData.details?.overview,
    tagline: tmdbData.details?.tagline,
    ratings,
    posterImage: getTMDBImageUrl(tmdbData.details?.poster_path),
    backdropImage: getTMDBImageUrl(tmdbData.details?.backdrop_path, 'w780'),
    cast,
    genres,
    networks,
    numberOfSeasons: tmdbData.details?.number_of_seasons,
    numberOfEpisodes: tmdbData.details?.number_of_episodes,
    episodeRunTime: tmdbData.details?.episode_run_time,
    status: tmdbData.details?.status,
    inProduction: tmdbData.details?.in_production,
    tmdbId: tmdbData.details?.id,
    imdbId: tmdbData.externalIds?.imdb_id || undefined,
    lastAirDate: tmdbData.details?.last_air_date,
    productionCompanies: tmdbData.details?.production_companies?.map(c => c.name),
    originCountry: tmdbData.details?.origin_country,
    originalLanguage: tmdbData.details?.original_language,
    imdbUrl: tmdbData.externalIds?.imdb_id ? getIMDbUrl(tmdbData.externalIds.imdb_id) : undefined,
  };

  cache.set(cacheKey, tvshowWithDetails);
  return tvshowWithDetails;
}

// Fetch details for multiple TV shows with batching
export async function fetchTVShowsDetails(tvshows: TVShow[]): Promise<TVShowWithDetails[]> {
  const results: TVShowWithDetails[] = [];
  const BATCH_SIZE = 3; // Smaller batch size to be gentler on APIs

  for (let i = 0; i < tvshows.length; i += BATCH_SIZE) {
    const batch = tvshows.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(tvshow => fetchTVShowDetails(tvshow))
    );
    results.push(...batchResults);
  }

  return results;
}

// Search TV shows and return results for selection (used in AddTVShowModal)
export interface TVShowSearchResult {
  tmdbId: number;
  title: string;
  firstAirDate?: string;
  posterImage?: string;
  overview?: string;
  creator?: string;
  voteAverage?: number;
  voteCount?: number;
  networks?: string[];
}

export async function searchTVShowsForSelection(query: string): Promise<TVShowSearchResult[]> {
  const results = await searchTMDBTVShows(query);

  // Get creator info for top results
  const showsWithDetails: TVShowSearchResult[] = [];

  for (const result of results.slice(0, 10)) {
    const { details } = await fetchTMDBTVShowDetails(result.id);
    const creator = details?.created_by?.map(c => c.name).join(', ');
    const networks = details?.networks?.map(n => n.name);

    showsWithDetails.push({
      tmdbId: result.id,
      title: result.name,
      firstAirDate: result.first_air_date,
      posterImage: getTMDBImageUrl(result.poster_path, 'w185'),
      overview: result.overview,
      creator,
      voteAverage: result.vote_average,
      voteCount: result.vote_count,
      networks,
    });
  }

  return showsWithDetails;
}
