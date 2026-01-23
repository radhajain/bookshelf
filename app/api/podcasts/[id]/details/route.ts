import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';
import { fetchPodcastDetails, RateLimitError } from '@/app/lib/podcastApi';
import { getPrimaryGenre } from '@/app/lib/podcasts';

// GET - Fetch cached details or fetch fresh if not cached
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch podcast from database
    const { data: podcast, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    // If we already have cached details, return them
    if (podcast.details_fetched_at) {
      return NextResponse.json({ podcast, cached: true });
    }

    // Fetch fresh details from APIs (first time only)
    const podcastForApi = {
      id: podcast.id,
      title: podcast.title,
      creator: podcast.creator || undefined,
      genre: getPrimaryGenre(podcast.genres) || 'Uncategorized',
    };

    const details = await fetchPodcastDetails(podcastForApi);

    // Update podcast with fetched details
    const updateData: Record<string, unknown> = {
      creator: details.creator || podcast.creator,
      description: details.description || podcast.description,
      cover_image: details.coverImage || podcast.cover_image,
      podcast_index_id: details.podcastIndexId || podcast.podcast_index_id,
      itunes_id: details.itunesId || podcast.itunes_id,
      rss_feed_url: details.rssFeedUrl || podcast.rss_feed_url,
      total_episodes: details.totalEpisodes || podcast.total_episodes,
      genres: details.genres || podcast.genres,
      language: details.language || podcast.language,
      publisher: details.publisher || podcast.publisher,
      website_url: details.websiteUrl || podcast.website_url,
      details_fetched_at: new Date().toISOString(),
    };

    const { data: updatedPodcast, error: updateError } = await supabase
      .from('podcasts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating podcast details:', updateError);
      // Return the fetched details anyway
      return NextResponse.json({ podcast: { ...podcast, ...updateData }, cached: false });
    }

    return NextResponse.json({ podcast: updatedPodcast, cached: false });
  } catch (error) {
    // Check if it's a rate limit error
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('Error fetching podcast details:', error);
    return NextResponse.json({ error: 'Failed to fetch podcast details' }, { status: 500 });
  }
}

// POST - Force refresh podcast details
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch podcast from database
    const { data: podcast, error } = await supabase
      .from('podcasts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 });
    }

    // Fetch fresh details from APIs (force refresh)
    const podcastForApi = {
      id: podcast.id,
      title: podcast.title,
      creator: podcast.creator || undefined,
      genre: getPrimaryGenre(podcast.genres) || 'Uncategorized',
    };

    const details = await fetchPodcastDetails(podcastForApi);

    // Update podcast with fetched details
    const updateData: Record<string, unknown> = {
      creator: details.creator || null,
      description: details.description || null,
      cover_image: details.coverImage || null,
      podcast_index_id: details.podcastIndexId || null,
      itunes_id: details.itunesId || null,
      rss_feed_url: details.rssFeedUrl || null,
      total_episodes: details.totalEpisodes || null,
      genres: details.genres || null,
      language: details.language || null,
      publisher: details.publisher || null,
      website_url: details.websiteUrl || null,
      details_fetched_at: new Date().toISOString(),
    };

    const { data: updatedPodcast, error: updateError } = await supabase
      .from('podcasts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating podcast details:', updateError);
      return NextResponse.json({ error: 'Failed to update podcast details' }, { status: 500 });
    }

    return NextResponse.json({ podcast: updatedPodcast, refreshed: true });
  } catch (error) {
    // Check if it's a rate limit error
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    console.error('Error refreshing podcast details:', error);
    return NextResponse.json({ error: 'Failed to refresh podcast details' }, { status: 500 });
  }
}
