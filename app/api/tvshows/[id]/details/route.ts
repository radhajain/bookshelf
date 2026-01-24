import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { fetchTVShowDetails, RateLimitError } from '@/app/lib/tvshowApi';
import { getPrimaryGenre } from '@/app/lib/tvshows';

// GET - Fetch cached details or fetch fresh if not cached
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch TV show from database
    const { data: tvshow, error } = await supabase
      .from('tvshows')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tvshow) {
      return NextResponse.json({ error: 'TV show not found' }, { status: 404 });
    }

    // If we already have cached details, return them
    if (tvshow.details_fetched_at) {
      return NextResponse.json({ tvshow, cached: true });
    }

    // Fetch fresh details from APIs (first time only)
    const tvshowForApi = {
      id: tvshow.id,
      title: tvshow.title,
      creator: tvshow.creator || undefined,
      firstAirDate: tvshow.first_air_date || undefined,
      genre: getPrimaryGenre(tvshow.genres) || 'Uncategorized',
    };

    const details = await fetchTVShowDetails(tvshowForApi);

    // Update TV show with fetched details
    const updateData: Record<string, unknown> = {
      creator: details.creator || tvshow.creator,
      first_air_date: details.firstAirDate || tvshow.first_air_date,
      last_air_date: details.lastAirDate || tvshow.last_air_date,
      number_of_seasons: details.numberOfSeasons || tvshow.number_of_seasons,
      number_of_episodes: details.numberOfEpisodes || tvshow.number_of_episodes,
      episode_run_time: details.episodeRunTime || tvshow.episode_run_time,
      poster_image: details.posterImage || tvshow.poster_image,
      backdrop_image: details.backdropImage || tvshow.backdrop_image,
      description: details.description || tvshow.description,
      tagline: details.tagline || tvshow.tagline,
      status: details.status || tvshow.status,
      in_production: details.inProduction ?? tvshow.in_production,
      tmdb_id: details.tmdbId || tvshow.tmdb_id,
      imdb_id: details.imdbId || tvshow.imdb_id,
      tmdb_rating: details.ratings?.find(r => r.source === 'TMDB')?.rating || null,
      tmdb_ratings_count: details.ratings?.find(r => r.source === 'TMDB')?.ratingsCount || null,
      cast_members: details.cast || null,
      genres: details.genres || tvshow.genres,
      networks: details.networks || tvshow.networks,
      production_companies: details.productionCompanies || null,
      origin_country: details.originCountry || tvshow.origin_country,
      original_language: details.originalLanguage || tvshow.original_language,
      imdb_url: details.imdbUrl || null,
      details_fetched_at: new Date().toISOString(),
    };

    const { data: updatedTVShow, error: updateError } = await supabase
      .from('tvshows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating TV show details:', updateError);
      // Return the fetched details anyway
      return NextResponse.json({ tvshow: { ...tvshow, ...updateData }, cached: false });
    }

    return NextResponse.json({ tvshow: updatedTVShow, cached: false });
  } catch (error) {
    // Check if it's a rate limit error
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('Error fetching TV show details:', error);
    return NextResponse.json({ error: 'Failed to fetch TV show details' }, { status: 500 });
  }
}

// POST - Force refresh TV show details
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch TV show from database
    const { data: tvshow, error } = await supabase
      .from('tvshows')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !tvshow) {
      return NextResponse.json({ error: 'TV show not found' }, { status: 404 });
    }

    // Fetch fresh details from APIs (force refresh)
    const tvshowForApi = {
      id: tvshow.id,
      title: tvshow.title,
      creator: tvshow.creator || undefined,
      firstAirDate: tvshow.first_air_date || undefined,
      genre: getPrimaryGenre(tvshow.genres) || 'Uncategorized',
    };

    const details = await fetchTVShowDetails(tvshowForApi);

    // Update TV show with fetched details
    const updateData: Record<string, unknown> = {
      creator: details.creator || null,
      first_air_date: details.firstAirDate || null,
      last_air_date: details.lastAirDate || null,
      number_of_seasons: details.numberOfSeasons || null,
      number_of_episodes: details.numberOfEpisodes || null,
      episode_run_time: details.episodeRunTime || null,
      poster_image: details.posterImage || null,
      backdrop_image: details.backdropImage || null,
      description: details.description || null,
      tagline: details.tagline || null,
      status: details.status || null,
      in_production: details.inProduction ?? false,
      tmdb_id: details.tmdbId || null,
      imdb_id: details.imdbId || null,
      tmdb_rating: details.ratings?.find(r => r.source === 'TMDB')?.rating || null,
      tmdb_ratings_count: details.ratings?.find(r => r.source === 'TMDB')?.ratingsCount || null,
      cast_members: details.cast || null,
      genres: details.genres || null,
      networks: details.networks || null,
      production_companies: details.productionCompanies || null,
      origin_country: details.originCountry || null,
      original_language: details.originalLanguage || null,
      imdb_url: details.imdbUrl || null,
      details_fetched_at: new Date().toISOString(),
    };

    const { data: updatedTVShow, error: updateError } = await supabase
      .from('tvshows')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating TV show details:', updateError);
      return NextResponse.json({ error: 'Failed to update TV show details' }, { status: 500 });
    }

    return NextResponse.json({ tvshow: updatedTVShow, refreshed: true });
  } catch (error) {
    // Check if it's a rate limit error
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('Error refreshing TV show details:', error);
    return NextResponse.json({ error: 'Failed to refresh TV show details' }, { status: 500 });
  }
}
