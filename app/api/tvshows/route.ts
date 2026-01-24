import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/tvshows - Get all TV shows in library with optional search
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const genre = searchParams.get('genre');

  const supabase = await createClient();

  // Get current user to check which TV shows they already have
  const { data: { user } } = await supabase.auth.getUser();

  let dbQuery = supabase.from('tvshows').select('*').order('title');

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,creator.ilike.%${query}%`);
  }

  if (genre && genre !== 'all') {
    dbQuery = dbQuery.contains('genres', [genre]);
  }

  const { data: tvshows, error } = await dbQuery.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If user is logged in, get their TV show IDs to mark which ones they have
  let userTVShowIds: string[] = [];
  let userTVShowStatuses: Record<string, string> = {};
  if (user) {
    const { data: userTVShows } = await supabase
      .from('user_tvshows')
      .select('tvshow_id, watching_status')
      .eq('user_id', user.id);

    userTVShowIds = userTVShows?.map(ut => ut.tvshow_id) || [];
    userTVShowStatuses = Object.fromEntries(
      userTVShows?.map(ut => [ut.tvshow_id, ut.watching_status]) || []
    );
  }

  // Add inMyShelf flag to each TV show
  const tvshowsWithShelfStatus = tvshows?.map(tvshow => ({
    ...tvshow,
    inMyShelf: userTVShowIds.includes(tvshow.id),
    watchingStatus: userTVShowStatuses[tvshow.id] || undefined,
  })) || [];

  // Get unique genres for filtering
  const { data: genreData } = await supabase
    .from('tvshows')
    .select('genres')
    .not('genres', 'is', null);

  // Flatten the genres arrays and get unique values
  const allGenres = genreData?.flatMap(t => t.genres || []) || [];
  const genres = [...new Set(allGenres)].filter(Boolean).sort();

  return NextResponse.json({ tvshows: tvshowsWithShelfStatus, genres });
}

// POST /api/tvshows - Find or create TV show in shared catalog
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, creator, firstAirDate } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // First, try to find existing TV show (case-insensitive)
  let existingTVShowQuery = supabase
    .from('tvshows')
    .select('*')
    .ilike('title', title);

  if (creator) {
    existingTVShowQuery = existingTVShowQuery.ilike('creator', creator);
  }

  const { data: existingTVShow } = await existingTVShowQuery.single();

  if (existingTVShow) {
    return NextResponse.json(existingTVShow);
  }

  // Create new TV show in catalog
  const { data: newTVShow, error } = await supabase
    .from('tvshows')
    .insert({
      title,
      creator: creator || null,
      first_air_date: firstAirDate || null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === '23505') {
      let refetchQuery = supabase
        .from('tvshows')
        .select('*')
        .ilike('title', title);

      if (creator) {
        refetchQuery = refetchQuery.ilike('creator', creator);
      }

      const { data: tvshow } = await refetchQuery.single();
      return NextResponse.json(tvshow);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newTVShow, { status: 201 });
}
