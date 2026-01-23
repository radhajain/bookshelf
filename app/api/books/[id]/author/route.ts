import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// PUT - Update book's author and clear the needs_author_clarification flag
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
    const { author, coverImage } = body;

    if (!author || typeof author !== 'string') {
      return NextResponse.json({ error: 'Author is required' }, { status: 400 });
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

    // Update the book with the new author and clear the clarification flag
    // Also save the cover image if provided from the search results
    // Also clear details_fetched_at so the book details will be re-fetched with the correct author
    const updateData: Record<string, unknown> = {
      author: author.trim(),
      needs_author_clarification: false,
      details_fetched_at: null, // Clear so details get re-fetched with correct author
    };

    // If a cover image was provided from the search, save it
    if (coverImage && typeof coverImage === 'string') {
      updateData.cover_image = coverImage;
    }

    const { data: updatedBook, error: updateError } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating book author:', updateError);
      return NextResponse.json({ error: 'Failed to update author' }, { status: 500 });
    }

    return NextResponse.json({ book: updatedBook });
  } catch (error) {
    console.error('Error in PUT /api/books/[id]/author:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
