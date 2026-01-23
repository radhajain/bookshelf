# Shelf

A palce for good content. Build your shelf of books, movies, and podcasts.
<img width="1379" height="1200" alt="CleanShot 2026-01-23 at 16 06 52" src="https://github.com/user-attachments/assets/513c2066-ac97-4937-a02e-77ee067cb489" />
<img width="1614" height="1192" alt="CleanShot 2026-01-23 at 16 09 43" src="https://github.com/user-attachments/assets/6410f88b-2974-4e54-acfb-3e509e12401a" />
<img width="1502" height="1190" alt="CleanShot 2026-01-23 at 16 07 34" src="https://github.com/user-attachments/assets/100d9ffd-dc17-4370-b4b6-2aacc17fdef7" />
<img width="1726" height="1183" alt="CleanShot 2026-01-23 at 16 08 36" src="https://github.com/user-attachments/assets/4bcc04d6-9ebc-430b-9675-f9d195a15081" />

## The Problem

Share content w friends in a single platform

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


## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Database**: Supabase PostgreSQL
- **Auth**: Supabase Email/Password
- **Styling**: Tailwind CSS 4
- **APIs**: Google Books, Open Library, TMDB, Podcast Index
- **AI**: Claude for chat recommendations


## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- TMDB api key
- OMDB api key
- Anthropic api key

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

- [ ] TV shows
- [ ] Follow other users
- [ ] 'Current' shelf
- [ ] Integration with spotify, goodreads etc

