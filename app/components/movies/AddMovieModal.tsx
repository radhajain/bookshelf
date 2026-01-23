'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AddMovieModalProps {
  onClose: () => void;
  onMovieAdded: () => void;
}

interface MovieSearchResult {
  tmdbId: number;
  title: string;
  year?: number;
  director?: string;
  posterImage?: string;
  overview?: string;
  voteAverage?: number;
  voteCount?: number;
}

type WizardStep = 'form' | 'select' | 'confirm';

export default function AddMovieModal({ onClose, onMovieAdded }: AddMovieModalProps) {
  const [step, setStep] = useState<WizardStep>('form');

  // Form state
  const [title, setTitle] = useState('');
  const [director, setDirector] = useState('');
  const [year, setYear] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('');
  const [watched, setWatched] = useState(false);

  // Search results state
  const [searchResults, setSearchResults] = useState<MovieSearchResult[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MovieSearchResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const searchMovies = async (searchTitle: string) => {
    setSearching(true);
    setError('');

    try {
      const response = await fetch(`/api/movies/search?q=${encodeURIComponent(searchTitle)}`);
      if (response.ok) {
        const data = await response.json();
        return data.results as MovieSearchResult[];
      }
    } catch (err) {
      console.error('Error searching movies:', err);
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

    // Search for the movie
    setSearching(true);
    const results = await searchMovies(title.trim());

    if (results.length > 1) {
      // Multiple matches - show selection step
      setSearchResults(results);
      setStep('select');
      return;
    } else if (results.length === 1) {
      // Single match - use it
      setSelectedMovie(results[0]);
      setDirector(results[0].director || '');
      if (results[0].year) setYear(String(results[0].year));
      setStep('confirm');
      return;
    }
    // No matches - proceed with just the title
    await addMovie();
  };

  const handleSelectMovie = (movie: MovieSearchResult) => {
    setSelectedMovie(movie);
    setTitle(movie.title);
    setDirector(movie.director || '');
    if (movie.year) setYear(String(movie.year));
    setStep('confirm');
  };

  const handleBackToForm = () => {
    setStep('form');
    setSearchResults([]);
    setSelectedMovie(null);
  };

  const addMovie = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedMovie?.title || title.trim(),
          director: selectedMovie?.director || director.trim() || null,
          year: selectedMovie?.year || (year ? parseInt(year, 10) : null),
          tmdb_id: selectedMovie?.tmdbId || null,
          notes: notes.trim() || null,
          priority: priority.trim() || null,
          watched,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add movie');
      }

      onMovieAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add movie');
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
          placeholder="Enter movie title"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="director" className="block text-sm font-medium text-zinc-700 mb-1">
            Director <span className="text-zinc-400 text-xs">(optional)</span>
          </label>
          <input
            type="text"
            id="director"
            value={director}
            onChange={(e) => setDirector(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            placeholder="Director name"
          />
        </div>
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-zinc-700 mb-1">
            Year <span className="text-zinc-400 text-xs">(optional)</span>
          </label>
          <input
            type="number"
            id="year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            placeholder="1994"
            min="1800"
            max="2100"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-zinc-700 mb-1">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
          >
            <option value="">No priority</option>
            <option value="A">A - High</option>
            <option value="B">B - Medium</option>
            <option value="C">C - Low</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={watched}
              onChange={(e) => setWatched(e.target.checked)}
              className="w-4 h-4 text-blue-500 border-zinc-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-700">Already watched</span>
          </label>
        </div>
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
          placeholder="Any notes about this movie..."
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
          className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searching ? 'Searching...' : loading ? 'Adding...' : 'Add Movie'}
        </button>
      </div>
    </form>
  );

  const renderSelectStep = () => (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <p className="text-zinc-600">
          Found multiple movies with the title &quot;{title}&quot;
        </p>
        <p className="text-sm text-zinc-500">Select the intended one:</p>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {searchResults.map((movie) => (
          <button
            key={movie.tmdbId}
            onClick={() => handleSelectMovie(movie)}
            className="w-full flex gap-3 p-3 border border-zinc-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
          >
            {movie.posterImage ? (
              <Image
                src={movie.posterImage}
                alt={movie.title}
                width={48}
                height={72}
                className="w-12 h-18 object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-18 bg-zinc-200 rounded flex-shrink-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-zinc-900 truncate">{movie.title}</h3>
              {movie.director && (
                <p className="text-sm text-zinc-600 truncate">dir. {movie.director}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {movie.year && (
                  <span className="text-xs text-zinc-400">{movie.year}</span>
                )}
                {movie.voteAverage && (
                  <span className="text-xs text-amber-600 flex items-center gap-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {movie.voteAverage.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="border-t pt-4">
        <button
          onClick={() => {
            // Add with just the title (no match)
            setSelectedMovie(null);
            addMovie();
          }}
          className="w-full px-4 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 font-medium rounded-lg transition-colors text-sm"
        >
          None of these - add &quot;{title}&quot; manually
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
        {selectedMovie?.posterImage ? (
          <Image
            src={selectedMovie.posterImage}
            alt={selectedMovie.title}
            width={80}
            height={120}
            className="w-20 h-30 object-cover rounded shadow"
          />
        ) : (
          <div className="w-20 h-30 bg-zinc-200 rounded shadow flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-zinc-900">{selectedMovie?.title || title}</h3>
          {(selectedMovie?.director || director) && (
            <p className="text-zinc-600">dir. {selectedMovie?.director || director}</p>
          )}
          {(selectedMovie?.year || year) && (
            <p className="text-sm text-zinc-500">{selectedMovie?.year || year}</p>
          )}
          {selectedMovie?.overview && (
            <p className="text-sm text-zinc-500 mt-2 line-clamp-3">{selectedMovie.overview}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="priority-confirm" className="block text-sm font-medium text-zinc-700 mb-1">
            Priority
          </label>
          <select
            id="priority-confirm"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
          >
            <option value="">No priority</option>
            <option value="A">A - High</option>
            <option value="B">B - Medium</option>
            <option value="C">C - Low</option>
          </select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={watched}
              onChange={(e) => setWatched(e.target.checked)}
              className="w-4 h-4 text-blue-500 border-zinc-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-zinc-700">Already watched</span>
          </label>
        </div>
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
          placeholder="Any notes about this movie..."
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
          onClick={addMovie}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add to Collection'}
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
            {step === 'form' && 'Add a Movie'}
            {step === 'select' && 'Select Movie'}
            {step === 'confirm' && 'Confirm Movie'}
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
