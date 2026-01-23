import { Book, BookWithDetails, RatingSource } from './books';

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
    pageCount?: number;
    publishedDate?: string;
    publisher?: string;
    categories?: string[];
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  first_sentence?: string[];
  number_of_pages_median?: number;
  subject?: string[];
  first_publish_year?: number;
  ratings_average?: number;
  ratings_count?: number;
}

interface OpenLibraryResponse {
  numFound: number;
  docs: OpenLibraryDoc[];
}

interface OpenLibraryRatingsResponse {
  summary: {
    average?: number;
    count?: number;
  };
}

// Standard genre categories for the bookshelf
const GENRE_CATEGORIES = [
  'Fiction',
  'Non-Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Thriller',
  'Romance',
  'Horror',
  'Biography',
  'History',
  'Science',
  'Self-Help',
  'Business',
  'Philosophy',
  'Poetry',
  'Children',
  'Young Adult',
  'Classics',
  'Graphic Novel',
  'Cookbook',
  'Travel',
  'Art',
  'Music',
  'Sports',
  'Religion',
  'Technology',
  'Health',
  'True Crime',
  'Humor',
  'Drama',
] as const;

// Map common subject keywords to genres
const SUBJECT_TO_GENRE_MAP: Record<string, string> = {
  // Fiction genres
  'fiction': 'Fiction',
  'novel': 'Fiction',
  'literary fiction': 'Fiction',
  'science fiction': 'Science Fiction',
  'sci-fi': 'Science Fiction',
  'scifi': 'Science Fiction',
  'space opera': 'Science Fiction',
  'dystopian': 'Science Fiction',
  'cyberpunk': 'Science Fiction',
  'fantasy': 'Fantasy',
  'epic fantasy': 'Fantasy',
  'urban fantasy': 'Fantasy',
  'magic': 'Fantasy',
  'dragons': 'Fantasy',
  'mystery': 'Mystery',
  'detective': 'Mystery',
  'crime fiction': 'Mystery',
  'whodunit': 'Mystery',
  'thriller': 'Thriller',
  'suspense': 'Thriller',
  'psychological thriller': 'Thriller',
  'espionage': 'Thriller',
  'romance': 'Romance',
  'love stories': 'Romance',
  'romantic': 'Romance',
  'horror': 'Horror',
  'scary': 'Horror',
  'supernatural': 'Horror',
  'ghost stories': 'Horror',
  'vampires': 'Horror',
  // Non-fiction genres
  'non-fiction': 'Non-Fiction',
  'nonfiction': 'Non-Fiction',
  'biography': 'Biography',
  'autobiography': 'Biography',
  'memoir': 'Biography',
  'biographies': 'Biography',
  'history': 'History',
  'historical': 'History',
  'world history': 'History',
  'military history': 'History',
  'science': 'Science',
  'popular science': 'Science',
  'physics': 'Science',
  'biology': 'Science',
  'chemistry': 'Science',
  'astronomy': 'Science',
  'self-help': 'Self-Help',
  'self help': 'Self-Help',
  'personal development': 'Self-Help',
  'motivation': 'Self-Help',
  'business': 'Business',
  'economics': 'Business',
  'management': 'Business',
  'entrepreneurship': 'Business',
  'finance': 'Business',
  'investing': 'Business',
  'philosophy': 'Philosophy',
  'philosophical': 'Philosophy',
  'ethics': 'Philosophy',
  'poetry': 'Poetry',
  'poems': 'Poetry',
  'verse': 'Poetry',
  'children': 'Children',
  "children's": 'Children',
  'juvenile': 'Children',
  'picture books': 'Children',
  'young adult': 'Young Adult',
  'ya': 'Young Adult',
  'teen': 'Young Adult',
  'teenagers': 'Young Adult',
  'classics': 'Classics',
  'classic literature': 'Classics',
  'literary classics': 'Classics',
  'graphic novel': 'Graphic Novel',
  'graphic novels': 'Graphic Novel',
  'comics': 'Graphic Novel',
  'manga': 'Graphic Novel',
  'cookbook': 'Cookbook',
  'cooking': 'Cookbook',
  'recipes': 'Cookbook',
  'culinary': 'Cookbook',
  'travel': 'Travel',
  'travel writing': 'Travel',
  'adventure travel': 'Travel',
  'art': 'Art',
  'art history': 'Art',
  'painting': 'Art',
  'photography': 'Art',
  'music': 'Music',
  'musicians': 'Music',
  'rock music': 'Music',
  'sports': 'Sports',
  'athletics': 'Sports',
  'football': 'Sports',
  'baseball': 'Sports',
  'basketball': 'Sports',
  'religion': 'Religion',
  'spirituality': 'Religion',
  'christianity': 'Religion',
  'buddhism': 'Religion',
  'islam': 'Religion',
  'technology': 'Technology',
  'computers': 'Technology',
  'programming': 'Technology',
  'software': 'Technology',
  'artificial intelligence': 'Technology',
  'health': 'Health',
  'wellness': 'Health',
  'medicine': 'Health',
  'fitness': 'Health',
  'nutrition': 'Health',
  'true crime': 'True Crime',
  'crime': 'True Crime',
  'murder': 'True Crime',
  'humor': 'Humor',
  'comedy': 'Humor',
  'funny': 'Humor',
  'satire': 'Humor',
  'drama': 'Drama',
  'plays': 'Drama',
  'theatre': 'Drama',
  'theater': 'Drama',
};

