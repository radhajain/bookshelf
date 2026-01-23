// Podcast data types for the application

export interface Podcast {
  id: string;
  title: string;
  creator?: string;
  genre: string;
  notes?: string;
  priority?: string;
}

export interface PodcastRatingSource {
  source: 'Podcast Index' | 'Apple Podcasts';
  rating?: number;
  ratingsCount?: number;
  url?: string;
}

export interface PodcastWithDetails extends Podcast {
  description?: string;
  coverImage?: string;
  podcastIndexId?: number;
  itunesId?: string;
  rssFeedUrl?: string;
  totalEpisodes?: number;
  genres?: string[];
  language?: string;
  publisher?: string;
  websiteUrl?: string;
  ratings: PodcastRatingSource[];
  detailsFetchedAt?: string;
}

// Podcast genre categories (commonly used)
export const PODCAST_GENRE_CATEGORIES = [
  'Arts',
  'Business',
  'Comedy',
  'Education',
  'Fiction',
  'Government',
  'Health & Fitness',
  'History',
  'Kids & Family',
  'Leisure',
  'Music',
  'News',
  'Religion & Spirituality',
  'Science',
  'Society & Culture',
  'Sports',
  'Technology',
  'True Crime',
  'TV & Film',
  'Uncategorized',
] as const;

// Map iTunes genre IDs to genre names
export const ITUNES_GENRE_MAP: Record<number, string> = {
  1301: 'Arts',
  1321: 'Business',
  1303: 'Comedy',
  1304: 'Education',
  1483: 'Fiction',
  1511: 'Government',
  1512: 'Health & Fitness',
  1487: 'History',
  1305: 'Kids & Family',
  1502: 'Leisure',
  1310: 'Music',
  1489: 'News',
  1314: 'Religion & Spirituality',
  1533: 'Science',
  1324: 'Society & Culture',
  1545: 'Sports',
  1318: 'Technology',
  1488: 'True Crime',
  1309: 'TV & Film',
};

// Group podcasts by genre
export function getPodcastsByGenre(podcasts: Podcast[]): Record<string, Podcast[]> {
  const grouped: Record<string, Podcast[]> = {};

  for (const podcast of podcasts) {
    const genre = podcast.genre || 'Uncategorized';
    if (!grouped[genre]) {
      grouped[genre] = [];
    }
    grouped[genre].push(podcast);
  }

  // Sort genres alphabetically, but put "Uncategorized" last
  const sortedGrouped: Record<string, Podcast[]> = {};
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

// Get all unique genres from a list of podcasts
export function getPodcastGenres(podcasts: Podcast[]): string[] {
  const genres = new Set(podcasts.map(podcast => podcast.genre || 'Uncategorized'));
  return Array.from(genres).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });
}

// Format episode count
export function formatEpisodeCount(count?: number): string {
  if (!count) return '';
  if (count === 1) return '1 episode';
  return `${count.toLocaleString()} episodes`;
}

// Get the primary genre from a podcast's genre list
export function getPrimaryGenre(genres?: string[]): string {
  if (!genres || genres.length === 0) return 'Uncategorized';
  return genres[0];
}
