import { NextResponse } from 'next/server';
import { searchArticlesForSelection } from '@/app/lib/articleApi';

// GET /api/articles/search - Search articles by title or URL
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const publication = searchParams.get('publication');

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 });
  }

  try {
    const results = await searchArticlesForSelection(query, publication || undefined);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching articles:', error);
    return NextResponse.json(
      { error: 'Failed to search articles' },
      { status: 500 }
    );
  }
}
