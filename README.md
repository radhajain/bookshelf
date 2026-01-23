# Shelf

A personal content curation and sharing platform. Build your digital shelf of books, movies, podcasts, and more.

## The Problem

We consume more content than ever - books we've read, movies we've watched, podcasts we've discovered - but there's no good way to:

- **Remember what we've consumed** - That great book from last year? The podcast episode a friend recommended? It's scattered across apps, notes, and memory.
- **Share our taste with others** - When someone asks "what should I read next?", we struggle to recall our favorites or share a curated list.
- **Discover through trusted sources** - Algorithm recommendations feel hollow. We trust friends, not feeds.

## The Solution

Shelf is your personal content library that you actually own and can share:

1. **Curate** - Add books, movies, podcasts to your shelf. Import from CSV or add manually.
2. **Enrich** - Automatic metadata enrichment from Google Books, Open Library, and more. See ratings, descriptions, and cover art.
3. **Organize** - Categorize by genre, add personal notes, mark priorities.
4. **Share** - Set a username and get a public profile URL. Share your curated taste with anyone.

## Features

- Phone OTP authentication via Supabase
- CSV bulk import for quick shelf building
- Automatic book metadata from Google Books and Open Library
- Smart author detection with manual override
- Genre-based organization with collapsible sections
- Shareable public profiles (`/u/username`)
- Deep linking to specific items
- Responsive design for mobile and desktop

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Phone OTP
- **Styling**: Tailwind CSS
- **APIs**: Google Books, Open Library

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Roadmap

- [ ] Movies and TV shows support
- [ ] Podcast episode tracking
- [ ] Music albums and playlists
- [ ] Follow other users
- [ ] Activity feed from people you follow
- [ ] Lists and collections
- [ ] Import from Goodreads, Letterboxd, etc.

## License

MIT
