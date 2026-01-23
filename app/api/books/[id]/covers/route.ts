import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

interface CoverOption {
  url: string;
  source: string;
  size?: string;
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

// GET /api/books/[id]/covers - Get available cover images for a book
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch book from database
    const { data: book, error } = await supabase
      .from('books')
      .select('title, author, cover_image')
      .eq('id', id)
      .single();

    if (error || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    const covers: CoverOption[] = [];

    // Add current cover if it exists
    if (book.cover_image) {
      covers.push({
        url: book.cover_image,
        source: 'Current',
        size: 'Medium',
      });
    }

    // Search Google Books for covers
    const searchTerms = [book.title];
    if (book.author) {
      searchTerms.push(`inauthor:${book.author}`);
    }
    const query = encodeURIComponent(searchTerms.join(' '));

    try {
      const googleResponse = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=5`,
        {
          headers: {
            'User-Agent': 'JackBookshelf/1.0 (book reading list app)',
          },
        }
      );

      if (googleResponse.ok) {
        const data: GoogleBooksResponse = await googleResponse.json();
        if (data.items) {
          for (const item of data.items) {
            const imageLinks = item.volumeInfo.imageLinks;
            if (imageLinks) {
              // Get the best available image
              const url = imageLinks.medium || imageLinks.small || imageLinks.thumbnail || imageLinks.smallThumbnail;
              if (url) {
                const cleanUrl = url
                  .replace('http://', 'https://')
                  .replace('zoom=1', 'zoom=2')
                  .replace('&edge=curl', '');

                // Avoid duplicates
                if (!covers.some(c => c.url === cleanUrl)) {
                  covers.push({
                    url: cleanUrl,
                    source: 'Google Books',
                    size: imageLinks.medium ? 'Large' : imageLinks.small ? 'Medium' : 'Small',
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Google Books covers:', error);
    }

    // Search Open Library for covers
    try {
      const olQuery = encodeURIComponent(book.author ? `${book.title} ${book.author}` : book.title);
      const olResponse = await fetch(
        `https://openlibrary.org/search.json?q=${olQuery}&limit=5&fields=key,title,cover_i,isbn`,
        {
          headers: {
            'User-Agent': 'JackBookshelf/1.0 (book reading list app)',
          },
        }
      );

      if (olResponse.ok) {
        const data = await olResponse.json();
        if (data.docs) {
          for (const doc of data.docs) {
            let coverUrl: string | undefined;

            if (doc.cover_i) {
              coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
            } else if (doc.isbn && doc.isbn.length > 0) {
              coverUrl = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
            }

            if (coverUrl && !covers.some(c => c.url === coverUrl)) {
              covers.push({
                url: coverUrl,
                source: 'Open Library',
                size: 'Large',
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching Open Library covers:', error);
    }

    return NextResponse.json({ covers });
  } catch (error) {
    console.error('Error in GET /api/books/[id]/covers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/books/[id]/covers - Update book cover
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { coverUrl } = body;

    if (!coverUrl || typeof coverUrl !== 'string') {
      return NextResponse.json({ error: 'Cover URL is required' }, { status: 400 });
    }

    // Verify the book exists
    const { data: existingBook, error: fetchError } = await supabase
      .from('books')
      .select('id')
      .eq('id', id)
      .single();

    if (fetchError || !existingBook) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Update the cover image
    const { data: updatedBook, error: updateError } = await supabase
      .from('books')
      .update({ cover_image: coverUrl })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating book cover:', updateError);
      return NextResponse.json({ error: 'Failed to update cover' }, { status: 500 });
    }

    return NextResponse.json({ book: updatedBook });
  } catch (error) {
    console.error('Error in PUT /api/books/[id]/covers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
