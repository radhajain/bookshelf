// Podcast data types for the application

export type ListeningStatus = 'want_to_listen' | 'listening' | 'listened';

export const LISTENING_STATUS_LABELS: Record<ListeningStatus, string> = {
  want_to_listen: 'Want to Listen',
  listening: 'Listening',
  listened: 'Listened',
};

export function getListeningStatusLabel(status?: ListeningStatus): string {
  if (!status) return LISTENING_STATUS_LABELS.want_to_listen;
  return LISTENING_STATUS_LABELS[status];
}

export interface Podcast {
  id: string;
  title: string;
  creator?: string;
  genre: string;
  notes?: string;
  priority?: string;
  listeningStatus?: ListeningStatus;
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
  listeningStatus?: ListeningStatus;
}

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
