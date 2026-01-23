import { NextRequest, NextResponse } from 'next/server';
import { searchPodcastsForSelection } from '@/app/lib/podcastApi';

// GET /api/podcasts/search?q=title - Search for podcasts by title
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    const results = await searchPodcastsForSelection(query);

    // Deduplicate by title + creator combination
    const seen = new Set<string>();
    const uniqueResults = results.filter((podcast) => {
      const key = `${podcast.title.toLowerCase()}-${(podcast.creator || '').toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ results: uniqueResults });
  } catch (error) {
    console.error('Error searching podcasts:', error);
    return NextResponse.json({ error: 'Failed to search podcasts' }, { status: 500 });
  }
}
