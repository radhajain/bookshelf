import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/movies - Get all movies in library with optional search
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const genre = searchParams.get('genre');

  const supabase = await createClient();

  // Get current user to check which movies they already have
  const { data: { user } } = await supabase.auth.getUser();

  let dbQuery = supabase.from('movies').select('*').order('title');

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,director.ilike.%${query}%`);
  }

  if (genre && genre !== 'all') {
    dbQuery = dbQuery.contains('genres', [genre]);
  }

  const { data: movies, error } = await dbQuery.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If user is logged in, get their movie IDs to mark which ones they have
  let userMovieIds: string[] = [];
  if (user) {
    const { data: userMovies } = await supabase
      .from('user_movies')
      .select('movie_id')
      .eq('user_id', user.id);

    userMovieIds = userMovies?.map(um => um.movie_id) || [];
  }

  // Add inMyShelf flag to each movie
  const moviesWithShelfStatus = movies?.map(movie => ({
    ...movie,
    inMyShelf: userMovieIds.includes(movie.id),
  })) || [];

  // Get unique genres for filtering
  const { data: genreData } = await supabase
    .from('movies')
    .select('genres')
    .not('genres', 'is', null);

  const allGenres = genreData?.flatMap(m => m.genres || []) || [];
  const genres = [...new Set(allGenres)].sort();

  return NextResponse.json({ movies: moviesWithShelfStatus, genres });
}

// POST /api/movies - Find or create movie in shared catalog
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, director, year, tmdb_id } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // First, try to find existing movie by TMDB ID if provided
  if (tmdb_id) {
    const { data: existingByTmdb } = await supabase
      .from('movies')
      .select('*')
      .eq('tmdb_id', tmdb_id)
      .single();

    if (existingByTmdb) {
      return NextResponse.json(existingByTmdb);
    }
  }

  // Try to find by title + director + year
  let existingMovieQuery = supabase
    .from('movies')
    .select('*')
    .eq('title', title);

  if (director) {
    existingMovieQuery = existingMovieQuery.eq('director', director);
  }
  if (year) {
    existingMovieQuery = existingMovieQuery.eq('year', year);
  }

  const { data: existingMovie } = await existingMovieQuery.maybeSingle();

  if (existingMovie) {
    return NextResponse.json(existingMovie);
  }

  // Create new movie in catalog
  const { data: newMovie, error } = await supabase
    .from('movies')
    .insert({
      title,
      director: director || null,
      year: year || null,
      tmdb_id: tmdb_id || null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === '23505') {
      // Try to find the movie that was just created
      const { data: movie } = await supabase
        .from('movies')
        .select('*')
        .eq('title', title)
        .maybeSingle();

      if (movie) {
        return NextResponse.json(movie);
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newMovie, { status: 201 });
}
