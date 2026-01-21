import { NextRequest, NextResponse } from 'next/server';

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    publishedDate?: string;
    publisher?: string;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

interface BookSearchResult {
  googleId: string;
  title: string;
  author?: string;
  description?: string;
  coverImage?: string;
  publishedDate?: string;
  publisher?: string;
}

// GET /api/books/search?q=title - Search for books by title
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    // Search Google Books API
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodedQuery}&maxResults=10`,
      {
        headers: {
          'User-Agent': 'JackBookshelf/1.0 (book reading list app)',
        },
      }
    );

    if (!response.ok) {
      console.error('Google Books API error:', response.status);
      return NextResponse.json({ results: [] });
    }

    const data: GoogleBooksResponse = await response.json();

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ results: [] });
    }

    // Transform results
    const results: BookSearchResult[] = data.items.map((item) => ({
      googleId: item.id,
      title: item.volumeInfo.title,
      author: item.volumeInfo.authors?.join(', '),
      description: item.volumeInfo.description?.substring(0, 200) + (item.volumeInfo.description && item.volumeInfo.description.length > 200 ? '...' : ''),
      coverImage: item.volumeInfo.imageLinks?.thumbnail?.replace('http://', 'https://'),
      publishedDate: item.volumeInfo.publishedDate,
      publisher: item.volumeInfo.publisher,
    }));

    // Deduplicate by title + author combination
    const seen = new Set<string>();
    const uniqueResults = results.filter((book) => {
      const key = `${book.title.toLowerCase()}-${(book.author || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ results: uniqueResults });
  } catch (error) {
    console.error('Error searching books:', error);
    return NextResponse.json({ error: 'Failed to search books' }, { status: 500 });
  }
}
