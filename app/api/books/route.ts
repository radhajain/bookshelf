import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/books - Get all books in library with optional search
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const genre = searchParams.get('genre');

  const supabase = await createClient();

  // Get current user to check which books they already have
  const { data: { user } } = await supabase.auth.getUser();

  let dbQuery = supabase.from('books').select('*').order('title');

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,author.ilike.%${query}%`);
  }

  if (genre && genre !== 'all') {
    dbQuery = dbQuery.eq('genre', genre);
  }

  const { data: books, error } = await dbQuery.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If user is logged in, get their book IDs to mark which ones they have
  let userBookIds: string[] = [];
  if (user) {
    const { data: userBooks } = await supabase
      .from('user_books')
      .select('book_id')
      .eq('user_id', user.id);

    userBookIds = userBooks?.map(ub => ub.book_id) || [];
  }

  // Add inMyShelf flag to each book
  const booksWithShelfStatus = books?.map(book => ({
    ...book,
    inMyShelf: userBookIds.includes(book.id),
  })) || [];

  // Get unique genres for filtering
  const { data: genreData } = await supabase
    .from('books')
    .select('genre')
    .not('genre', 'is', null);

  const genres = [...new Set(genreData?.map(b => b.genre).filter(Boolean) || [])].sort();

  return NextResponse.json({ books: booksWithShelfStatus, genres });
}

// POST /api/books - Find or create book in shared catalog
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, author } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // First, try to find existing book
  let existingBookQuery = supabase
    .from('books')
    .select('*')
    .eq('title', title);

  if (author) {
    existingBookQuery = existingBookQuery.eq('author', author);
  } else {
    existingBookQuery = existingBookQuery.is('author', null);
  }

  const { data: existingBook } = await existingBookQuery.single();

  if (existingBook) {
    return NextResponse.json(existingBook);
  }

  // Create new book in catalog
  const { data: newBook, error } = await supabase
    .from('books')
    .insert({
      title,
      author: author || null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === '23505') {
      let refetchQuery = supabase
        .from('books')
        .select('*')
        .eq('title', title);

      if (author) {
        refetchQuery = refetchQuery.eq('author', author);
      } else {
        refetchQuery = refetchQuery.is('author', null);
      }

      const { data: book } = await refetchQuery.single();
      return NextResponse.json(book);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newBook, { status: 201 });
}
