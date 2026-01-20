'use client';

import { BookWithDetails } from '../lib/books';
import BookCard from './BookCard';

interface GenreSectionProps {
  genre: string;
  books: BookWithDetails[];
  onBookClick: (book: BookWithDetails) => void;
}

// Map genres to colors for visual distinction
const genreColors: Record<string, { bg: string; text: string; border: string }> = {
  'History & War': { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  'Fiction': { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  'Historical Fiction': { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  'Psychology & Behavioral Economics': { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  'Culture & Society': { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200' },
  'Science & Nature': { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  'Science & Mathematics': { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-200' },
  'Business & Economics': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'Politics': { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-200' },
  'Philosophy & Self-Improvement': { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
  'Travel & Adventure': { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  'Biography & Memoir': { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  'Religion & Art': { bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200' },
  'Crime & Drugs': { bg: 'bg-zinc-100', text: 'text-zinc-800', border: 'border-zinc-300' },
  'Uncategorized': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

export default function GenreSection({ genre, books, onBookClick }: GenreSectionProps) {
  const colors = genreColors[genre] || genreColors['Uncategorized'];

  return (
    <section id={genre.toLowerCase().replace(/\s+/g, '-')} className="mb-12">
      {/* Genre Header */}
      <div className={`flex items-center gap-3 mb-6 pb-3 border-b-2 ${colors.border}`}>
        <h2 className={`text-xl font-bold ${colors.text}`}>
          {genre}
        </h2>
        <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
          {books.length} {books.length === 1 ? 'book' : 'books'}
        </span>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {books.map(book => (
          <BookCard key={book.id} book={book} onClick={() => onBookClick(book)} />
        ))}
      </div>
    </section>
  );
}
