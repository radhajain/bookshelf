import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/user-movies - Get current user's movie collection
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_movies')
    .select(`
      *,
      movie:movies(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/user-movies - Add movie to user's shelf
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { movie_id, movieId, title, director, year, tmdb_id, genre, notes, priority, watched } = body;

  let finalMovieId = movie_id || movieId;

  // If no movie_id provided, find or create the movie first
  if (!finalMovieId && title) {
    // Try to find existing movie by TMDB ID first
    if (tmdb_id) {
      const { data: existingByTmdb } = await supabase
        .from('movies')
        .select('id, genres')
        .eq('tmdb_id', tmdb_id)
        .single();

      if (existingByTmdb) {
        finalMovieId = existingByTmdb.id;
      }
    }

    // If not found by TMDB ID, try title + director + year
    if (!finalMovieId) {
      let existingQuery = supabase
        .from('movies')
        .select('id, genres')
        .eq('title', title);

      if (director) {
        existingQuery = existingQuery.eq('director', director);
      }
      if (year) {
        existingQuery = existingQuery.eq('year', year);
      }

      const { data: existingMovie } = await existingQuery.maybeSingle();

      if (existingMovie) {
        finalMovieId = existingMovie.id;
      } else {
        // Create new movie
        const { data: newMovie, error: movieError } = await supabase
          .from('movies')
          .insert({
            title,
            director: director || null,
            year: year || null,
            tmdb_id: tmdb_id || null,
            genres: genre ? [genre] : null,
          })
          .select('id')
          .single();

        if (movieError) {
          // Handle race condition - another request created it
          if (movieError.code === '23505') {
            let refetchQuery = supabase
              .from('movies')
              .select('id')
              .eq('title', title);

            if (tmdb_id) {
              refetchQuery = supabase
                .from('movies')
                .select('id')
                .eq('tmdb_id', tmdb_id);
            }

            const { data: movie } = await refetchQuery.maybeSingle();
            finalMovieId = movie?.id;
          } else {
            return NextResponse.json({ error: movieError.message }, { status: 500 });
          }
        } else {
          finalMovieId = newMovie.id;
        }
      }
    }
  }

  if (!finalMovieId) {
    return NextResponse.json({ error: 'movie_id or title is required' }, { status: 400 });
  }

  // Add to user's collection
  const { data, error } = await supabase
    .from('user_movies')
    .insert({
      user_id: user.id,
      movie_id: finalMovieId,
      genre: genre || null,
      notes: notes || null,
      priority: priority || null,
      watched: watched || false,
    })
    .select(`
      *,
      movie:movies(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Movie already in your collection' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/user-movies - Remove movie from collection (expects ?id=xxx)
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
    .from('user_movies')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/user-movies - Update user movie (watched status, notes, etc.)
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
  const { watched, watched_at, notes, priority, rating, genre } = body;

  const updateData: Record<string, unknown> = {};
  if (watched !== undefined) updateData.watched = watched;
  if (watched_at !== undefined) updateData.watched_at = watched_at;
  if (notes !== undefined) updateData.notes = notes;
  if (priority !== undefined) updateData.priority = priority;
  if (rating !== undefined) updateData.rating = rating;
  if (genre !== undefined) updateData.genre = genre;

  const { data, error } = await supabase
    .from('user_movies')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      movie:movies(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
