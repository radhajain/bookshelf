import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/app/lib/supabase/server';

const anthropic = new Anthropic();

interface ShelfItem {
  type: 'book' | 'movie' | 'podcast';
  title: string;
  creator?: string;
  genre?: string;
  description?: string;
  notes?: string;
  read?: boolean;
  watched?: boolean;
}

interface TasteProfile {
  red_threads: {
    theme: string;
    description: string;
    examples: string[];
  }[];
  pacing_preference: {
    style: string;
    description: string;
    indicators: string[];
  };
  emotional_resonance: {
    vibe_spectrum: string[];
    primary_vibe: string;
    description: string;
  };
  antipathy_profile: {
    likely_dislikes: string[];
    reasoning: string;
  };
  taste_vector_summary: string;
}

async function getUserShelfItems(userId: string): Promise<ShelfItem[]> {
  const supabase = await createClient();
  const items: ShelfItem[] = [];

  // Fetch books
  const { data: userBooks } = await supabase
    .from('user_books')
    .select(`
      notes,
      read,
      book:books(title, author, genre, description)
    `)
    .eq('user_id', userId);

  if (userBooks) {
    for (const ub of userBooks) {
      const bookData = ub.book;
      if (!bookData) continue;
      const book = (Array.isArray(bookData) ? bookData[0] : bookData) as {
        title: string;
        author?: string;
        genre?: string;
        description?: string;
      };
      if (!book) continue;
      items.push({
        type: 'book',
        title: book.title,
        creator: book.author || undefined,
        genre: book.genre || undefined,
        description: book.description || undefined,
        notes: ub.notes || undefined,
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
      movie:movies(title, director, genres, description)
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
      };
      if (!movie) continue;
      items.push({
        type: 'movie',
        title: movie.title,
        creator: movie.director || undefined,
        genre: um.genre || movie.genres?.[0] || undefined,
        description: movie.description || undefined,
        notes: um.notes || undefined,
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

function buildMediaList(items: ShelfItem[]): string {
  const books = items.filter((i) => i.type === 'book');
  const movies = items.filter((i) => i.type === 'movie');
  const podcasts = items.filter((i) => i.type === 'podcast');

  let list = '';

  if (books.length > 0) {
    list += '## Books\n';
    for (const book of books) {
      list += `- "${book.title}"${book.creator ? ` by ${book.creator}` : ''} [${book.genre || 'Uncategorized'}]`;
      if (book.description) list += `\n  Description: ${book.description.substring(0, 200)}...`;
      if (book.notes) list += `\n  User note: "${book.notes}"`;
      list += '\n';
    }
  }

  if (movies.length > 0) {
    list += '\n## Movies\n';
    for (const movie of movies) {
      list += `- "${movie.title}"${movie.creator ? ` dir. ${movie.creator}` : ''} [${movie.genre || 'Uncategorized'}]`;
      if (movie.description) list += `\n  Description: ${movie.description.substring(0, 200)}...`;
      if (movie.notes) list += `\n  User note: "${movie.notes}"`;
      list += '\n';
    }
  }

  if (podcasts.length > 0) {
    list += '\n## Podcasts\n';
    for (const podcast of podcasts) {
      list += `- "${podcast.title}"${podcast.creator ? ` by ${podcast.creator}` : ''} [${podcast.genre || 'Uncategorized'}]`;
      if (podcast.description) list += `\n  Description: ${podcast.description.substring(0, 200)}...`;
      if (podcast.notes) list += `\n  User note: "${podcast.notes}"`;
      list += '\n';
    }
  }

  return list;
}

const TASTE_PROFILE_PROMPT = `You are an expert Cultural Ontologist and Psychological Profiler. Your goal is to synthesize a disparate list of consumed media into a "Master Taste Identity."

Analyze the provided media library to identify the user's Latent Preference Architecture. Do not just list genres. Instead, perform the following deep analysis:

1. **The "Red Thread" Analysis**: Identify 3-5 recurring philosophical or atmospheric themes that cross all mediums. These should be deeper than surface genres — look for existential preoccupations, aesthetic sensibilities, or intellectual fascinations.

2. **Pacing & Structure Preference**: Determine the user's preferred "information density." Do they gravitate toward:
   - "Slow-burn world-building" with rich atmospheric detail?
   - "High-velocity narrative pivots" with constant forward momentum?
   - "Layered complexity" that rewards repeated engagement?
   - "Elegant minimalism" that trusts the audience?

3. **Emotional Resonance — The "Vibe Spectrum"**: Define the emotional frequencies this person is drawn to. Are they seeking catharsis, intellectual stimulation, comfort, provocation, wonder, melancholy, hope?

4. **The "Antipathy" Profile**: Based on what they love, deduce what they would likely hate. What conventions, tones, or approaches would grate against their sensibilities?

5. **The Taste Vector Summary**: Write a 2-paragraph "Human Narrative" that summarizes this person's soul as a consumer of culture. Write it in second person ("You are..."). Make it feel like a horoscope that actually understands them — specific, insightful, perhaps slightly uncomfortable in its accuracy.

Return your analysis as valid JSON with this exact structure:
{
  "red_threads": [
    {
      "theme": "Theme name",
      "description": "1-2 sentence explanation of this recurring thread",
      "examples": ["Example from their library", "Another example"]
    }
  ],
  "pacing_preference": {
    "style": "Short label (e.g., 'The Patient Observer')",
    "description": "2-3 sentences on their preferred pacing and structure",
    "indicators": ["Evidence from their library"]
  },
  "emotional_resonance": {
    "vibe_spectrum": ["Primary emotion", "Secondary emotion", "Tertiary emotion"],
    "primary_vibe": "The dominant emotional frequency",
    "description": "2-3 sentences on their emotional preferences"
  },
  "antipathy_profile": {
    "likely_dislikes": ["Thing they'd dislike", "Another thing"],
    "reasoning": "2-3 sentences explaining why based on their preferences"
  },
  "taste_vector_summary": "Two paragraphs in second person that capture their essence as a cultural consumer. Be poetic but precise. This should feel revelatory."
}

IMPORTANT: Return ONLY valid JSON. No markdown code blocks, no additional text.`;

async function generateTasteProfile(items: ShelfItem[]): Promise<TasteProfile> {
  const mediaList = buildMediaList(items);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `${TASTE_PROFILE_PROMPT}\n\n---\n\nHere is the user's media library:\n\n${mediaList}`,
      },
    ],
  });

  const responseText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    // Parse the JSON response
    const profile = JSON.parse(responseText) as TasteProfile;
    return profile;
  } catch {
    console.error('Failed to parse taste profile response:', responseText);
    throw new Error('Failed to parse taste profile from AI response');
  }
}

// GET /api/taste-profile - Get the current user's taste profile
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for userId query param (for viewing other users' profiles)
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || user.id;

    // Fetch the taste profile
    const { data: profile, error } = await supabase
      .from('taste_profiles')
      .select('*')
      .eq('user_id', targetUserId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('Error fetching taste profile:', error);
      return NextResponse.json(
        { error: 'Failed to fetch taste profile' },
        { status: 500 }
      );
    }

    // Get current item count to check if regeneration is needed
    const items = await getUserShelfItems(targetUserId);
    const currentItemCount = items.length;

    // Determine if profile needs regeneration (every ~5 new items)
    const needsRegeneration =
      profile &&
      currentItemCount >= profile.items_at_generation + 5;

    return NextResponse.json({
      profile: profile || null,
      currentItemCount,
      needsRegeneration,
      hasEnoughItems: currentItemCount >= 5,
    });
  } catch (error) {
    console.error('Error in taste profile GET:', error);
    return NextResponse.json(
      { error: 'Failed to get taste profile' },
      { status: 500 }
    );
  }
}

