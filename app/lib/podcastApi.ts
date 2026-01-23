import { Podcast, PodcastWithDetails, PodcastRatingSource, getPrimaryGenre, ITUNES_GENRE_MAP } from './podcasts';

// iTunes API types
interface iTunesPodcastResult {
  collectionId: number;
  trackId: number;
  artistName: string;
  collectionName: string;
  trackName: string;
  collectionViewUrl: string;
  feedUrl: string;
  artworkUrl30: string;
  artworkUrl60: string;
  artworkUrl100: string;
  artworkUrl600: string;
  releaseDate: string;
  collectionExplicitness: string;
  trackCount: number;
  primaryGenreName: string;
  genreIds: string[];
  genres: string[];
}

interface iTunesSearchResponse {
  resultCount: number;
  results: iTunesPodcastResult[];
}

// Podcast Index API types (when API key is configured)
interface PodcastIndexResult {
  id: number;
  title: string;
  description: string;
  author: string;
  image: string;
  url: string;
  originalUrl: string;
  link: string;
  language: string;
  categories: Record<string, string>;
  episodeCount: number;
}

interface PodcastIndexSearchResponse {
  status: string;
  feeds: PodcastIndexResult[];
  count: number;
}

interface PodcastIndexDetailsResponse {
  status: string;
  feed: PodcastIndexResult;
}

// In-memory cache to avoid repeated API calls
const cache = new Map<string, PodcastWithDetails>();

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 200; // 200ms between requests

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Custom error for rate limiting
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
        'User-Agent': 'JackBookshelf/1.0 (podcast collection app)',
        ...headers,
      },
    });

    if (response.status === 429) {
      throw new RateLimitError('Rate limited by API. Please wait before continuing.');
    }

    if (response.status >= 500) {
      console.error(`Server error (${response.status}) for ${url}`);
      return null;
    }

    return response;
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    console.error(`Network error for ${url}:`, error);
    throw new RateLimitError('Network error. Please check your connection and try again.');
  }
}

// Generate Apple Podcasts URL
function getApplePodcastsUrl(itunesId: string | number): string {
  return `https://podcasts.apple.com/podcast/id${itunesId}`;
}

// Get iTunes artwork URL at specific size
function getITunesArtworkUrl(result: iTunesPodcastResult, size: 100 | 600 = 600): string | undefined {
  if (size === 600 && result.artworkUrl600) return result.artworkUrl600;
  if (result.artworkUrl100) {
    // iTunes artwork URLs can be modified to get different sizes
    return result.artworkUrl100.replace('100x100', `${size}x${size}`);
  }
  return undefined;
}

// Search podcasts using iTunes API
export async function searchITunesPodcasts(query: string): Promise<iTunesPodcastResult[]> {
  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&entity=podcast&limit=20`;
    const response = await rateLimitedFetch(url);
    if (!response || !response.ok) return [];

    const data: iTunesSearchResponse = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`Error searching iTunes for "${query}":`, error);
    return [];
  }
}

// Search podcasts using Podcast Index API (if configured)
async function searchPodcastIndex(query: string): Promise<PodcastIndexResult[]> {
  const apiKey = process.env.PODCAST_INDEX_API_KEY;
  const apiSecret = process.env.PODCAST_INDEX_API_SECRET;

  if (!apiKey || !apiSecret) {
    // Podcast Index not configured, skip
    return [];
  }

  try {
    // Podcast Index requires authentication headers
    const authDate = Math.floor(Date.now() / 1000);
    const crypto = await import('crypto');
    const authHash = crypto
      .createHash('sha1')
      .update(apiKey + apiSecret + authDate)
      .digest('hex');

    const url = `https://api.podcastindex.org/api/1.0/search/byterm?q=${encodeURIComponent(query)}`;
    const response = await rateLimitedFetch(url, {
      'X-Auth-Key': apiKey,
      'X-Auth-Date': String(authDate),
      'Authorization': authHash,
    });

    if (!response || !response.ok) return [];

    const data: PodcastIndexSearchResponse = await response.json();
    return data.feeds || [];
  } catch (error) {
    console.error(`Error searching Podcast Index for "${query}":`, error);
    return [];
  }
}

