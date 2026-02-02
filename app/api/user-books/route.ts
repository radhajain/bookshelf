import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/user-books - Get current user's bookshelf
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_books')
    .select(`
      *,
      book:books(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/user-books - Add book to user's shelf
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { book_id, bookId, title, author, genre, notes, priority } = body;

  let finalBookId = book_id || bookId;

  // If no book_id provided, find or create the book first
  if (!finalBookId && title) {
    // Try to find existing book (case-insensitive)
    let existingBookQuery = supabase
      .from('books')
      .select('id, genre')
      .ilike('title', title);

    if (author) {
      existingBookQuery = existingBookQuery.ilike('author', author);
    } else {
      existingBookQuery = existingBookQuery.is('author', null);
    }

    const { data: existingBook } = await existingBookQuery.single();

    if (existingBook) {
      finalBookId = existingBook.id;
      // Update genre on existing book if provided and book doesn't have one set
      if (genre && genre !== 'Uncategorized' && (!existingBook.genre || existingBook.genre === 'Uncategorized')) {
        await supabase
          .from('books')
          .update({ genre })
          .eq('id', existingBook.id);
      }
    } else {
      // Create new book with genre
      const { data: newBook, error: bookError } = await supabase
        .from('books')
        .insert({
          title,
          author: author || null,
          genre: genre || 'Uncategorized',
        })
        .select('id')
        .single();

      if (bookError) {
        // Handle race condition - another request created it
        if (bookError.code === '23505') {
          let refetchQuery = supabase
            .from('books')
            .select('id')
            .ilike('title', title);

          if (author) {
            refetchQuery = refetchQuery.ilike('author', author);
          } else {
            refetchQuery = refetchQuery.is('author', null);
          }

          const { data: book } = await refetchQuery.single();
          finalBookId = book?.id;
        } else {
          return NextResponse.json({ error: bookError.message }, { status: 500 });
        }
      } else {
        finalBookId = newBook.id;
      }
    }
  }

  if (!finalBookId) {
    return NextResponse.json({ error: 'book_id or title is required' }, { status: 400 });
  }

  // Add to user's shelf (genre is now on the book, not user_books)
  const { data, error } = await supabase
    .from('user_books')
    .insert({
      user_id: user.id,
      book_id: finalBookId,
      notes: notes || null,
      priority: priority || null,
    })
    .select(`
      *,
      book:books(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Book already in your shelf' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// PATCH /api/user-books - Update user book (expects ?id=xxx)
export async function PATCH(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const body = await request.json();
  const { notes, priority, read, read_at, reading_status } = body;

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (notes !== undefined) updateData.notes = notes;
  if (priority !== undefined) updateData.priority = priority;
  if (read !== undefined) updateData.read = read;
  if (read_at !== undefined) updateData.read_at = read_at;
  if (reading_status !== undefined) updateData.reading_status = reading_status;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_books')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      book:books(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/user-books - Remove book from shelf (expects ?id=xxx)
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_books')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
