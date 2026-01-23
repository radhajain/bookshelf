# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Jack Bookshelf ("Shelf") is a personal content curation and sharing platform built with Next.js. Users can track books, movies, and podcasts they've consumed, with automatic metadata enrichment from external APIs.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Auth**: Supabase Email/Password authentication
- **Styling**: Tailwind CSS v4
- **APIs**: Google Books, Open Library, TMDB (movies), Apple iTunes (podcasts)
- **AI**: Anthropic SDK for genre deduction

## Common Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # Run ESLint
npm start        # Start production server
```

## Project Structure

```
app/
├── api/              # API routes
│   ├── books/        # Book CRUD and search
│   ├── movies/       # Movie CRUD and search
│   ├── podcasts/     # Podcast CRUD and search
│   ├── user-books/   # User's book collection
│   ├── user-movies/  # User's movie collection
│   ├── user-podcasts/# User's podcast collection
│   ├── deduce-genre/ # AI-powered genre detection
│   ├── parse-csv/    # CSV import functionality
│   └── profile/      # User profile management
├── components/       # React components
│   ├── auth/         # Authentication UI
│   ├── books/        # Book-related components
│   ├── movies/       # Movie-related components
│   └── podcasts/     # Podcast-related components
├── lib/              # Shared utilities
│   ├── supabase/     # Supabase client setup
│   ├── types/        # TypeScript type definitions
│   ├── bookApi.ts    # Google Books/Open Library integration
│   ├── movieApi.ts   # TMDB API integration
│   ├── podcastApi.ts # Apple iTunes API integration
│   ├── books.ts      # Book database operations
│   ├── movies.ts     # Movie database operations
│   └── podcasts.ts   # Podcast database operations
├── browse/           # Content discovery pages
├── dashboard/        # User dashboard
├── login/            # Auth pages
└── u/                # Public user profiles (/u/username)
scripts/              # SQL migration scripts
```

## Architecture Notes

- **Path alias**: Use `@/*` to import from the app root (e.g., `@/app/lib/books`)
- **Supabase clients**: Use `createClient()` from `@/app/lib/supabase/server` for server components and API routes; use `createBrowserClient()` for client components
- **API routes**: Follow Next.js App Router conventions with `route.ts` files
- **Components**: Server components by default; add `'use client'` directive for interactive components

## Database Schema

Main tables in Supabase:
- `profiles` - User profiles with usernames
- `books` - Book metadata (enriched from APIs)
- `user_books` - Junction table linking users to their books (with read_status)
- `movies` - Movie metadata (from TMDB)
- `user_movies` - Junction table linking users to their movies
- `podcasts` - Podcast metadata (from Apple iTunes)
- `user_podcasts` - Junction table linking users to their podcasts

RLS policies ensure users can only modify their own data while public profiles are readable by anyone.

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `ANTHROPIC_API_KEY` - For AI genre deduction (optional)

## Key Patterns

1. **Metadata Enrichment**: When adding content, the app searches external APIs (Google Books, TMDB, iTunes) to fetch cover images, descriptions, ratings, etc.

2. **Genre Organization**: Content is organized by genre with collapsible sections on user profiles.

3. **CSV Import**: Users can bulk import content from CSV files via the `/api/parse-csv` endpoint.

4. **Public Profiles**: Users set a username to get a shareable profile at `/u/[username]`.
