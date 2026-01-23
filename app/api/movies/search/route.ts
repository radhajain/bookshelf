import { NextRequest, NextResponse } from 'next/server';
import { searchMoviesForSelection } from '@/app/lib/movieApi';

// GET /api/movies/search?q=title - Search for movies by title
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    const results = await searchMoviesForSelection(query);

    // Deduplicate by title + director + year combination
    const seen = new Set<string>();
    const uniqueResults = results.filter((movie) => {
      const key = `${movie.title.toLowerCase()}-${(movie.director || '').toLowerCase()}-${movie.year || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ results: uniqueResults });
  } catch (error) {
    console.error('Error searching movies:', error);
    return NextResponse.json({ error: 'Failed to search movies' }, { status: 500 });
  }
}
