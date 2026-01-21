'use client';

import Link from 'next/link';
import { useAuth } from './components/auth/AuthProvider';
import Bookshelf from './components/Bookshelf';

export default function Home() {
  const { user, loading } = useAuth();

  return (
    <div className="relative">
      {/* Auth Header */}
      <div className="fixed top-4 right-4 z-50">
        {loading ? (
          <div className="w-8 h-8 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
        ) : user ? (
          <div className="flex gap-2">
            <Link
              href="/browse"
              className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 font-medium rounded-lg shadow-lg transition-colors border border-zinc-200"
            >
              Browse Library
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-lg transition-colors"
            >
              My Bookshelf
            </Link>
          </div>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/browse"
              className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-700 font-medium rounded-lg shadow-lg transition-colors border border-zinc-200"
            >
              Browse Library
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-lg transition-colors"
            >
              Log In
            </Link>
          </div>
        )}
      </div>

      {/* Demo Bookshelf */}
      <Bookshelf />
    </div>
  );
}