// Deduce genre from subjects/categories
function deduceGenreFromSubjects(subjects?: string[]): string | undefined {
  if (!subjects || subjects.length === 0) return undefined;

  // Normalize and check each subject against our mapping
  for (const subject of subjects) {
    const normalized = subject.toLowerCase().trim();

    // Direct match
    if (SUBJECT_TO_GENRE_MAP[normalized]) {
      return SUBJECT_TO_GENRE_MAP[normalized];
    }

    // Partial match - check if any key is contained in the subject
    for (const [key, genre] of Object.entries(SUBJECT_TO_GENRE_MAP)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return genre;
      }
    }
  }

  return undefined;
}

// In-memory cache to avoid repeated API calls
const cache = new Map<string, BookWithDetails>();

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

async function rateLimitedFetch(url: string): Promise<Response | null> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JackBookshelf/1.0 (book reading list app)',
      },
    });

    // Handle rate limiting (429) - throw error so UI can pause
    if (response.status === 429) {
      throw new RateLimitError('Rate limited by API. Please wait before continuing.');
    }

    // Server errors - just return null and continue with other books
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

// Get the best available cover image URL from Google Books
function getBestCoverUrl(imageLinks?: GoogleBooksVolume['volumeInfo']['imageLinks']): string | undefined {
  if (!imageLinks) return undefined;

  const url = imageLinks.medium || imageLinks.small || imageLinks.thumbnail || imageLinks.smallThumbnail;

  if (url) {
    return url
      .replace('http://', 'https://')
      .replace('zoom=1', 'zoom=2')
      .replace('&edge=curl', '');
  }

  return undefined;
}

// Generate Goodreads search URL
function getGoodreadsUrl(title: string, author?: string): string {
  const query = encodeURIComponent(author ? `${title} ${author}` : title);
  return `https://www.goodreads.com/search?q=${query}`;
}

// Generate Amazon search URL
function getAmazonUrl(title: string, author?: string): string {
  const query = encodeURIComponent(author ? `${title} ${author}` : title);
  return `https://www.amazon.com/s?k=${query}&i=stripbooks`;
}

// Extract ISBN from Google Books response
function extractIsbn(identifiers?: Array<{ type: string; identifier: string }>): string | undefined {
  if (!identifiers) return undefined;
  const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
  const isbn10 = identifiers.find(id => id.type === 'ISBN_10');
  return isbn13?.identifier || isbn10?.identifier;
}

