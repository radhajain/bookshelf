import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/user-tvshows - Get current user's TV show collection
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_tvshows')
    .select(`
      *,
      tvshow:tvshows(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/user-tvshows - Add TV show to user's shelf
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    tvshow_id,
    tvshowId,
    title,
    creator,
    first_air_date,
    tmdb_id,
    genre,
    notes,
    priority,
    watching_status
  } = body;

  let finalTVShowId = tvshow_id || tvshowId;

  // If no tvshow_id provided, find or create the TV show first
  if (!finalTVShowId && title) {
    // Try to find existing TV show by TMDB ID first
    if (tmdb_id) {
      const { data: existingByTmdb } = await supabase
        .from('tvshows')
        .select('id, genres')
        .eq('tmdb_id', tmdb_id)
        .single();

      if (existingByTmdb) {
        finalTVShowId = existingByTmdb.id;
      }
    }

    // If not found by TMDB ID, try title + creator + first_air_date
    if (!finalTVShowId) {
      let existingQuery = supabase
        .from('tvshows')
        .select('id, genres')
        .eq('title', title);

      if (creator) {
        existingQuery = existingQuery.eq('creator', creator);
      }
      if (first_air_date) {
        existingQuery = existingQuery.eq('first_air_date', first_air_date);
      }

      const { data: existingTVShow } = await existingQuery.maybeSingle();

      if (existingTVShow) {
        finalTVShowId = existingTVShow.id;
      } else {
        // Create new TV show
        const { data: newTVShow, error: tvshowError } = await supabase
          .from('tvshows')
          .insert({
            title,
            creator: creator || null,
            first_air_date: first_air_date || null,
            tmdb_id: tmdb_id || null,
            genres: genre ? [genre] : null,
          })
          .select('id')
          .single();

        if (tvshowError) {
          // Handle race condition - another request created it
          if (tvshowError.code === '23505') {
            let refetchQuery = supabase
              .from('tvshows')
              .select('id')
              .eq('title', title);

            if (tmdb_id) {
              refetchQuery = supabase
                .from('tvshows')
                .select('id')
                .eq('tmdb_id', tmdb_id);
            }

            const { data: tvshow } = await refetchQuery.maybeSingle();
            finalTVShowId = tvshow?.id;
          } else {
            return NextResponse.json({ error: tvshowError.message }, { status: 500 });
          }
        } else {
          finalTVShowId = newTVShow.id;
        }
      }
    }
  }

  if (!finalTVShowId) {
    return NextResponse.json({ error: 'tvshow_id or title is required' }, { status: 400 });
  }

  // Add to user's collection
  const { data, error } = await supabase
    .from('user_tvshows')
    .insert({
      user_id: user.id,
      tvshow_id: finalTVShowId,
      genre: genre || null,
      notes: notes || null,
      priority: priority || null,
      watching_status: watching_status || 'want_to_watch',
    })
    .select(`
      *,
      tvshow:tvshows(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'TV show already in your collection' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/user-tvshows - Remove TV show from collection (expects ?id=xxx)
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
    .from('user_tvshows')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/user-tvshows - Update user TV show (watching status, progress, notes, etc.)
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
  const {
    watching_status,
    current_season,
    current_episode,
    notes,
    priority,
    rating,
    genre,
    started_at,
    finished_at,
  } = body;

  const updateData: Record<string, unknown> = {};
  if (watching_status !== undefined) updateData.watching_status = watching_status;
  if (current_season !== undefined) updateData.current_season = current_season;
  if (current_episode !== undefined) updateData.current_episode = current_episode;
  if (notes !== undefined) updateData.notes = notes;
  if (priority !== undefined) updateData.priority = priority;
  if (rating !== undefined) updateData.rating = rating;
  if (genre !== undefined) updateData.genre = genre;
  if (started_at !== undefined) updateData.started_at = started_at;
  if (finished_at !== undefined) updateData.finished_at = finished_at;

  const { data, error } = await supabase
    .from('user_tvshows')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      tvshow:tvshows(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
