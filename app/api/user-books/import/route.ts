import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

interface ImportBook {
  title: string;
  author?: string;
  genre?: string;
  notes?: string;
  priority?: string;
}

// POST /api/user-books/import - Batch import books from CSV
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const books: ImportBook[] = body.books;

  if (!books || !Array.isArray(books) || books.length === 0) {
    return NextResponse.json({ error: 'books array is required' }, { status: 400 });
  }

  const results = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const book of books) {
    if (!book.title) {
      results.skipped++;
      continue;
    }

    try {
      // Find or create book in catalog
      let bookId: string;

      // Build query for existing book - handle null author properly
      let existingBookQuery = supabase
        .from('books')
        .select('id')
        .eq('title', book.title);

      if (book.author) {
        existingBookQuery = existingBookQuery.eq('author', book.author);
      } else {
        existingBookQuery = existingBookQuery.is('author', null);
      }

      const { data: existingBook } = await existingBookQuery.single();

      if (existingBook) {
        bookId = existingBook.id;
        // Update genre on existing book if provided and book doesn't have one set
        if (book.genre && book.genre !== 'Uncategorized') {
          await supabase
            .from('books')
            .update({ genre: book.genre })
            .eq('id', existingBook.id)
            .or('genre.is.null,genre.eq.Uncategorized');
        }
      } else {
        const { data: newBook, error: bookError } = await supabase
          .from('books')
          .insert({
            title: book.title,
            author: book.author || null,
            genre: book.genre || 'Uncategorized',
          })
          .select('id')
          .single();

        if (bookError) {
          // Race condition - try to fetch again
          if (bookError.code === '23505') {
            let refetchQuery = supabase
              .from('books')
              .select('id')
              .eq('title', book.title);

            if (book.author) {
              refetchQuery = refetchQuery.eq('author', book.author);
            } else {
              refetchQuery = refetchQuery.is('author', null);
            }

            const { data: refetchedBook } = await refetchQuery.single();
            if (refetchedBook) {
              bookId = refetchedBook.id;
            } else {
              results.errors.push(`Failed to import "${book.title}"`);
              continue;
            }
          } else {
            results.errors.push(`Failed to import "${book.title}": ${bookError.message}`);
            continue;
          }
        } else {
          bookId = newBook.id;
        }
      }

      // Add to user's shelf (genre is now on book, not user_books)
      const { error: userBookError } = await supabase
        .from('user_books')
        .insert({
          user_id: user.id,
          book_id: bookId,
          notes: book.notes || null,
          priority: book.priority || null,
        });

      if (userBookError) {
        if (userBookError.code === '23505') {
          results.skipped++; // Already in shelf
        } else {
          results.errors.push(`Failed to add "${book.title}" to shelf: ${userBookError.message}`);
        }
      } else {
        results.imported++;
      }
    } catch (err) {
      results.errors.push(`Unexpected error with "${book.title}"`);
    }
  }

  return NextResponse.json(results);
}