// Fetch from Google Books API
async function fetchGoogleBooks(title: string, author?: string): Promise<{
  description?: string;
  rating?: RatingSource;
  coverImage?: string;
  isbn?: string;
  publishedDate?: string;
  publisher?: string;
  subjects?: string[];
  foundAuthor?: string;
}> {
  try {
    const searchTerms = [title];
    if (author) {
      searchTerms.push(`inauthor:${author}`);
    }
    const query = encodeURIComponent(searchTerms.join(' '));

    const response = await rateLimitedFetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=1`
    );

    if (!response || !response.ok) return {};

    const data: GoogleBooksResponse = await response.json();

    if (data.items && data.items.length > 0) {
      const volumeInfo = data.items[0].volumeInfo;
      const rating: RatingSource | undefined = volumeInfo.averageRating
        ? {
            source: 'Google Books',
            rating: volumeInfo.averageRating,
            ratingsCount: volumeInfo.ratingsCount,
            url: `https://books.google.com/books?id=${data.items[0].id}`,
          }
        : undefined;

      return {
        description: volumeInfo.description,
        rating,
        coverImage: getBestCoverUrl(volumeInfo.imageLinks),
        isbn: extractIsbn(volumeInfo.industryIdentifiers),
        publishedDate: volumeInfo.publishedDate,
        publisher: volumeInfo.publisher,
        subjects: volumeInfo.categories,
        foundAuthor: volumeInfo.authors?.[0],
      };
    }
  } catch (error) {
    console.error(`Error fetching Google Books for "${title}":`, error);
  }

  return {};
}

// Fetch from Open Library API
async function fetchOpenLibrary(title: string, author?: string): Promise<{
  description?: string;
  rating?: RatingSource;
  coverImage?: string;
  isbn?: string;
  subjects?: string[];
  workKey?: string;
}> {
  try {
    const query = encodeURIComponent(author ? `${title} ${author}` : title);
    const response = await rateLimitedFetch(
      `https://openlibrary.org/search.json?q=${query}&limit=1&fields=key,title,author_name,cover_i,isbn,first_sentence,subject,ratings_average,ratings_count`
    );

    if (!response || !response.ok) return {};

    const data: OpenLibraryResponse = await response.json();

    if (data.docs && data.docs.length > 0) {
      const doc = data.docs[0];

      let coverImage: string | undefined;
      if (doc.cover_i) {
        coverImage = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      } else if (doc.isbn && doc.isbn.length > 0) {
        coverImage = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
      }

      const rating: RatingSource | undefined = doc.ratings_average
        ? {
            source: 'Open Library',
            rating: doc.ratings_average,
            ratingsCount: doc.ratings_count,
            url: `https://openlibrary.org${doc.key}`,
          }
        : undefined;

      return {
        description: doc.first_sentence?.join(' '),
        rating,
        coverImage,
        isbn: doc.isbn?.[0],
        subjects: doc.subject?.slice(0, 5),
        workKey: doc.key,
      };
    }
  } catch (error) {
    console.error(`Error fetching Open Library for "${title}":`, error);
  }

  return {};
}

// Try to fetch Open Library ratings separately if we have a work key
async function fetchOpenLibraryRatings(workKey: string): Promise<RatingSource | undefined> {
  try {
    const response = await rateLimitedFetch(
      `https://openlibrary.org${workKey}/ratings.json`
    );

    if (!response || !response.ok) return undefined;

    const data: OpenLibraryRatingsResponse = await response.json();

    if (data.summary?.average) {
      return {
        source: 'Open Library',
        rating: data.summary.average,
        ratingsCount: data.summary.count,
        url: `https://openlibrary.org${workKey}`,
      };
    }
  } catch (error) {
    // Silently fail - ratings endpoint may not exist for all works
  }

  return undefined;
}

// Extract the last name from an author name
// Handles various formats: "First Last", "First Middle Last", "F. A. Last", "First von Last", etc.
function extractLastName(authorName: string): string {
  const name = authorName.trim();

  // Common name prefixes that are part of the last name (von, van, de, etc.)
  const lastNamePrefixes = ['von', 'van', 'de', 'du', 'la', 'le', 'del', 'della', 'di', 'da', 'dos', 'das', 'mc', 'mac', "o'"];

  // Split by spaces
  const parts = name.split(/\s+/).filter(p => p.length > 0);

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].toLowerCase();

  // Check if the second-to-last word is a prefix
  const lastPart = parts[parts.length - 1].toLowerCase();
  if (parts.length >= 2) {
    const secondToLast = parts[parts.length - 2].toLowerCase();
    if (lastNamePrefixes.includes(secondToLast)) {
      return `${secondToLast} ${lastPart}`;
    }
  }

  return lastPart;
}

