'use client';

import { useState } from 'react';
import Image from 'next/image';
import { WatchingStatus, WATCHING_STATUS_LABELS } from '../../lib/tvshows';

interface AddTVShowModalProps {
  onClose: () => void;
  onTVShowAdded: () => void;
}

interface TVShowSearchResult {
  tmdbId: number;
  title: string;
  firstAirDate?: string;
  creator?: string;
  posterImage?: string;
  overview?: string;
  voteAverage?: number;
  voteCount?: number;
  networks?: string[];
}

type WizardStep = 'form' | 'select' | 'confirm';

export default function AddTVShowModal({ onClose, onTVShowAdded }: AddTVShowModalProps) {
  const [step, setStep] = useState<WizardStep>('form');

  // Form state
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('');
  const [watchingStatus, setWatchingStatus] = useState<WatchingStatus>('want_to_watch');

  // Search results state
  const [searchResults, setSearchResults] = useState<TVShowSearchResult[]>([]);
  const [selectedTVShow, setSelectedTVShow] = useState<TVShowSearchResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const searchTVShows = async (searchTitle: string) => {
    setSearching(true);
    setError('');

    try {
      const response = await fetch(`/api/tvshows/search?q=${encodeURIComponent(searchTitle)}`);
      if (response.ok) {
        const data = await response.json();
        return data.results as TVShowSearchResult[];
      }
    } catch (err) {
      console.error('Error searching TV shows:', err);
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

    // Search for the TV show
    setSearching(true);
    const results = await searchTVShows(title.trim());

    if (results.length > 1) {
      // Multiple matches - show selection step
      setSearchResults(results);
      setStep('select');
      return;
    } else if (results.length === 1) {
      // Single match - use it
      setSelectedTVShow(results[0]);
      setCreator(results[0].creator || '');
      setStep('confirm');
      return;
    }
    // No matches - proceed with just the title
    await addTVShow();
  };

  const handleSelectTVShow = (tvshow: TVShowSearchResult) => {
    setSelectedTVShow(tvshow);
    setTitle(tvshow.title);
    setCreator(tvshow.creator || '');
    setStep('confirm');
  };

  const handleBackToForm = () => {
    setStep('form');
    setSearchResults([]);
    setSelectedTVShow(null);
  };

  const addTVShow = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user-tvshows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedTVShow?.title || title.trim(),
          creator: selectedTVShow?.creator || creator.trim() || null,
          first_air_date: selectedTVShow?.firstAirDate || null,
          tmdb_id: selectedTVShow?.tmdbId || null,
          notes: notes.trim() || null,
          priority: priority.trim() || null,
          watching_status: watchingStatus,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add TV show');
      }

      onTVShowAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add TV show');
    } finally {
      setLoading(false);
    }
  };

  const getYearFromDate = (dateStr?: string) => {
    if (!dateStr) return null;
    return dateStr.substring(0, 4);
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
          placeholder="Enter TV show title"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="creator" className="block text-sm font-medium text-zinc-700 mb-1">
          Creator <span className="text-zinc-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="creator"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
          placeholder="Creator/Showrunner name"
        />
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
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors bg-white"
          >
            <option value="">No priority</option>
            <option value="A">A - High</option>
            <option value="B">B - Medium</option>
            <option value="C">C - Low</option>
          </select>
        </div>
        <div>
          <label htmlFor="watching-status" className="block text-sm font-medium text-zinc-700 mb-1">
            Status
          </label>
          <select
            id="watching-status"
            value={watchingStatus}
            onChange={(e) => setWatchingStatus(e.target.value as WatchingStatus)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors bg-white"
          >
            {Object.entries(WATCHING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors resize-none"
          placeholder="Any notes about this TV show..."
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
          className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searching ? 'Searching...' : loading ? 'Adding...' : 'Add TV Show'}
        </button>
      </div>
    </form>
  );

  const renderSelectStep = () => (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <p className="text-zinc-600">
          Found multiple TV shows with the title &quot;{title}&quot;
        </p>
        <p className="text-sm text-zinc-500">Select the intended one:</p>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {searchResults.map((tvshow) => (
          <button
            key={tvshow.tmdbId}
            onClick={() => handleSelectTVShow(tvshow)}
            className="w-full flex gap-3 p-3 border border-zinc-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
          >
            {tvshow.posterImage ? (
              <Image
                src={tvshow.posterImage}
                alt={tvshow.title}
                width={48}
                height={72}
                className="w-12 h-18 object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-18 bg-zinc-200 rounded flex-shrink-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-zinc-900 truncate">{tvshow.title}</h3>
              {tvshow.creator && (
                <p className="text-sm text-zinc-600 truncate">by {tvshow.creator}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {tvshow.firstAirDate && (
                  <span className="text-xs text-zinc-400">{getYearFromDate(tvshow.firstAirDate)}</span>
                )}
                {tvshow.voteAverage && (
                  <span className="text-xs text-amber-600 flex items-center gap-0.5">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {tvshow.voteAverage.toFixed(1)}
                  </span>
                )}
                {tvshow.networks && tvshow.networks.length > 0 && (
                  <span className="text-xs text-zinc-500">{tvshow.networks[0]}</span>
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
            setSelectedTVShow(null);
            addTVShow();
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
        {selectedTVShow?.posterImage ? (
          <Image
            src={selectedTVShow.posterImage}
            alt={selectedTVShow.title}
            width={80}
            height={120}
            className="w-20 h-30 object-cover rounded shadow"
          />
        ) : (
          <div className="w-20 h-30 bg-zinc-200 rounded shadow flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-zinc-900">{selectedTVShow?.title || title}</h3>
          {(selectedTVShow?.creator || creator) && (
            <p className="text-zinc-600">by {selectedTVShow?.creator || creator}</p>
          )}
          {selectedTVShow?.firstAirDate && (
            <p className="text-sm text-zinc-500">{getYearFromDate(selectedTVShow.firstAirDate)}</p>
          )}
          {selectedTVShow?.networks && selectedTVShow.networks.length > 0 && (
            <p className="text-sm text-zinc-500">{selectedTVShow.networks.join(', ')}</p>
          )}
          {selectedTVShow?.overview && (
            <p className="text-sm text-zinc-500 mt-2 line-clamp-3">{selectedTVShow.overview}</p>
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
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors bg-white"
          >
            <option value="">No priority</option>
            <option value="A">A - High</option>
            <option value="B">B - Medium</option>
            <option value="C">C - Low</option>
          </select>
        </div>
        <div>
          <label htmlFor="watching-status-confirm" className="block text-sm font-medium text-zinc-700 mb-1">
            Status
          </label>
          <select
            id="watching-status-confirm"
            value={watchingStatus}
            onChange={(e) => setWatchingStatus(e.target.value as WatchingStatus)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors bg-white"
          >
            {Object.entries(WATCHING_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors resize-none"
          placeholder="Any notes about this TV show..."
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
          onClick={addTVShow}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            {step === 'form' && 'Add a TV Show'}
            {step === 'select' && 'Select TV Show'}
            {step === 'confirm' && 'Confirm TV Show'}
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
