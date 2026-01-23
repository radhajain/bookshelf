# Shelf

A personal content curation and sharing platform. Build your digital shelf of books, movies, and podcasts.
<img width="1379" height="1200" alt="CleanShot 2026-01-23 at 16 06 52" src="https://github.com/user-attachments/assets/513c2066-ac97-4937-a02e-77ee067cb489" />
<img width="1614" height="1192" alt="CleanShot 2026-01-23 at 16 09 43" src="https://github.com/user-attachments/assets/6410f88b-2974-4e54-acfb-3e509e12401a" />
<img width="1502" height="1190" alt="CleanShot 2026-01-23 at 16 07 34" src="https://github.com/user-attachments/assets/100d9ffd-dc17-4370-b4b6-2aacc17fdef7" />
<img width="1726" height="1183" alt="CleanShot 2026-01-23 at 16 08 36" src="https://github.com/user-attachments/assets/4bcc04d6-9ebc-430b-9675-f9d195a15081" />

## The Problem

We consume more content than ever - books we've read, movies we've watched, podcasts we've discovered - but there's no good way to:

- **Remember what we've consumed** - That great book from last year? The podcast episode a friend recommended? It's scattered across apps, notes, and memory.
- **Share our taste with others** - When someone asks "what should I read next?", we struggle to recall our favorites or share a curated list.
- **Discover through trusted sources** - Algorithm recommendations feel hollow. We trust friends, not feeds.

## The Solution

Shelf is your personal content library that you actually own and can share:

1. **Curate** - Add books, movies, and podcasts to your shelf. Import from CSV or add manually.
2. **Enrich** - Automatic metadata enrichment from multiple sources. See ratings, descriptions, and cover art.
3. **Organize** - Categorize by genre, add personal notes, mark priorities, and track read/watched status.
4. **Share** - Set a username and get a public profile URL. Share your curated taste with anyone.
5. **Discover** - Browse the shared library to find new content from other users.

## Features

### Content Support
- **Books** - Metadata from Google Books, Open Library, Goodreads, and Amazon
- **Movies** - Metadata from TMDB, IMDb, Rotten Tomatoes, Metacritic, and Letterboxd
- **Podcasts** - Metadata from Podcast Index and Apple Podcasts

### Core Features
- Email/password authentication via Supabase
- CSV bulk import for quick shelf building
- Smart metadata enrichment with rate limiting
- Genre-based organization with collapsible sections
- Personal notes and priority tagging
- Read/watched status tracking
- Shareable public profiles (`/u/username`)
- Deep linking to specific items
- AI-powered chat assistant for recommendations
- Responsive design for mobile and desktop

### Browse Library
- Browse all content added by users
- Filter by media type (books, movies, podcasts)
- Filter by genre
- Search by title or creator
- One-click add to your shelf

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Email/Password
- **Styling**: Tailwind CSS 4
- **APIs**: Google Books, Open Library, TMDB, Podcast Index
- **AI**: Claude for chat recommendations

## Project Structure

```
app/
├── components/
│   ├── shared/           # Reusable UI components (Modal, Sidebar, ContentCard, etc.)
│   ├── books/            # Book-specific components
│   ├── movies/           # Movie-specific components
│   ├── podcasts/         # Podcast-specific components
│   └── auth/             # Authentication components
├── lib/
│   ├── types/            # TypeScript types and shared content configs
│   ├── supabase/         # Supabase client configuration
│   └── *.ts              # API helpers (bookApi, movieApi, podcastApi)
├── api/                  # API routes
├── dashboard/            # My Shelf page
├── browse/               # Browse Library page
└── u/[username]/         # Public profile pages
```

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TMDB_API_KEY=your_tmdb_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key  # Optional, for chat feature
```

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Roadmap

- [ ] Music albums and playlists
- [ ] Follow other users
- [ ] Activity feed from people you follow
- [ ] Lists and collections
- [ ] Import from Goodreads, Letterboxd, etc.
- [ ] TV shows with episode tracking

## License

MIT