// POST /api/taste-profile - Generate or regenerate the taste profile
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's shelf items
    const items = await getUserShelfItems(user.id);

    if (items.length < 5) {
      return NextResponse.json(
        {
          error:
            'You need at least 5 items in your shelf to generate a taste profile',
        },
        { status: 400 }
      );
    }

    // Generate the taste profile using Claude
    const tasteProfile = await generateTasteProfile(items);

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('taste_profiles')
      .select('id, generation_count')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { data: updatedProfile, error } = await supabase
        .from('taste_profiles')
        .update({
          red_threads: tasteProfile.red_threads,
          pacing_preference: tasteProfile.pacing_preference,
          emotional_resonance: tasteProfile.emotional_resonance,
          antipathy_profile: tasteProfile.antipathy_profile,
          taste_vector_summary: tasteProfile.taste_vector_summary,
          items_at_generation: items.length,
          last_generated_at: new Date().toISOString(),
          generation_count: existingProfile.generation_count + 1,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating taste profile:', error);
        return NextResponse.json(
          { error: 'Failed to update taste profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({ profile: updatedProfile, regenerated: true });
    } else {
      // Insert new profile
      const { data: newProfile, error } = await supabase
        .from('taste_profiles')
        .insert({
          user_id: user.id,
          red_threads: tasteProfile.red_threads,
          pacing_preference: tasteProfile.pacing_preference,
          emotional_resonance: tasteProfile.emotional_resonance,
          antipathy_profile: tasteProfile.antipathy_profile,
          taste_vector_summary: tasteProfile.taste_vector_summary,
          items_at_generation: items.length,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating taste profile:', error);
        return NextResponse.json(
          { error: 'Failed to create taste profile' },
          { status: 500 }
        );
      }

      return NextResponse.json({ profile: newProfile, regenerated: false });
    }
  } catch (error) {
    console.error('Error in taste profile POST:', error);
    return NextResponse.json(
      { error: 'Failed to generate taste profile' },
      { status: 500 }
    );
  }
}
