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

// In-memory cache to avoid repeated API calls
const cache = new Map<string, BookWithDetails>();

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 150; // 150ms between requests

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();
  return fetch(url, {
    headers: {
      'User-Agent': 'JackBookshelf/1.0 (book reading list app)',
    },
  });
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

    if (!response.ok) return {};

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

    if (!response.ok) return {};

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

    if (!response.ok) return undefined;

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