// Check if two authors are likely the same person based on last name
function isSameAuthor(author1: string, author2: string): boolean {
  const lastName1 = extractLastName(author1);
  const lastName2 = extractLastName(author2);
  return lastName1 === lastName2;
}

// Check if a title is a summary/abridged/study guide version
function isSummaryOrDerivative(itemTitle: string, searchTitle: string): boolean {
  const lowerTitle = itemTitle.toLowerCase();
  const summaryIndicators = [
    'summary of',
    'summary:',
    'study guide',
    'workbook',
    'companion',
    'cliff notes',
    'cliffnotes',
    'sparknotes',
    'analysis of',
    'review of',
    'guide to',
    'abridged',
    'condensed',
    'quick read',
    'key takeaways',
    'book summary',
    'in minutes',
    'speed read',
  ];

  return summaryIndicators.some(indicator => lowerTitle.includes(indicator));
}

// Search for authors by title - returns the best author match
// Prioritizes by popularity (ratings count), ignores summaries/derivatives
// Only flags for clarification if authors are very different AND popularity is similar
export async function searchBookAuthors(title: string): Promise<{ authors: string[]; hasMultipleDistinctAuthors: boolean }> {
  try {
    const query = encodeURIComponent(title);
    const response = await rateLimitedFetch(
      `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=20`
    );

    if (!response || !response.ok) return { authors: [], hasMultipleDistinctAuthors: false };

    interface GoogleBooksSearchResponse {
      totalItems: number;
      items?: Array<{
        volumeInfo: {
          title: string;
          authors?: string[];
          ratingsCount?: number;
        };
      }>;
    }

    const data: GoogleBooksSearchResponse = await response.json();

    if (!data.items || data.items.length === 0) return { authors: [], hasMultipleDistinctAuthors: false };

    const normalizedTitle = title.toLowerCase().trim();

    // Filter and process results
    const validItems: Array<{
      title: string;
      author: string;
      lastName: string;
      ratingsCount: number;
    }> = [];

    for (const item of data.items) {
      const itemTitle = item.volumeInfo.title;
      const lowerItemTitle = itemTitle.toLowerCase().trim();

      // Skip if title doesn't match
      const titleMatches = lowerItemTitle === normalizedTitle ||
                          lowerItemTitle.includes(normalizedTitle) ||
                          normalizedTitle.includes(lowerItemTitle);
      if (!titleMatches) continue;

      // Skip summaries and derivative works
      if (isSummaryOrDerivative(itemTitle, title)) continue;

      // Skip if no author
      if (!item.volumeInfo.authors || item.volumeInfo.authors.length === 0) continue;

      const author = item.volumeInfo.authors[0];
      const lastName = extractLastName(author);
      const ratingsCount = item.volumeInfo.ratingsCount || 0;

      validItems.push({
        title: itemTitle,
        author,
        lastName,
        ratingsCount,
      });
    }

    if (validItems.length === 0) return { authors: [], hasMultipleDistinctAuthors: false };

    // Group by last name, tracking total ratings for each
    const authorsByLastName = new Map<string, { author: string; totalRatings: number; maxRatings: number }>();

    for (const item of validItems) {
      const existing = authorsByLastName.get(item.lastName);
      if (!existing) {
        authorsByLastName.set(item.lastName, {
          author: item.author,
          totalRatings: item.ratingsCount,
          maxRatings: item.ratingsCount,
        });
      } else {
        existing.totalRatings += item.ratingsCount;
        if (item.ratingsCount > existing.maxRatings) {
          existing.maxRatings = item.ratingsCount;
        }
        // Keep the longer (more complete) name
        if (item.author.length > existing.author.length) {
          existing.author = item.author;
        }
      }
    }

    // Convert to array and sort by total ratings (descending)
    const sortedAuthors = Array.from(authorsByLastName.entries())
      .map(([lastName, data]) => ({
        lastName,
        author: data.author,
        totalRatings: data.totalRatings,
        maxRatings: data.maxRatings,
      }))
      .sort((a, b) => b.totalRatings - a.totalRatings);

    if (sortedAuthors.length === 0) return { authors: [], hasMultipleDistinctAuthors: false };

    // If only one distinct author (by last name), return it
    if (sortedAuthors.length === 1) {
      return { authors: [sortedAuthors[0].author], hasMultipleDistinctAuthors: false };
    }

    // Multiple distinct authors - check if we should auto-select the most popular
    const mostPopular = sortedAuthors[0];
    const secondMostPopular = sortedAuthors[1];

    // If the most popular has significantly more ratings (3x or more), auto-select it
    // Or if the most popular has ratings and others don't
    const popularityRatio = secondMostPopular.totalRatings > 0
      ? mostPopular.totalRatings / secondMostPopular.totalRatings
      : Infinity;

    // Auto-select if:
    // 1. Most popular has 3x+ the ratings of second place, OR
    // 2. Most popular has ratings and second place has none, OR
    // 3. Most popular has 100+ ratings and second has < 20
    const shouldAutoSelect =
      popularityRatio >= 3 ||
      (mostPopular.totalRatings > 0 && secondMostPopular.totalRatings === 0) ||
      (mostPopular.totalRatings >= 100 && secondMostPopular.totalRatings < 20);

    if (shouldAutoSelect) {
      return { authors: [mostPopular.author], hasMultipleDistinctAuthors: false };
    }

    // Ratings are similar - need user clarification
    // Return all authors sorted by popularity
    return {
      authors: sortedAuthors.map(a => a.author),
      hasMultipleDistinctAuthors: true,
    };
  } catch (error) {
    console.error(`Error searching authors for "${title}":`, error);
    return { authors: [], hasMultipleDistinctAuthors: false };
  }
}

