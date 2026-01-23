import { NextResponse } from 'next/server';
import { parseArticleUrl } from '@/app/lib/articleApi';

// POST /api/articles/parse-url - Parse a URL and extract article metadata
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Parse the URL and extract metadata
    const metadata = await parseArticleUrl(url);

    if (!metadata) {
      return NextResponse.json({
        error: 'Could not extract article metadata from URL',
        fallback: {
          title: 'Unknown Article',
          articleUrl: url,
        }
      }, { status: 422 });
    }

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error parsing article URL:', error);
    return NextResponse.json(
      { error: 'Failed to parse article URL' },
      { status: 500 }
    );
  }
}
