// TV Show data types for the application

export type WatchingStatus = 'want_to_watch' | 'watching' | 'watched' | 'dropped';

export interface TVShow {
  id: string;
  title: string;
  creator?: string;
  firstAirDate?: string;
  genre: string;
  notes?: string;
  priority?: string;
  watchingStatus?: WatchingStatus;
  currentSeason?: number;
  currentEpisode?: number;
  rating?: number;
}

export interface TVShowRatingSource {
  source: 'TMDB' | 'IMDb';
  rating?: number;
  ratingsCount?: number;
  url?: string;
  displayFormat: 'percentage' | 'stars' | 'score';
}

export interface TVShowWithDetails extends TVShow {
  description?: string;
  tagline?: string;
  ratings: TVShowRatingSource[];
  posterImage?: string;
  backdropImage?: string;
  cast?: string[];
  genres?: string[];
  networks?: string[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  episodeRunTime?: number[];
  status?: string;
  inProduction?: boolean;
  tmdbId?: number;
  imdbId?: string;
  lastAirDate?: string;
  productionCompanies?: string[];
  originCountry?: string[];
  originalLanguage?: string;
  imdbUrl?: string;
  detailsFetchedAt?: string;
}

// Map TMDB TV genre IDs to genre names
export const TMDB_TV_GENRE_MAP: Record<number, string> = {
  10759: 'Action & Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  10762: 'Kids',
  9648: 'Mystery',
  10763: 'News',
  10764: 'Reality',
  10765: 'Sci-Fi & Fantasy',
  10766: 'Soap',
  10767: 'Talk',
  10768: 'War & Politics',
  37: 'Western',
};

// Watching status labels for display
export const WATCHING_STATUS_LABELS: Record<WatchingStatus, string> = {
  want_to_watch: 'Want to Watch',
  watching: 'Watching',
  watched: 'Watched',
  dropped: 'Dropped',
};

// Get display label for watching status
export function getWatchingStatusLabel(status?: WatchingStatus): string {
  if (!status) return WATCHING_STATUS_LABELS.want_to_watch;
  return WATCHING_STATUS_LABELS[status];
}

// Format episode run time (may have multiple values for different episode types)
export function formatEpisodeRunTime(times?: number[]): string {
  if (!times || times.length === 0) return '';
  if (times.length === 1) {
    return `${times[0]}m`;
  }
  // Show range if there are multiple episode lengths
  const min = Math.min(...times);
  const max = Math.max(...times);
  if (min === max) return `${min}m`;
  return `${min}-${max}m`;
}

// Format show status for display
export function formatShowStatus(status?: string): string {
  if (!status) return '';
  // TMDB statuses: 'Returning Series', 'Ended', 'Canceled', 'In Production', 'Planned', 'Pilot'
  return status;
}

// Get the primary genre from a TV show's genre list
export function getPrimaryGenre(genres?: string[]): string {
  if (!genres || genres.length === 0) return 'Uncategorized';
  return genres[0];
}

// Format progress as "S1 E5" style
export function formatProgress(season?: number, episode?: number): string {
  if (!season && !episode) return '';
  if (season && episode) return `S${season} E${episode}`;
  if (season) return `S${season}`;
  if (episode) return `E${episode}`;
  return '';
}

// Get year from first air date string
export function getYearFromDate(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const year = parseInt(dateStr.substring(0, 4), 10);
  return isNaN(year) ? undefined : year;
}
