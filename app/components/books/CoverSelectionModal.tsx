'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface CoverOption {
  url: string;
  source: string;
  size?: string;
}

interface CoverSelectionModalProps {
  bookId: string;
  bookTitle: string;
  currentCover?: string;
  onClose: () => void;
  onCoverSelected: (coverUrl: string) => void;
}

export default function CoverSelectionModal({
  bookId,
  bookTitle,
  currentCover,
  onClose,
  onCoverSelected,
}: CoverSelectionModalProps) {
  const [covers, setCovers] = useState<CoverOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [selectedCover, setSelectedCover] = useState<string | null>(currentCover || null);

  useEffect(() => {
    const fetchCovers = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/books/${bookId}/covers`);
        if (response.ok) {
          const data = await response.json();
          setCovers(data.covers || []);
        } else {
          setError('Failed to load cover options');
        }
      } catch (err) {
        console.error('Error fetching covers:', err);
        setError('Failed to load cover options');
      } finally {
        setLoading(false);
      }
    };

    fetchCovers();
  }, [bookId]);

  const handleSave = async () => {
    if (!selectedCover) return;

    setUpdating(true);
    setError('');

    try {
      const response = await fetch(`/api/books/${bookId}/covers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverUrl: selectedCover }),
      });

      if (response.ok) {
        onCoverSelected(selectedCover);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update cover');
      }
    } catch (err) {
      console.error('Error updating cover:', err);
      setError('Failed to update cover');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Choose Cover</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Select a cover image for &quot;{bookTitle}&quot;
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-3" />
            <p className="text-sm text-zinc-500">Loading cover options...</p>
          </div>
        ) : covers.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-12 h-12 text-zinc-300 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-zinc-500">No cover images found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {covers.map((cover, index) => (
              <button
                key={`${cover.source}-${index}`}
                onClick={() => setSelectedCover(cover.url)}
                className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                  selectedCover === cover.url
                    ? 'border-amber-500 ring-2 ring-amber-200'
                    : 'border-zinc-200 hover:border-amber-300'
                }`}
              >
                <div className="aspect-[2/3] relative bg-zinc-100">
                  <Image
                    src={cover.url}
                    alt={`Cover option from ${cover.source}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 40vw, 180px"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                {/* Source badge */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white font-medium">
                      {cover.source}
                    </span>
                    {cover.size && (
                      <span className="text-[10px] text-white/70">
                        {cover.size}
                      </span>
                    )}
                  </div>
                </div>
                {/* Selection indicator */}
                {selectedCover === cover.url && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-6 border-t mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-zinc-700 bg-zinc-100 hover:bg-zinc-200 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedCover || updating || selectedCover === currentCover}
            className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? 'Saving...' : 'Use This Cover'}
          </button>
        </div>
      </div>
    </div>
  );
}
