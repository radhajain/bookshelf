import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/podcasts - Get all podcasts in library with optional search
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const genre = searchParams.get('genre');

  const supabase = await createClient();

  // Get current user to check which podcasts they already have
  const { data: { user } } = await supabase.auth.getUser();

  let dbQuery = supabase.from('podcasts').select('*').order('title');

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,creator.ilike.%${query}%`);
  }

  if (genre && genre !== 'all') {
    dbQuery = dbQuery.contains('genres', [genre]);
  }

  const { data: podcasts, error } = await dbQuery.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If user is logged in, get their podcast IDs to mark which ones they have
  let userPodcastIds: string[] = [];
  if (user) {
    const { data: userPodcasts } = await supabase
      .from('user_podcasts')
      .select('podcast_id')
      .eq('user_id', user.id);

    userPodcastIds = userPodcasts?.map(up => up.podcast_id) || [];
  }

  // Add inMyShelf flag to each podcast
  const podcastsWithShelfStatus = podcasts?.map(podcast => ({
    ...podcast,
    inMyShelf: userPodcastIds.includes(podcast.id),
  })) || [];

  // Get unique genres for filtering
  const { data: genreData } = await supabase
    .from('podcasts')
    .select('genres')
    .not('genres', 'is', null);

  const allGenres = genreData?.flatMap(p => p.genres || []) || [];
  const genres = [...new Set(allGenres)].sort();

  return NextResponse.json({ podcasts: podcastsWithShelfStatus, genres });
}

// POST /api/podcasts - Find or create podcast in shared catalog
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, creator, itunes_id, cover_image, rss_feed_url, total_episodes, genres } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // First, try to find existing podcast by iTunes ID if provided
  if (itunes_id) {
    const { data: existingByItunes } = await supabase
      .from('podcasts')
      .select('*')
      .eq('itunes_id', itunes_id)
      .single();

    if (existingByItunes) {
      return NextResponse.json(existingByItunes);
    }
  }

  // Try to find by title + creator
  let existingPodcastQuery = supabase
    .from('podcasts')
    .select('*')
    .eq('title', title);

  if (creator) {
    existingPodcastQuery = existingPodcastQuery.eq('creator', creator);
  }

  const { data: existingPodcast } = await existingPodcastQuery.maybeSingle();

  if (existingPodcast) {
    return NextResponse.json(existingPodcast);
  }

  // Create new podcast in catalog
  const { data: newPodcast, error } = await supabase
    .from('podcasts')
    .insert({
      title,
      creator: creator || null,
      itunes_id: itunes_id || null,
      cover_image: cover_image || null,
      rss_feed_url: rss_feed_url || null,
      total_episodes: total_episodes || null,
      genres: genres || null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === '23505') {
      // Try to find the podcast that was just created
      const { data: podcast } = await supabase
        .from('podcasts')
        .select('*')
        .eq('title', title)
        .maybeSingle();

      if (podcast) {
        return NextResponse.json(podcast);
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newPodcast, { status: 201 });
}
