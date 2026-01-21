import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { fetchBookDetails, RateLimitError } from '@/app/lib/bookApi';

// GET - Fetch cached details or fetch fresh if not cached
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
      .select('*')
      .eq('id', id)
      .single();

    if (error || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // If we already have cached details, return them
    if (book.details_fetched_at) {
      return NextResponse.json({ book, cached: true });
    }

    // Fetch fresh details from APIs (first time only)
    const bookForApi = {
      id: book.id,
      title: book.title,
      author: book.author || undefined,
      genre: 'Uncategorized',
    };

    const details = await fetchBookDetails(bookForApi);

    // If no genre was deduced from subjects, try LLM fallback
    let suggestedGenre = details.suggestedGenre;
    if (!suggestedGenre && (details.description || details.subjects)) {
      try {
        const baseUrl = request.nextUrl.origin;
        const genreResponse = await fetch(`${baseUrl}/api/deduce-genre`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: book.title,
            author: book.author,
            description: details.description,
            subjects: details.subjects,
          }),
        });
        if (genreResponse.ok) {
          const { genre } = await genreResponse.json();
          suggestedGenre = genre;
        }
      } catch (error) {
        console.error('Error calling genre deduction API:', error);
      }
    }

    // Update book with fetched details
    const updateData = {
      cover_image: details.coverImage || book.cover_image,
      description: details.description || book.description,
      isbn: details.isbn || book.isbn,
      published_date: details.publishedDate || book.published_date,
      publisher: details.publisher || book.publisher,
      page_count: details.pages || book.page_count,
      google_rating: details.ratings?.find(r => r.source === 'Google Books')?.rating || null,
      google_ratings_count: details.ratings?.find(r => r.source === 'Google Books')?.ratingsCount || null,
      open_library_rating: details.ratings?.find(r => r.source === 'Open Library')?.rating || null,
      open_library_ratings_count: details.ratings?.find(r => r.source === 'Open Library')?.ratingsCount || null,
      goodreads_url: details.goodreadsUrl || null,
      amazon_url: details.amazonUrl || null,
      subjects: details.subjects || null,
      suggested_genre: suggestedGenre || null,
      details_fetched_at: new Date().toISOString(),
    };

    const { data: updatedBook, error: updateError } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating book details:', updateError);
      // Return the fetched details anyway
      return NextResponse.json({ book: { ...book, ...updateData }, cached: false });
    }

    return NextResponse.json({ book: updatedBook, cached: false });
  } catch (error) {
    // Check if it's a rate limit error
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('Error fetching book details:', error);
    return NextResponse.json({ error: 'Failed to fetch book details' }, { status: 500 });
  }
}

// POST - Force refresh book details
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch book from database
    const { data: book, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Fetch fresh details from APIs (force refresh)
    const bookForApi = {
      id: book.id,
      title: book.title,
      author: book.author || undefined,
      genre: 'Uncategorized',
    };

    const details = await fetchBookDetails(bookForApi);

    // If no genre was deduced from subjects, try LLM fallback
    let suggestedGenre = details.suggestedGenre;
    if (!suggestedGenre && (details.description || details.subjects)) {
      try {
        const baseUrl = request.nextUrl.origin;
        const genreResponse = await fetch(`${baseUrl}/api/deduce-genre`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: book.title,
            author: book.author,
            description: details.description,
            subjects: details.subjects,
          }),
        });
        if (genreResponse.ok) {
          const { genre } = await genreResponse.json();
          suggestedGenre = genre;
        }
      } catch (error) {
        console.error('Error calling genre deduction API:', error);
      }
    }

    // Update book with fetched details
    const updateData = {
      cover_image: details.coverImage || null,
      description: details.description || null,
      isbn: details.isbn || null,
      published_date: details.publishedDate || null,
      publisher: details.publisher || null,
      page_count: details.pages || null,
      google_rating: details.ratings?.find(r => r.source === 'Google Books')?.rating || null,
      google_ratings_count: details.ratings?.find(r => r.source === 'Google Books')?.ratingsCount || null,
      open_library_rating: details.ratings?.find(r => r.source === 'Open Library')?.rating || null,
      open_library_ratings_count: details.ratings?.find(r => r.source === 'Open Library')?.ratingsCount || null,
      goodreads_url: details.goodreadsUrl || null,
      amazon_url: details.amazonUrl || null,
      subjects: details.subjects || null,
      suggested_genre: suggestedGenre || null,
      details_fetched_at: new Date().toISOString(),
    };

    const { data: updatedBook, error: updateError } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating book details:', updateError);
      return NextResponse.json({ error: 'Failed to update book details' }, { status: 500 });
    }

    return NextResponse.json({ book: updatedBook, refreshed: true });
  } catch (error) {
    // Check if it's a rate limit error
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('Error refreshing book details:', error);
    return NextResponse.json({ error: 'Failed to refresh book details' }, { status: 500 });
  }
}
