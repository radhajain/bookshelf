import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/user-podcasts - Get current user's podcast collection
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_podcasts')
    .select(`
      *,
      podcast:podcasts(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/user-podcasts - Add podcast to user's shelf
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { podcast_id, podcastId, title, creator, itunes_id, cover_image, rss_feed_url, total_episodes, genres, genre, notes, priority } = body;

  let finalPodcastId = podcast_id || podcastId;

  // If no podcast_id provided, find or create the podcast first
  if (!finalPodcastId && title) {
    // Try to find existing podcast by iTunes ID first
    if (itunes_id) {
      const { data: existingByItunes } = await supabase
        .from('podcasts')
        .select('id, genres')
        .eq('itunes_id', itunes_id)
        .single();

      if (existingByItunes) {
        finalPodcastId = existingByItunes.id;
      }
    }

    // If not found by iTunes ID, try title + creator
    if (!finalPodcastId) {
      let existingQuery = supabase
        .from('podcasts')
        .select('id, genres')
        .eq('title', title);

      if (creator) {
        existingQuery = existingQuery.eq('creator', creator);
      }

      const { data: existingPodcast } = await existingQuery.maybeSingle();

      if (existingPodcast) {
        finalPodcastId = existingPodcast.id;
      } else {
        // Create new podcast
        const { data: newPodcast, error: podcastError } = await supabase
          .from('podcasts')
          .insert({
            title,
            creator: creator || null,
            itunes_id: itunes_id || null,
            cover_image: cover_image || null,
            rss_feed_url: rss_feed_url || null,
            total_episodes: total_episodes || null,
            genres: genres || (genre ? [genre] : null),
          })
          .select('id')
          .single();

        if (podcastError) {
          // Handle race condition - another request created it
          if (podcastError.code === '23505') {
            let refetchQuery = supabase
              .from('podcasts')
              .select('id')
              .eq('title', title);

            if (itunes_id) {
              refetchQuery = supabase
                .from('podcasts')
                .select('id')
                .eq('itunes_id', itunes_id);
            }

            const { data: podcast } = await refetchQuery.maybeSingle();
            finalPodcastId = podcast?.id;
          } else {
            return NextResponse.json({ error: podcastError.message }, { status: 500 });
          }
        } else {
          finalPodcastId = newPodcast.id;
        }
      }
    }
  }

  if (!finalPodcastId) {
    return NextResponse.json({ error: 'podcast_id or title is required' }, { status: 400 });
  }

  // Add to user's collection
  const { data, error } = await supabase
    .from('user_podcasts')
    .insert({
      user_id: user.id,
      podcast_id: finalPodcastId,
      genre: genre || null,
      notes: notes || null,
      priority: priority || null,
    })
    .select(`
      *,
      podcast:podcasts(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Podcast already in your collection' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/user-podcasts - Remove podcast from collection (expects ?id=xxx)
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
    .from('user_podcasts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/user-podcasts - Update user podcast (notes, etc.)
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
  const { notes, priority, genre } = body;

  const updateData: Record<string, unknown> = {};
  if (notes !== undefined) updateData.notes = notes;
  if (priority !== undefined) updateData.priority = priority;
  if (genre !== undefined) updateData.genre = genre;

  const { data, error } = await supabase
    .from('user_podcasts')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      podcast:podcasts(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
