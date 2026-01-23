import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/app/lib/supabase/server';

const anthropic = new Anthropic();

interface ShelfItem {
  type: 'book' | 'movie' | 'podcast';
  title: string;
  creator?: string; // author/director/host
  genre?: string;
  description?: string;
  notes?: string;
  rating?: number;
  read?: boolean;
  watched?: boolean;
}

async function getUserShelfContext(userId: string): Promise<ShelfItem[]> {
  const supabase = await createClient();
  const items: ShelfItem[] = [];

  // Fetch books
  const { data: userBooks } = await supabase
    .from('user_books')
    .select(`
      notes,
      read,
      book:books(title, author, genre, description, google_rating)
    `)
    .eq('user_id', userId);

  if (userBooks) {
    for (const ub of userBooks) {
      // Handle the nested book relation (could be array or single object based on Supabase types)
      const bookData = ub.book;
      if (!bookData) continue;
      const book = (Array.isArray(bookData) ? bookData[0] : bookData) as {
        title: string;
        author?: string;
        genre?: string;
        description?: string;
        google_rating?: number;
      };
      if (!book) continue;
      items.push({
        type: 'book',
        title: book.title,
        creator: book.author || undefined,
        genre: book.genre || undefined,
        description: book.description || undefined,
        notes: ub.notes || undefined,
        rating: book.google_rating || undefined,
        read: ub.read || false,
      });
    }
  }

  // Fetch movies
  const { data: userMovies } = await supabase
    .from('user_movies')
    .select(`
      notes,
      watched,
      genre,
      movie:movies(title, director, genres, description, tmdb_rating)
    `)
    .eq('user_id', userId);

  if (userMovies) {
    for (const um of userMovies) {
      const movieData = um.movie;
      if (!movieData) continue;
      const movie = (Array.isArray(movieData) ? movieData[0] : movieData) as {
        title: string;
        director?: string;
        genres?: string[];
        description?: string;
        tmdb_rating?: number;
      };
      if (!movie) continue;
      items.push({
        type: 'movie',
        title: movie.title,
        creator: movie.director || undefined,
        genre: um.genre || movie.genres?.[0] || undefined,
        description: movie.description || undefined,
        notes: um.notes || undefined,
        rating: movie.tmdb_rating || undefined,
        watched: um.watched || false,
      });
    }
  }

  // Fetch podcasts
  const { data: userPodcasts } = await supabase
    .from('user_podcasts')
    .select(`
      notes,
      genre,
      podcast:podcasts(title, creator, genres, description)
    `)
    .eq('user_id', userId);

  if (userPodcasts) {
    for (const up of userPodcasts) {
      const podcastData = up.podcast;
      if (!podcastData) continue;
      const podcast = (Array.isArray(podcastData) ? podcastData[0] : podcastData) as {
        title: string;
        creator?: string;
        genres?: string[];
        description?: string;
      };
      if (!podcast) continue;
      items.push({
        type: 'podcast',
        title: podcast.title,
        creator: podcast.creator || undefined,
        genre: up.genre || podcast.genres?.[0] || undefined,
        description: podcast.description || undefined,
        notes: up.notes || undefined,
      });
    }
  }

  return items;
}

function buildShelfSummary(items: ShelfItem[]): string {
  const books = items.filter((i) => i.type === 'book');
  const movies = items.filter((i) => i.type === 'movie');
  const podcasts = items.filter((i) => i.type === 'podcast');

  const readBooks = books.filter((b) => b.read);
  const watchedMovies = movies.filter((m) => m.watched);

  // Group by genre
  const genreCounts: Record<string, number> = {};
  for (const item of items) {
    const genre = item.genre || 'Uncategorized';
    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
  }

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => `${genre} (${count})`);

  let summary = `## User's Shelf Overview\n\n`;
  summary += `- **Total items**: ${items.length}\n`;
  summary += `- **Books**: ${books.length} (${readBooks.length} read)\n`;
  summary += `- **Movies**: ${movies.length} (${watchedMovies.length} watched)\n`;
  summary += `- **Podcasts**: ${podcasts.length}\n`;
  summary += `- **Top genres**: ${topGenres.join(', ')}\n\n`;

  summary += `## Books on Shelf\n\n`;
  for (const book of books) {
    summary += `- "${book.title}"${book.creator ? ` by ${book.creator}` : ''}`;
    summary += ` [${book.genre || 'Uncategorized'}]`;
    if (book.read) summary += ' ✓ Read';
    if (book.notes) summary += ` — Note: "${book.notes}"`;
    summary += '\n';
  }

  if (movies.length > 0) {
    summary += `\n## Movies on Shelf\n\n`;
    for (const movie of movies) {
      summary += `- "${movie.title}"${movie.creator ? ` dir. ${movie.creator}` : ''}`;
      summary += ` [${movie.genre || 'Uncategorized'}]`;
      if (movie.watched) summary += ' ✓ Watched';
      if (movie.notes) summary += ` — Note: "${movie.notes}"`;
      summary += '\n';
    }
  }

  if (podcasts.length > 0) {
    summary += `\n## Podcasts on Shelf\n\n`;
    for (const podcast of podcasts) {
      summary += `- "${podcast.title}"${podcast.creator ? ` by ${podcast.creator}` : ''}`;
      summary += ` [${podcast.genre || 'Uncategorized'}]`;
      if (podcast.notes) summary += ` — Note: "${podcast.notes}"`;
      summary += '\n';
    }
  }

  return summary;
}

const SYSTEM_PROMPT = `You are a helpful assistant for a personal media shelf application called "Shelf". You have complete knowledge of the user's books, movies, and podcasts collection.

Your role is to:
1. Help users discover patterns in their taste and reading/watching habits
2. Recommend new books, movies, or podcasts based on what they already enjoy
3. Answer questions about their collection (e.g., "What mystery books do I have?", "Have I read anything by this author?")
4. Provide insights about their media consumption (e.g., genre preferences, favorite authors/directors)
5. Help them decide what to read/watch next based on their mood or interests

Be conversational, friendly, and insightful. When making recommendations, explain why you think they'd enjoy something based on their existing taste. Reference specific items from their shelf when relevant.

If the user asks about something not on their shelf, you can still help but clarify that it's not currently in their collection.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationHistory } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get user's shelf context
    const shelfItems = await getUserShelfContext(user.id);
    const shelfSummary = buildShelfSummary(shelfItems);

    // Build messages array
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Add the new user message
    messages.push({
      role: 'user',
      content: message,
    });

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\n---\n\n${shelfSummary}`,
      messages,
    });

    const assistantMessage =
      response.content[0].type === 'text' ? response.content[0].text : '';

    return NextResponse.json({
      message: assistantMessage,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}
