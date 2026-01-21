import { BookWithDetails } from '@/app/lib/books';
import { createClient } from '@/app/lib/supabase/server';
import { notFound } from 'next/navigation';
import PublicBookshelf from './PublicBookshelf';

interface PageProps {
	params: Promise<{ username: string }>;
}

export default async function PublicProfilePage({ params }: PageProps) {
	const { username } = await params;
	const supabase = await createClient();

	// Fetch the profile by username
	const { data: profile, error: profileError } = await supabase
		.from('profiles')
		.select('*')
		.eq('username', username)
		.single();

	if (profileError || !profile) {
		notFound();
	}

	// Fetch user's books with book details
	const { data: userBooks, error: booksError } = await supabase
		.from('user_books')
		.select(
			`
      *,
      book:books(*)
    `,
		)
		.eq('user_id', profile.id)
		.order('created_at', { ascending: false });

	if (booksError) {
		console.error('Error fetching books:', booksError);
	}

	// Convert to BookWithDetails format (genre is on the book, not user_books)
	const books: BookWithDetails[] = (userBooks || []).map((ub) => ({
		id: ub.book_id,
		title: ub.book.title,
		author: ub.book.author || undefined,
		genre: ub.book.genre || 'Uncategorized',
		pages: ub.book.page_count || undefined,
		notes: ub.notes || undefined,
		priority: ub.priority || undefined,
		description: ub.book.description || undefined,
		coverImage: ub.book.cover_image || undefined,
		ratings: [],
	}));

	// Group books by genre
	const booksByGenre = books.reduce(
		(acc, book) => {
			const genre = book.genre || 'Uncategorized';
			if (!acc[genre]) acc[genre] = [];
			acc[genre].push(book);
			return acc;
		},
		{} as Record<string, BookWithDetails[]>,
	);

	const sortedGenres = Object.keys(booksByGenre).sort((a, b) => {
		if (a === 'Uncategorized') return 1;
		if (b === 'Uncategorized') return -1;
		return a.localeCompare(b);
	});

	return (
		<PublicBookshelf
			profile={profile}
			books={books}
			booksByGenre={booksByGenre}
			sortedGenres={sortedGenres}
		/>
	);
}
