import { NextRequest, NextResponse } from 'next/server';
import { searchTVShowsForSelection } from '@/app/lib/tvshowApi';

// GET /api/tvshows/search?q=title - Search for TV shows by title
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    const results = await searchTVShowsForSelection(query);

    // Deduplicate by title + creator + first_air_date combination
    const seen = new Set<string>();
    const uniqueResults = results.filter((tvshow) => {
      const key = `${tvshow.title.toLowerCase()}-${(tvshow.creator || '').toLowerCase()}-${tvshow.firstAirDate || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ results: uniqueResults });
  } catch (error) {
    console.error('Error searching TV shows:', error);
    return NextResponse.json({ error: 'Failed to search TV shows' }, { status: 500 });
  }
}