// Fetch podcast details from Podcast Index by ID
async function fetchPodcastIndexDetails(podcastIndexId: number): Promise<PodcastIndexResult | null> {
  const apiKey = process.env.PODCAST_INDEX_API_KEY;
  const apiSecret = process.env.PODCAST_INDEX_API_SECRET;

  if (!apiKey || !apiSecret) {
    return null;
  }

  try {
    const authDate = Math.floor(Date.now() / 1000);
    const crypto = await import('crypto');
    const authHash = crypto
      .createHash('sha1')
      .update(apiKey + apiSecret + authDate)
      .digest('hex');

    const url = `https://api.podcastindex.org/api/1.0/podcasts/byfeedid?id=${podcastIndexId}`;
    const response = await rateLimitedFetch(url, {
      'X-Auth-Key': apiKey,
      'X-Auth-Date': String(authDate),
      'Authorization': authHash,
    });

    if (!response || !response.ok) return null;

    const data: PodcastIndexDetailsResponse = await response.json();
    return data.feed || null;
  } catch (error) {
    console.error(`Error fetching Podcast Index details for ${podcastIndexId}:`, error);
    return null;
  }
}

// Map iTunes genre string to our standard genre
function mapITunesGenre(genreName: string): string {
  // Direct mapping for common iTunes genre names
  const genreMap: Record<string, string> = {
    'Arts': 'Arts',
    'Business': 'Business',
    'Comedy': 'Comedy',
    'Education': 'Education',
    'Fiction': 'Fiction',
    'Government': 'Government',
    'Health & Fitness': 'Health & Fitness',
    'History': 'History',
    'Kids & Family': 'Kids & Family',
    'Leisure': 'Leisure',
    'Music': 'Music',
    'News': 'News',
    'Religion & Spirituality': 'Religion & Spirituality',
    'Science': 'Science',
    'Society & Culture': 'Society & Culture',
    'Sports': 'Sports',
    'Sports & Recreation': 'Sports',
    'Technology': 'Technology',
    'Tech': 'Technology',
    'True Crime': 'True Crime',
    'TV & Film': 'TV & Film',
    'Games & Hobbies': 'Leisure',
  };

  return genreMap[genreName] || 'Uncategorized';
}

// Search for podcast creators (similar to searchBookAuthors)
export async function searchPodcastCreators(title: string): Promise<{
  creators: string[];
  hasMultipleDistinctCreators: boolean;
}> {
  try {
    const results = await searchITunesPodcasts(title);
    if (results.length === 0) {
      return { creators: [], hasMultipleDistinctCreators: false };
    }

    // Collect unique creators with episode count as popularity indicator
    const creatorsMap = new Map<string, number>();

    for (const result of results) {
      if (result.artistName) {
        const current = creatorsMap.get(result.artistName) || 0;
        creatorsMap.set(result.artistName, current + (result.trackCount || 0));
      }
    }

    if (creatorsMap.size === 0) {
      return { creators: [], hasMultipleDistinctCreators: false };
    }

    // Sort by episode count (popularity)
    const sortedCreators = Array.from(creatorsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    return {
      creators: sortedCreators,
      hasMultipleDistinctCreators: sortedCreators.length > 1,
    };
  } catch (error) {
    console.error(`Error searching creators for "${title}":`, error);
    return { creators: [], hasMultipleDistinctCreators: false };
  }
}

// Main function to fetch podcast details from multiple sources
export async function fetchPodcastDetails(podcast: Podcast): Promise<PodcastWithDetails> {
  const cacheKey = `${podcast.title}-${podcast.creator || ''}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // Search iTunes to find the podcast
  const itunesResults = await searchITunesPodcasts(
    podcast.creator ? `${podcast.title} ${podcast.creator}` : podcast.title
  );

  let bestMatch: iTunesPodcastResult | null = null;

  if (itunesResults.length > 0) {
    // Find best match
    for (const result of itunesResults) {
      const titleMatch = result.collectionName.toLowerCase() === podcast.title.toLowerCase() ||
        result.trackName.toLowerCase() === podcast.title.toLowerCase();
      const creatorMatch = !podcast.creator ||
        result.artistName.toLowerCase().includes(podcast.creator.toLowerCase());

      if (titleMatch && creatorMatch) {
        bestMatch = result;
        break;
      }
    }

    // If no exact match, use first result
    if (!bestMatch) {
      bestMatch = itunesResults[0];
    }
  }

  // Try Podcast Index for additional data
  let podcastIndexData: PodcastIndexResult | null = null;
  const podcastIndexResults = await searchPodcastIndex(podcast.title);
  if (podcastIndexResults.length > 0) {
    // Find match by title/creator
    for (const result of podcastIndexResults) {
      const titleMatch = result.title.toLowerCase() === podcast.title.toLowerCase();
      const creatorMatch = !podcast.creator ||
        result.author.toLowerCase().includes(podcast.creator.toLowerCase());

      if (titleMatch && creatorMatch) {
        podcastIndexData = result;
        break;
      }
    }
    if (!podcastIndexData) {
      podcastIndexData = podcastIndexResults[0];
    }
  }

  // Build ratings array
  const ratings: PodcastRatingSource[] = [];

  // Apple Podcasts link
  if (bestMatch) {
    ratings.push({
      source: 'Apple Podcasts',
      url: getApplePodcastsUrl(bestMatch.collectionId),
    });
  }

  // Podcast Index link (if we have data)
  if (podcastIndexData) {
    ratings.push({
      source: 'Podcast Index',
      url: `https://podcastindex.org/podcast/${podcastIndexData.id}`,
    });
  }

  // Extract genres
  const genres: string[] = [];
  if (bestMatch?.genres) {
    for (const genre of bestMatch.genres) {
      if (genre !== 'Podcasts') {
        const mapped = mapITunesGenre(genre);
        if (!genres.includes(mapped)) {
          genres.push(mapped);
        }
      }
    }
  }
  if (podcastIndexData?.categories) {
    for (const category of Object.values(podcastIndexData.categories)) {
      const mapped = mapITunesGenre(category);
      if (!genres.includes(mapped)) {
        genres.push(mapped);
      }
    }
  }

  // Get description - try Podcast Index first, then RSS feed
  let description = podcastIndexData?.description;
  const rssFeedUrl = bestMatch?.feedUrl || podcastIndexData?.url;

  if (!description && rssFeedUrl) {
    description = await fetchDescriptionFromRss(rssFeedUrl);
  }

  // Build the full details object
  const podcastWithDetails: PodcastWithDetails = {
    ...podcast,
    creator: podcast.creator || bestMatch?.artistName || podcastIndexData?.author,
    genre: podcast.genre || getPrimaryGenre(genres) || 'Uncategorized',
    description,
    coverImage: getITunesArtworkUrl(bestMatch!) || podcastIndexData?.image,
    podcastIndexId: podcastIndexData?.id,
    itunesId: bestMatch ? String(bestMatch.collectionId) : undefined,
    rssFeedUrl,
    totalEpisodes: bestMatch?.trackCount || podcastIndexData?.episodeCount,
    genres: genres.length > 0 ? genres : undefined,
    language: podcastIndexData?.language,
    publisher: bestMatch?.artistName,
    websiteUrl: podcastIndexData?.link,
    ratings,
  };

  cache.set(cacheKey, podcastWithDetails);
  return podcastWithDetails;
}

