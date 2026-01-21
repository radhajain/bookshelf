'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AddBookModalProps {
  onClose: () => void;
  onBookAdded: () => void;
}

interface BookSearchResult {
  googleId: string;
  title: string;
  author?: string;
  description?: string;
  coverImage?: string;
  publishedDate?: string;
  publisher?: string;
}

type WizardStep = 'form' | 'select' | 'confirm';

export default function AddBookModal({ onClose, onBookAdded }: AddBookModalProps) {
  const [step, setStep] = useState<WizardStep>('form');

  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('');

  // Search results state
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const searchBooks = async (searchTitle: string) => {
    setSearching(true);
    setError('');

    try {
      const response = await fetch(`/api/books/search?q=${encodeURIComponent(searchTitle)}`);
      if (response.ok) {
        const data = await response.json();
        return data.results as BookSearchResult[];
      }
    } catch (err) {
      console.error('Error searching books:', err);
    } finally {
      setSearching(false);
    }
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    // If author is not provided, search for the book
    if (!author.trim()) {
      setSearching(true);
      const results = await searchBooks(title.trim());

      if (results.length > 1) {
        // Multiple matches - show selection step
        setSearchResults(results);
        setStep('select');
        return;
      } else if (results.length === 1) {
        // Single match - use it
        setSelectedBook(results[0]);
        setAuthor(results[0].author || '');
      }
      // No matches - proceed with just the title
    }

    // Proceed to add the book
    await addBook();
  };

  const handleSelectBook = (book: BookSearchResult) => {
    setSelectedBook(book);
    setTitle(book.title);
    setAuthor(book.author || '');
    setStep('confirm');
  };

  const handleBackToForm = () => {
    setStep('form');
    setSearchResults([]);
    setSelectedBook(null);
  };

  const addBook = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedBook?.title || title.trim(),
          author: selectedBook?.author || author.trim() || null,
          notes: notes.trim() || null,
          priority: priority.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add book');
      }

      onBookAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  const renderFormStep = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-zinc-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
          placeholder="Enter book title"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="author" className="block text-sm font-medium text-zinc-700 mb-1">
          Author <span className="text-zinc-400 text-xs">(leave blank to search)</span>
        </label>
        <input
          type="text"
          id="author"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
          placeholder="Enter author name"
        />
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-zinc-700 mb-1">
          Priority
        </label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors bg-white"
        >
          <option value="">No priority</option>
          <option value="A">A - High</option>
          <option value="B">B - Medium</option>
          <option value="C">C - Low</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-zinc-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors resize-none"
          placeholder="Any notes about this book..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 font-medium rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || searching}
          className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searching ? 'Searching...' : loading ? 'Adding...' : 'Add Book'}
        </button>
      </div>
    </form>
  );

  const renderSelectStep = () => (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <p className="text-zinc-600">
          Found multiple books with the title &quot;{title}&quot;
        </p>
        <p className="text-sm text-zinc-500">Select the intended one:</p>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {searchResults.map((book) => (
          <button
            key={book.googleId}
            onClick={() => handleSelectBook(book)}
            className="w-full flex gap-3 p-3 border border-zinc-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors text-left"
          >
            {book.coverImage ? (
              <Image
                src={book.coverImage}
                alt={book.title}
                width={48}
                height={72}
                className="w-12 h-18 object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-18 bg-zinc-200 rounded flex-shrink-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-zinc-900 truncate">{book.title}</h3>
              {book.author && (
                <p className="text-sm text-zinc-600 truncate">by {book.author}</p>
              )}
              {book.publishedDate && (
                <p className="text-xs text-zinc-400">{book.publishedDate}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="border-t pt-4">
        <button
          onClick={() => {
            // Add with just the title (no author match)
            setSelectedBook(null);
            addBook();
          }}
          className="w-full px-4 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 font-medium rounded-lg transition-colors text-sm"
        >
          None of these - add &quot;{title}&quot; without author
        </button>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleBackToForm}
          className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 font-medium rounded-lg transition-colors"
        >
          Back
        </button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex gap-4 p-4 bg-zinc-50 rounded-lg">
        {selectedBook?.coverImage ? (
          <Image
            src={selectedBook.coverImage}
            alt={selectedBook.title}
            width={80}
            height={120}
            className="w-20 h-30 object-cover rounded shadow"
          />
        ) : (
          <div className="w-20 h-30 bg-zinc-200 rounded shadow flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-zinc-900">{selectedBook?.title || title}</h3>
          {(selectedBook?.author || author) && (
            <p className="text-zinc-600">by {selectedBook?.author || author}</p>
          )}
          {selectedBook?.publishedDate && (
            <p className="text-sm text-zinc-500">{selectedBook.publishedDate}</p>
          )}
          {selectedBook?.description && (
            <p className="text-sm text-zinc-500 mt-2 line-clamp-3">{selectedBook.description}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="priority-confirm" className="block text-sm font-medium text-zinc-700 mb-1">
          Priority
        </label>
        <select
          id="priority-confirm"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors bg-white"
        >
          <option value="">No priority</option>
          <option value="A">A - High</option>
          <option value="B">B - Medium</option>
          <option value="C">C - Low</option>
        </select>
      </div>

      <div>
        <label htmlFor="notes-confirm" className="block text-sm font-medium text-zinc-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes-confirm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors resize-none"
          placeholder="Any notes about this book..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleBackToForm}
          className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 font-medium rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={addBook}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add to Shelf'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-zinc-900">
            {step === 'form' && 'Add a Book'}
            {step === 'select' && 'Select Book'}
            {step === 'confirm' && 'Confirm Book'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'form' && renderFormStep()}
        {step === 'select' && renderSelectStep()}
        {step === 'confirm' && renderConfirmStep()}
      </div>
    </div>
  );
}
