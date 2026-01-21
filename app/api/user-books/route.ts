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
  const { book_id, title, author, genre, notes, priority } = body;

  let finalBookId = book_id;

  // If no book_id provided, find or create the book first
  if (!finalBookId && title) {
    // Try to find existing book
    const { data: existingBook } = await supabase
      .from('books')
      .select('id')
      .eq('title', title)
      .eq('author', author || '')
      .single();

    if (existingBook) {
      finalBookId = existingBook.id;
    } else {
      // Create new book
      const { data: newBook, error: bookError } = await supabase
        .from('books')
        .insert({ title, author: author || null })
        .select('id')
        .single();

      if (bookError) {
        // Handle race condition - another request created it
        if (bookError.code === '23505') {
          const { data: book } = await supabase
            .from('books')
            .select('id')
            .eq('title', title)
            .eq('author', author || '')
            .single();
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

  // Add to user's shelf
  const { data, error } = await supabase
    .from('user_books')
    .insert({
      user_id: user.id,
      book_id: finalBookId,
      genre: genre || 'Uncategorized',
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
