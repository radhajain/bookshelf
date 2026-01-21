import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

interface ParsedBook {
	title: string;
	author: string | null;
	genre: string;
	notes: string | null;
	priority: string | null;
}

interface ParsedBooksResponse {
	books: ParsedBook[];
}

export async function POST(request: NextRequest) {
	try {
		const { csvContent } = await request.json();

		if (!csvContent || typeof csvContent !== 'string') {
			return NextResponse.json(
				{ error: 'CSV content is required' },
				{ status: 400 },
			);
		}

		// Use Claude with structured outputs to parse the CSV
		const message = await anthropic.beta.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 16384,
			betas: ['structured-outputs-2025-11-13'],
			messages: [
				{
					role: 'user',
					content: `Parse this CSV file containing a reading list. Extract all books.

For each book, extract:
- title (required): The book title
- author (optional): The author's name if mentioned in the title or notes (e.g., "Book Name by Author Name" or "Book Name - Author")
- genre (optional): The genre/category if specified
- notes (optional): Any notes about the book
- priority (optional): Priority level (A, B, C, or X for crossed out/removed)

IMPORTANT:
- Skip any books with priority "X" (these are crossed out/removed)
- Skip header rows and empty rows
- If a title contains " by " or " - " followed by a name, that's likely the author

CSV Content:
${csvContent}`,
				},
			],
			output_format: {
				type: 'json_schema',
				schema: {
					type: 'object',
					properties: {
						books: {
							type: 'array',
							items: {
								type: 'object',
								properties: {
									title: { type: 'string' },
									author: { type: ['string', 'null'] },
									genre: { type: 'string' },
									notes: { type: ['string', 'null'] },
									priority: { type: ['string', 'null'] },
								},
								required: ['title', 'genre'],
								additionalProperties: false,
							},
						},
					},
					required: ['books'],
					additionalProperties: false,
				},
			},
		});

		// Extract the text content from Claude's response
		const responseText =
			message.content[0].type === 'text' ? message.content[0].text : '';

		const parsed: ParsedBooksResponse = JSON.parse(responseText);

		// Filter out any books with X priority and validate structure
		const validBooks = parsed.books
			.filter((book) => book.title && book.priority?.toUpperCase() !== 'X')
			.map((book) => ({
				title: book.title.trim(),
				author: book.author?.trim() || null,
				genre: book.genre?.trim() || 'Uncategorized',
				notes: book.notes?.trim() || null,
				priority: book.priority?.trim() || null,
			}));

		return NextResponse.json({ books: validBooks });
	} catch (error) {
		console.error('Error parsing CSV with Claude:', error);
		return NextResponse.json({ error: 'Failed to parse CSV' }, { status: 500 });
	}
}
