import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { fetchMovieDetails, RateLimitError } from '@/app/lib/movieApi';
import { getPrimaryGenre } from '@/app/lib/movies';

// GET - Fetch cached details or fetch fresh if not cached
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch movie from database
    const { data: movie, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // If we already have cached details, return them
    if (movie.details_fetched_at) {
      return NextResponse.json({ movie, cached: true });
    }

    // Fetch fresh details from APIs (first time only)
    const movieForApi = {
      id: movie.id,
      title: movie.title,
      director: movie.director || undefined,
      year: movie.year || undefined,
      genre: getPrimaryGenre(movie.genres) || 'Uncategorized',
    };

    const details = await fetchMovieDetails(movieForApi);

    // Update movie with fetched details
    const updateData: Record<string, unknown> = {
      director: details.director || movie.director,
      year: details.year || movie.year,
      runtime_minutes: details.runtime || movie.runtime_minutes,
      poster_image: details.posterImage || movie.poster_image,
      backdrop_image: details.backdropImage || movie.backdrop_image,
      description: details.description || movie.description,
      tagline: details.tagline || movie.tagline,
      tmdb_id: details.tmdbId || movie.tmdb_id,
      imdb_id: details.imdbId || movie.imdb_id,
      tmdb_rating: details.ratings?.find(r => r.source === 'TMDB')?.rating || null,
      tmdb_ratings_count: details.ratings?.find(r => r.source === 'TMDB')?.ratingsCount || null,
      rotten_tomatoes_score: details.ratings?.find(r => r.source === 'Rotten Tomatoes')?.rating || null,
      metacritic_score: details.ratings?.find(r => r.source === 'Metacritic')?.rating || null,
      imdb_rating: details.ratings?.find(r => r.source === 'IMDb')?.rating || null,
      imdb_ratings_count: details.ratings?.find(r => r.source === 'IMDb')?.ratingsCount || null,
      cast_members: details.cast || null,
      genres: details.genres || movie.genres,
      release_date: details.releaseDate || movie.release_date,
      budget: details.budget || movie.budget,
      revenue: details.revenue || movie.revenue,
      production_companies: details.productionCompanies || null,
      imdb_url: details.imdbUrl || null,
      letterboxd_url: details.letterboxdUrl || null,
      details_fetched_at: new Date().toISOString(),
    };

    const { data: updatedMovie, error: updateError } = await supabase
      .from('movies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating movie details:', updateError);
      // Return the fetched details anyway
      return NextResponse.json({ movie: { ...movie, ...updateData }, cached: false });
    }

    return NextResponse.json({ movie: updatedMovie, cached: false });
  } catch (error) {
    // Check if it's a rate limit error
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('Error fetching movie details:', error);
    return NextResponse.json({ error: 'Failed to fetch movie details' }, { status: 500 });
  }
}

// POST - Force refresh movie details
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch movie from database
    const { data: movie, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !movie) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    // Fetch fresh details from APIs (force refresh)
    const movieForApi = {
      id: movie.id,
      title: movie.title,
      director: movie.director || undefined,
      year: movie.year || undefined,
      genre: getPrimaryGenre(movie.genres) || 'Uncategorized',
    };

    const details = await fetchMovieDetails(movieForApi);

    // Update movie with fetched details
    const updateData: Record<string, unknown> = {
      director: details.director || null,
      year: details.year || null,
      runtime_minutes: details.runtime || null,
      poster_image: details.posterImage || null,
      backdrop_image: details.backdropImage || null,
      description: details.description || null,
      tagline: details.tagline || null,
      tmdb_id: details.tmdbId || null,
      imdb_id: details.imdbId || null,
      tmdb_rating: details.ratings?.find(r => r.source === 'TMDB')?.rating || null,
      tmdb_ratings_count: details.ratings?.find(r => r.source === 'TMDB')?.ratingsCount || null,
      rotten_tomatoes_score: details.ratings?.find(r => r.source === 'Rotten Tomatoes')?.rating || null,
      metacritic_score: details.ratings?.find(r => r.source === 'Metacritic')?.rating || null,
      imdb_rating: details.ratings?.find(r => r.source === 'IMDb')?.rating || null,
      imdb_ratings_count: details.ratings?.find(r => r.source === 'IMDb')?.ratingsCount || null,
      cast_members: details.cast || null,
      genres: details.genres || null,
      release_date: details.releaseDate || null,
      budget: details.budget || null,
      revenue: details.revenue || null,
      production_companies: details.productionCompanies || null,
      imdb_url: details.imdbUrl || null,
      letterboxd_url: details.letterboxdUrl || null,
      details_fetched_at: new Date().toISOString(),
    };

    const { data: updatedMovie, error: updateError } = await supabase
      .from('movies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating movie details:', updateError);
      return NextResponse.json({ error: 'Failed to update movie details' }, { status: 500 });
    }

    return NextResponse.json({ movie: updatedMovie, refreshed: true });
  } catch (error) {
    // Check if it's a rate limit error
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('Error refreshing movie details:', error);
    return NextResponse.json({ error: 'Failed to refresh movie details' }, { status: 500 });
  }
}