export async function fetchBookDetails(book: Book): Promise<BookWithDetails> {
  const cacheKey = `${book.title}-${book.author || ''}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  // Fetch from both sources in parallel
  const [googleData, openLibraryData] = await Promise.all([
    fetchGoogleBooks(book.title, book.author),
    fetchOpenLibrary(book.title, book.author),
  ]);

  // Collect ratings from all sources
  const ratings: RatingSource[] = [];

  if (googleData.rating) {
    ratings.push(googleData.rating);
  }

  if (openLibraryData.rating) {
    ratings.push(openLibraryData.rating);
  } else if (openLibraryData.workKey) {
    // Try to get ratings separately
    const olRating = await fetchOpenLibraryRatings(openLibraryData.workKey);
    if (olRating) {
      ratings.push(olRating);
    }
  }

  // Add Goodreads and Amazon as link-only sources (they don't have public APIs)
  const goodreadsUrl = getGoodreadsUrl(book.title, book.author || googleData.foundAuthor);
  const amazonUrl = getAmazonUrl(book.title, book.author || googleData.foundAuthor);

  ratings.push({
    source: 'Goodreads',
    url: goodreadsUrl,
  });

  ratings.push({
    source: 'Amazon',
    url: amazonUrl,
  });

  // Combine all subjects for genre deduction
  const allSubjects = [
    ...(googleData.subjects || []),
    ...(openLibraryData.subjects || []),
  ];

  // Deduce genre from subjects (will be used to set book.genre if not already set)
  const deducedGenre = deduceGenreFromSubjects(allSubjects);

  // Merge data, preferring Google Books for description, but using Open Library for cover if needed
  const bookWithDetails: BookWithDetails = {
    ...book,
    author: book.author || googleData.foundAuthor,
    description: googleData.description || openLibraryData.description,
    ratings,
    coverImage: googleData.coverImage || openLibraryData.coverImage,
    isbn: googleData.isbn || openLibraryData.isbn,
    publishedDate: googleData.publishedDate,
    publisher: googleData.publisher,
    subjects: googleData.subjects || openLibraryData.subjects,
    goodreadsUrl,
    amazonUrl,
    deducedGenre,
  };

  cache.set(cacheKey, bookWithDetails);
  return bookWithDetails;
}
