import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { fetchBookDetails, RateLimitError, searchBookAuthors } from '@/app/lib/bookApi';

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

    // If book has no author, search for potential authors first
    let authorToUse = book.author;
    let needsAuthorClarification = false;

    if (!book.author) {
      const { authors: potentialAuthors, hasMultipleDistinctAuthors } = await searchBookAuthors(book.title);

      if (potentialAuthors.length >= 1 && !hasMultipleDistinctAuthors) {
        // Single author (or multiple variations of same author) found - auto-fill with the most complete name
        authorToUse = potentialAuthors[0];
      } else if (hasMultipleDistinctAuthors) {
        // Multiple distinct authors found (different last names) - flag for clarification
        needsAuthorClarification = true;
      }
      // If no authors found, leave author as null
    }

    // Fetch fresh details from APIs (first time only)
    const bookForApi = {
      id: book.id,
      title: book.title,
      author: authorToUse || undefined,
      genre: 'Uncategorized',
    };

    const details = await fetchBookDetails(bookForApi);

    // If no genre was deduced from subjects, try LLM fallback
    let deducedGenre = details.deducedGenre;
    if (!deducedGenre && (details.description || details.subjects)) {
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
          deducedGenre = genre;
        }
      } catch (error) {
        console.error('Error calling genre deduction API:', error);
      }
    }

    // Update book with fetched details
    // Also set genre if it's still Uncategorized and we deduced one
    const updateData: Record<string, unknown> = {
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
      details_fetched_at: new Date().toISOString(),
      needs_author_clarification: needsAuthorClarification,
    };

    // If book had no author and we found one, auto-fill it
    if (!book.author && authorToUse) {
      updateData.author = authorToUse;
    }

    // If book genre is Uncategorized and we deduced a genre, update it
    if (deducedGenre && (!book.genre || book.genre === 'Uncategorized')) {
      updateData.genre = deducedGenre;
    }

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

    // If book has no author, search for potential authors first
    let authorToUse = book.author;
    let needsAuthorClarification = false;

    if (!book.author) {
      const { authors: potentialAuthors, hasMultipleDistinctAuthors } = await searchBookAuthors(book.title);

      if (potentialAuthors.length >= 1 && !hasMultipleDistinctAuthors) {
        // Single author (or multiple variations of same author) found - auto-fill with the most complete name
        authorToUse = potentialAuthors[0];
      } else if (hasMultipleDistinctAuthors) {
        // Multiple distinct authors found (different last names) - flag for clarification
        needsAuthorClarification = true;
      }
    }

    // Fetch fresh details from APIs (force refresh)
    const bookForApi = {
      id: book.id,
      title: book.title,
      author: authorToUse || undefined,
      genre: 'Uncategorized',
    };

    const details = await fetchBookDetails(bookForApi);

    // If no genre was deduced from subjects, try LLM fallback
    let deducedGenre = details.deducedGenre;
    if (!deducedGenre && (details.description || details.subjects)) {
      try {
        const baseUrl = request.nextUrl.origin;
        const genreResponse = await fetch(`${baseUrl}/api/deduce-genre`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: book.title,
            author: authorToUse,
            description: details.description,
            subjects: details.subjects,
          }),
        });
        if (genreResponse.ok) {
          const { genre } = await genreResponse.json();
          deducedGenre = genre;
        }
      } catch (error) {
        console.error('Error calling genre deduction API:', error);
      }
    }

    // Update book with fetched details
    // Also set genre if it's still Uncategorized and we deduced one
    const updateData: Record<string, unknown> = {
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
      details_fetched_at: new Date().toISOString(),
      needs_author_clarification: needsAuthorClarification,
    };

    // If book had no author and we found one, auto-fill it
    if (!book.author && authorToUse) {
      updateData.author = authorToUse;
    }

    // If book genre is Uncategorized and we deduced a genre, update it
    if (deducedGenre && (!book.genre || book.genre === 'Uncategorized')) {
      updateData.genre = deducedGenre;
    }

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
