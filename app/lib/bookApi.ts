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

// Fetch details for multiple books with batching
export async function fetchBooksDetails(books: Book[]): Promise<BookWithDetails[]> {
  const results: BookWithDetails[] = [];
  const BATCH_SIZE = 3; // Smaller batch size to be gentler on APIs

  for (let i = 0; i < books.length; i += BATCH_SIZE) {
    const batch = books.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(book => fetchBookDetails(book))
    );
    results.push(...batchResults);
  }

  return results;
}

// Fetch details for books by genre
export async function fetchBooksByGenre(
  booksByGenre: Record<string, Book[]>
): Promise<Record<string, BookWithDetails[]>> {
  const result: Record<string, BookWithDetails[]> = {};

  for (const [genre, books] of Object.entries(booksByGenre)) {
    result[genre] = await fetchBooksDetails(books);
  }

  return result;
}