// Fetch details for multiple podcasts with batching
export async function fetchPodcastsDetails(podcasts: Podcast[]): Promise<PodcastWithDetails[]> {
  const results: PodcastWithDetails[] = [];
  const BATCH_SIZE = 3;

  for (let i = 0; i < podcasts.length; i += BATCH_SIZE) {
    const batch = podcasts.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(podcast => fetchPodcastDetails(podcast))
    );
    results.push(...batchResults);
  }

  return results;
}

// Fetch description from RSS feed
async function fetchDescriptionFromRss(feedUrl: string): Promise<string | undefined> {
  try {
    const response = await rateLimitedFetch(feedUrl);
    if (!response || !response.ok) return undefined;

    const text = await response.text();

    // Parse the RSS XML to extract description
    // Look for <description> or <itunes:summary> tags
    const descriptionMatch = text.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
    const summaryMatch = text.match(/<itunes:summary>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/itunes:summary>/i);

    let description = summaryMatch?.[1] || descriptionMatch?.[1];

    if (description) {
      // Clean up HTML entities and tags
      description = description
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();

      // Limit length
      if (description.length > 1000) {
        description = description.slice(0, 1000) + '...';
      }

      return description;
    }

    return undefined;
  } catch (error) {
    console.error(`Error fetching RSS description from ${feedUrl}:`, error);
    return undefined;
  }
}

// Search podcasts and return results for selection (used in AddPodcastModal)
export interface PodcastSearchResult {
  itunesId: string;
  title: string;
  creator?: string;
  coverImage?: string;
  description?: string;
  episodeCount?: number;
  genres?: string[];
  feedUrl?: string;
}

export async function searchPodcastsForSelection(query: string): Promise<PodcastSearchResult[]> {
  const results = await searchITunesPodcasts(query);

  return results.slice(0, 15).map(result => ({
    itunesId: String(result.collectionId),
    title: result.collectionName || result.trackName,
    creator: result.artistName,
    coverImage: getITunesArtworkUrl(result, 100),
    episodeCount: result.trackCount,
    genres: result.genres?.filter(g => g !== 'Podcasts').map(g => mapITunesGenre(g)),
    feedUrl: result.feedUrl,
  }));
}

// Fetch podcast description from RSS feed (called separately to avoid slowing search)
export async function fetchPodcastDescription(feedUrl: string): Promise<string | undefined> {
  return fetchDescriptionFromRss(feedUrl);
}
