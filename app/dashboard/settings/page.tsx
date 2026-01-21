'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/auth/AuthProvider';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setDisplayName(profile.display_name || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim() || null,
          display_name: displayName.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setMessage({ type: 'success', text: 'Profile updated successfully!' });

      // Refresh the page to update the profile in AuthProvider
      window.location.reload();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-amber-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-6">Profile Settings</h2>

          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-500"
              />
            </div>

            {/* Display Name */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-zinc-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                placeholder="How you want to be called"
              />
              <p className="mt-1 text-sm text-zinc-500">
                This will be shown on your public profile
              </p>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-zinc-700 mb-1">
                Username
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-zinc-300 bg-zinc-50 text-zinc-500 text-sm">
                  /u/
                </span>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  className="flex-1 px-3 py-2 border border-zinc-300 rounded-r-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-colors"
                  placeholder="your-username"
                  pattern="[a-zA-Z0-9_-]{3,20}"
                />
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                3-20 characters, letters, numbers, underscores and hyphens only.
                {username && (
                  <span className="block mt-1">
                    Your public profile will be at{' '}
                    <Link
                      href={`/u/${username}`}
                      className="text-amber-600 hover:underline"
                      target="_blank"
                    >
                      /u/{username}
                    </Link>
                  </span>
                )}
                {!username && (
                  <span className="block mt-1 text-amber-600">
                    Set a username to make your bookshelf public
                  </span>
                )}
              </p>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Account Info */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 mb-4">Account</h2>
          <p className="text-sm text-zinc-500">
            Signed in as <span className="font-medium text-zinc-700">{user?.email}</span>
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
          </p>
        </div>
      </main>
    </div>
  );
}
