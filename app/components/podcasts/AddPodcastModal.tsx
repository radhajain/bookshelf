'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AddPodcastModalProps {
  onClose: () => void;
  onPodcastAdded: () => void;
}

interface PodcastSearchResult {
  itunesId: string;
  title: string;
  creator?: string;
  coverImage?: string;
  episodeCount?: number;
  genres?: string[];
  feedUrl?: string;
}

type WizardStep = 'form' | 'select' | 'confirm';

export default function AddPodcastModal({ onClose, onPodcastAdded }: AddPodcastModalProps) {
  const [step, setStep] = useState<WizardStep>('form');

  // Form state
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('');

  // Search results state
  const [searchResults, setSearchResults] = useState<PodcastSearchResult[]>([]);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastSearchResult | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const searchPodcasts = async (searchTitle: string) => {
    setSearching(true);
    setError('');

    try {
      const response = await fetch(`/api/podcasts/search?q=${encodeURIComponent(searchTitle)}`);
      if (response.ok) {
        const data = await response.json();
        return data.results as PodcastSearchResult[];
      }
    } catch (err) {
      console.error('Error searching podcasts:', err);
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

    // Search for the podcast
    setSearching(true);
    const results = await searchPodcasts(title.trim());

    if (results.length > 1) {
      // Multiple matches - show selection step
      setSearchResults(results);
      setStep('select');
      return;
    } else if (results.length === 1) {
      // Single match - use it
      setSelectedPodcast(results[0]);
      setCreator(results[0].creator || '');
      setStep('confirm');
      return;
    }
    // No matches - proceed with just the title
    await addPodcast();
  };

  const handleSelectPodcast = (podcast: PodcastSearchResult) => {
    setSelectedPodcast(podcast);
    setTitle(podcast.title);
    setCreator(podcast.creator || '');
    setStep('confirm');
  };

  const handleBackToForm = () => {
    setStep('form');
    setSearchResults([]);
    setSelectedPodcast(null);
  };

  const addPodcast = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/user-podcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedPodcast?.title || title.trim(),
          creator: selectedPodcast?.creator || creator.trim() || null,
          itunes_id: selectedPodcast?.itunesId || null,
          cover_image: selectedPodcast?.coverImage || null,
          rss_feed_url: selectedPodcast?.feedUrl || null,
          total_episodes: selectedPodcast?.episodeCount || null,
          genres: selectedPodcast?.genres || null,
          notes: notes.trim() || null,
          priority: priority.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add podcast');
      }

      onPodcastAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add podcast');
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
          Podcast Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors"
          placeholder="Enter podcast title"
          autoFocus
        />
      </div>

      <div>
        <label htmlFor="creator" className="block text-sm font-medium text-zinc-700 mb-1">
          Host/Creator <span className="text-zinc-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          id="creator"
          value={creator}
          onChange={(e) => setCreator(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors"
          placeholder="Host or creator name"
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors bg-white"
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors resize-none"
          placeholder="Any notes about this podcast..."
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
          className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searching ? 'Searching...' : loading ? 'Adding...' : 'Add Podcast'}
        </button>
      </div>
    </form>
  );

  const renderSelectStep = () => (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <p className="text-zinc-600">
          Found multiple podcasts matching &quot;{title}&quot;
        </p>
        <p className="text-sm text-zinc-500">Select the intended one:</p>
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2">
        {searchResults.map((podcast) => (
          <button
            key={podcast.itunesId}
            onClick={() => handleSelectPodcast(podcast)}
            className="w-full flex gap-3 p-3 border border-zinc-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors text-left"
          >
            {podcast.coverImage ? (
              <Image
                src={podcast.coverImage}
                alt={podcast.title}
                width={48}
                height={48}
                className="w-12 h-12 object-cover rounded flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-zinc-200 rounded flex-shrink-0 flex items-center justify-center">
                <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-zinc-900 truncate">{podcast.title}</h3>
              {podcast.creator && (
                <p className="text-sm text-zinc-600 truncate">by {podcast.creator}</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                {podcast.episodeCount && (
                  <span className="text-xs text-zinc-400">{podcast.episodeCount} episodes</span>
                )}
                {podcast.genres && podcast.genres.length > 0 && (
                  <span className="text-xs text-purple-600">{podcast.genres[0]}</span>
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
            setSelectedPodcast(null);
            addPodcast();
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
        {selectedPodcast?.coverImage ? (
          <Image
            src={selectedPodcast.coverImage}
            alt={selectedPodcast.title}
            width={80}
            height={80}
            className="w-20 h-20 object-cover rounded shadow"
          />
        ) : (
          <div className="w-20 h-20 bg-zinc-200 rounded shadow flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
        )}
        <div className="flex-1">
          <h3 className="font-bold text-zinc-900">{selectedPodcast?.title || title}</h3>
          {(selectedPodcast?.creator || creator) && (
            <p className="text-zinc-600">by {selectedPodcast?.creator || creator}</p>
          )}
          {selectedPodcast?.episodeCount && (
            <p className="text-sm text-zinc-500">{selectedPodcast.episodeCount} episodes</p>
          )}
          {selectedPodcast?.genres && selectedPodcast.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedPodcast.genres.slice(0, 3).map((genre, i) => (
                <span key={i} className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  {genre}
                </span>
              ))}
            </div>
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors bg-white"
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
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-colors resize-none"
          placeholder="Any notes about this podcast..."
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
          onClick={addPodcast}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            {step === 'form' && 'Add a Podcast'}
            {step === 'select' && 'Select Podcast'}
            {step === 'confirm' && 'Confirm Podcast'}
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
