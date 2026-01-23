'use client';

import { useState, useEffect } from 'react';

interface RedThread {
  theme: string;
  description: string;
  examples: string[];
}

interface PacingPreference {
  style: string;
  description: string;
  indicators: string[];
}

interface EmotionalResonance {
  vibe_spectrum: string[];
  primary_vibe: string;
  description: string;
}

interface AntipathyProfile {
  likely_dislikes: string[];
  reasoning: string;
}

interface TasteProfile {
  id: string;
  red_threads: RedThread[];
  pacing_preference: PacingPreference;
  emotional_resonance: EmotionalResonance;
  antipathy_profile: AntipathyProfile;
  taste_vector_summary: string;
  items_at_generation: number;
  last_generated_at: string;
  generation_count: number;
}

interface TasteProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string; // Optional: for viewing other users' profiles
}

export default function TasteProfileModal({
  isOpen,
  onClose,
  userId,
}: TasteProfileModalProps) {
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsRegeneration, setNeedsRegeneration] = useState(false);
  const [hasEnoughItems, setHasEnoughItems] = useState(true);
  const [currentItemCount, setCurrentItemCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen, userId]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = userId
        ? `/api/taste-profile?userId=${userId}`
        : '/api/taste-profile';
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      setProfile(data.profile);
      setNeedsRegeneration(data.needsRegeneration);
      setHasEnoughItems(data.hasEnoughItems);
      setCurrentItemCount(data.currentItemCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateProfile = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/taste-profile', {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate profile');
      }

      setProfile(data.profile);
      setNeedsRegeneration(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  const isOwnProfile = !userId;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">
              Taste Profile
            </h2>
            <p className="text-sm text-zinc-600 mt-1">
              Your Latent Preference Architecture
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4" />
              <p className="text-zinc-500">Loading your taste profile...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchProfile}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : !profile ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-zinc-900 mb-2">
                Calculate your Latest Taste Preferemces
              </h3>
              {hasEnoughItems ? (
                <>
                  <p className="text-zinc-600 mb-6 max-w-md">
                    Let AI analyze your {currentItemCount} items to reveal the
                    hidden patterns in your cultural consumption — the themes
                    that captivate you, the pacing you crave, and the vibes that
                    resonate with your soul.
                  </p>
                  {isOwnProfile && (
                    <button
                      onClick={generateProfile}
                      disabled={generating}
                      className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {generating ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Analyzing Your Taste...
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          Generate My Taste Profile
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-zinc-600 max-w-md">
                  Add at least 5 items to your shelf to generate your taste
                  profile. You currently have {currentItemCount} item
                  {currentItemCount !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Regeneration Banner */}
              {needsRegeneration && isOwnProfile && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-amber-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span className="text-sm text-amber-800">
                      You&apos;ve added new items since your last analysis.
                      Regenerate for updated insights!
                    </span>
                  </div>
                  <button
                    onClick={generateProfile}
                    disabled={generating}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generating ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              )}

              {/* Taste Vector Summary - The Soul */}
              <section className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-8 text-white">
                <h3 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-4">
                  Your Cultural Soul
                </h3>
                <div className="prose prose-invert prose-lg max-w-none">
                  {profile.taste_vector_summary.split('\n\n').map((para, i) => (
                    <p key={i} className="text-zinc-200 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </section>

              {/* Red Threads */}
              <section>
                <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-red-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </span>
                  The Red Threads
                </h3>
                <p className="text-zinc-600 mb-4 text-sm">
                  Recurring philosophical and atmospheric themes across your
                  library
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {profile.red_threads.map((thread, i) => (
                    <div
                      key={i}
                      className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm"
                    >
                      <h4 className="font-semibold text-zinc-900 mb-2">
                        {thread.theme}
                      </h4>
                      <p className="text-sm text-zinc-600 mb-3">
                        {thread.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {thread.examples.map((ex, j) => (
                          <span
                            key={j}
                            className="text-xs bg-zinc-100 text-zinc-700 px-2 py-1 rounded-full"
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Pacing Preference */}
              <section>
                <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </span>
                  Pacing & Structure
                </h3>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl font-bold text-blue-900">
                      {profile.pacing_preference.style}
                    </span>
                  </div>
                  <p className="text-blue-800 mb-4">
                    {profile.pacing_preference.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.pacing_preference.indicators.map((ind, i) => (
                      <span
                        key={i}
                        className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* Emotional Resonance */}
              <section>
                <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </span>
                  Emotional Resonance
                </h3>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xl font-bold text-purple-900">
                      Primary Vibe: {profile.emotional_resonance.primary_vibe}
                    </span>
                  </div>
                  <p className="text-purple-800 mb-4">
                    {profile.emotional_resonance.description}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.emotional_resonance.vibe_spectrum.map((vibe, i) => (
                      <span
                        key={i}
                        className={`text-sm px-4 py-2 rounded-full font-medium ${
                          i === 0
                            ? 'bg-purple-200 text-purple-900'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {vibe}
                      </span>
                    ))}
                  </div>
                </div>
              </section>

              {/* Antipathy Profile */}
              <section>
                <h3 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-zinc-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                      />
                    </svg>
                  </span>
                  The Antipathy Profile
                </h3>
                <p className="text-zinc-600 mb-4 text-sm">
                  Based on what you love, here&apos;s what would likely grate
                  against your sensibilities
                </p>
                <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.antipathy_profile.likely_dislikes.map((dis, i) => (
                      <span
                        key={i}
                        className="text-sm bg-white text-zinc-700 px-3 py-1.5 rounded-full border border-zinc-300"
                      >
                        {dis}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-zinc-600 italic">
                    {profile.antipathy_profile.reasoning}
                  </p>
                </div>
              </section>

              {/* Meta info */}
              <div className="text-center text-sm text-zinc-400 pt-4 border-t border-zinc-100">
                Generated from {profile.items_at_generation} items •{' '}
                {new Date(profile.last_generated_at).toLocaleDateString()} •
                Version {profile.generation_count}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
