import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// Standard genre categories
const GENRE_CATEGORIES = [
  'Fiction',
  'Non-Fiction',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Thriller',
  'Romance',
  'Horror',
  'Biography',
  'History',
  'Science',
  'Self-Help',
  'Business',
  'Philosophy',
  'Poetry',
  'Children',
  'Young Adult',
  'Classics',
  'Graphic Novel',
  'Cookbook',
  'Travel',
  'Art',
  'Music',
  'Sports',
  'Religion',
  'Technology',
  'Health',
  'True Crime',
  'Humor',
  'Drama',
];

export async function POST(request: NextRequest) {
  try {
    const { title, author, description, subjects } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const prompt = `You are a librarian helping to categorize books. Based on the following book information, select the single most appropriate genre from this list:

${GENRE_CATEGORIES.join(', ')}

Book Information:
- Title: ${title}
${author ? `- Author: ${author}` : ''}
${description ? `- Description: ${description}` : ''}
${subjects && subjects.length > 0 ? `- Subjects/Categories: ${subjects.join(', ')}` : ''}

Respond with ONLY the genre name from the list above, nothing else. If you're unsure, pick the closest match.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

    // Validate the response is one of our genres
    const normalizedResponse = responseText.toLowerCase();
    const matchedGenre = GENRE_CATEGORIES.find(
      (g) => g.toLowerCase() === normalizedResponse
    );

    if (matchedGenre) {
      return NextResponse.json({ genre: matchedGenre });
    }

    // Try partial match
    const partialMatch = GENRE_CATEGORIES.find(
      (g) =>
        normalizedResponse.includes(g.toLowerCase()) ||
        g.toLowerCase().includes(normalizedResponse)
    );

    if (partialMatch) {
      return NextResponse.json({ genre: partialMatch });
    }

    // Default to Non-Fiction if we can't match
    return NextResponse.json({ genre: 'Non-Fiction' });
  } catch (error) {
    console.error('Error deducing genre:', error);
    return NextResponse.json(
      { error: 'Failed to deduce genre' },
      { status: 500 }
    );
  }
}
