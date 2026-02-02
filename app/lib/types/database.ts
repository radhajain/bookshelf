// Database types matching the Supabase schema

export interface DbBook {
  id: string;
  title: string;
  author: string | null;
  genre: string;
  cover_image: string | null;
  description: string | null;
  isbn: string | null;
  published_date: string | null;
  publisher: string | null;
  page_count: number | null;
  // Cached rating data from APIs
  google_rating: number | null;
  google_ratings_count: number | null;
  open_library_rating: number | null;
  open_library_ratings_count: number | null;
  goodreads_url: string | null;
  amazon_url: string | null;
  subjects: string[] | null;
  details_fetched_at: string | null;
  // Flag for books that need author clarification (multiple authors found)
  needs_author_clarification: boolean;
  created_at: string;
}

export interface DbProfile {
  id: string;
  email: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
}

export interface DbUserBook {
  id: string;
  user_id: string;
  book_id: string;
  notes: string | null;
  priority: string | null;
  read: boolean;
  read_at: string | null;
  reading_status: 'want_to_read' | 'reading' | 'read' | null;
  created_at: string;
}

// Joined type for fetching user's books with book details
export interface UserBookWithDetails extends DbUserBook {
  book: DbBook;
}

// Input types for creating/updating
export interface CreateBookInput {
  title: string;
  author?: string;
}

export interface CreateUserBookInput {
  book_id: string;
  notes?: string;
  priority?: string;
}

export interface UpdateUserBookInput {
  notes?: string;
  priority?: string;
  read?: boolean;
  read_at?: string | null;
  reading_status?: 'want_to_read' | 'reading' | 'read';
}

export interface UpdateBookInput {
  genre?: string;
}

export interface UpdateProfileInput {
  username?: string | null;
  display_name?: string | null;
}

// =============================================
// Movie Types
// =============================================

export interface DbMovie {
  id: string;
  title: string;
  director: string | null;
  year: number | null;
  runtime_minutes: number | null;
  poster_image: string | null;
  backdrop_image: string | null;
  description: string | null;
  tagline: string | null;
  // External IDs
  tmdb_id: number | null;
  imdb_id: string | null;
  // Cached rating data from APIs
  tmdb_rating: number | null;
  tmdb_ratings_count: number | null;
  rotten_tomatoes_score: number | null;
  rotten_tomatoes_audience_score: number | null;
  metacritic_score: number | null;
  imdb_rating: number | null;
  imdb_ratings_count: number | null;
  // Additional metadata
  cast_members: string[] | null;
  genres: string[] | null;
  release_date: string | null;
  budget: number | null;
  revenue: number | null;
  production_companies: string[] | null;
  // Links
  imdb_url: string | null;
  letterboxd_url: string | null;
  // Caching and tracking
  details_fetched_at: string | null;
  created_at: string;
}

export interface DbUserMovie {
  id: string;
  user_id: string;
  movie_id: string;
  genre: string | null;
  notes: string | null;
  priority: string | null;
  watched: boolean;
  watched_at: string | null;
  rating: number | null;
  created_at: string;
}

// Joined type for fetching user's movies with movie details
export interface UserMovieWithDetails extends DbUserMovie {
  movie: DbMovie;
}

// Input types for creating/updating movies
export interface CreateMovieInput {
  title: string;
  director?: string;
  year?: number;
}

export interface CreateUserMovieInput {
  movie_id: string;
  genre?: string;
  notes?: string;
  priority?: string;
  watched?: boolean;
}

export interface UpdateUserMovieInput {
  genre?: string;
  notes?: string;
  priority?: string;
  watched?: boolean;
  watched_at?: string;
  rating?: number;
}

export interface UpdateMovieInput {
  director?: string;
  year?: number;
  genres?: string[];
}

// =============================================
// Podcast Types
// =============================================

export interface DbPodcast {
  id: string;
  title: string;
  creator: string | null;
  description: string | null;
  cover_image: string | null;
  // External IDs
  podcast_index_id: number | null;
  itunes_id: string | null;
  rss_feed_url: string | null;
  // Cached data from APIs
  podcast_index_rating: number | null;
  itunes_rating: number | null;
  itunes_ratings_count: number | null;
  total_episodes: number | null;
  // Additional metadata
  genres: string[] | null;
  language: string | null;
  publisher: string | null;
  website_url: string | null;
  // Caching and tracking
  details_fetched_at: string | null;
  created_at: string;
}

export interface DbUserPodcast {
  id: string;
  user_id: string;
  podcast_id: string;
  genre: string | null;
  notes: string | null;
  priority: string | null;
  listening_status: 'want_to_listen' | 'listening' | 'listened' | null;
  created_at: string;
}

// Joined type for fetching user's podcasts with podcast details
export interface UserPodcastWithDetails extends DbUserPodcast {
  podcast: DbPodcast;
}

// Input types for creating/updating podcasts
export interface CreatePodcastInput {
  title: string;
  creator?: string;
}

export interface CreateUserPodcastInput {
  podcast_id: string;
  genre?: string;
  notes?: string;
  priority?: string;
}

export interface UpdateUserPodcastInput {
  genre?: string;
  notes?: string;
  priority?: string;
  listening_status?: 'want_to_listen' | 'listening' | 'listened';
}

export interface UpdatePodcastInput {
  creator?: string;
  genres?: string[];
}

// =============================================
// Article Types
// =============================================

export interface DbArticle {
  id: string;
  title: string;
  author: string | null;
  publication: string | null;
  publication_date: string | null;
  article_url: string;
  description: string | null;
  thumbnail_image: string | null;
  section: string | null;
  reading_time_minutes: number | null;
  word_count: number | null;
  subjects: string[] | null;
  details_fetched_at: string | null;
  created_at: string;
}

export interface DbUserArticle {
  id: string;
  user_id: string;
  article_id: string;
  genre: string | null;
  notes: string | null;
  priority: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

// Joined type for fetching user's articles with article details
export interface UserArticleWithDetails extends DbUserArticle {
  article: DbArticle;
}

// Input types for creating/updating articles
export interface CreateArticleInput {
  title: string;
  article_url: string;
  author?: string;
  publication?: string;
}

export interface CreateUserArticleInput {
  article_id: string;
  genre?: string;
  notes?: string;
  priority?: string;
  read?: boolean;
}

export interface UpdateUserArticleInput {
  genre?: string;
  notes?: string;
  priority?: string;
  read?: boolean;
  read_at?: string | null;
}

export interface UpdateArticleInput {
  author?: string;
  publication?: string;
  section?: string;
}

// =============================================
// TV Show Types
// =============================================

export interface DbTVShow {
  id: string;
  title: string;
  creator: string | null;
  first_air_date: string | null;
  last_air_date: string | null;
  number_of_seasons: number | null;
  number_of_episodes: number | null;
  episode_run_time: number[] | null;
  poster_image: string | null;
  backdrop_image: string | null;
  description: string | null;
  tagline: string | null;
  status: string | null;
  in_production: boolean;
  // External IDs
  tmdb_id: number | null;
  imdb_id: string | null;
  // Cached rating data from APIs
  tmdb_rating: number | null;
  tmdb_ratings_count: number | null;
  imdb_rating: number | null;
  imdb_ratings_count: number | null;
  // Additional metadata
  cast_members: string[] | null;
  genres: string[] | null;
  networks: string[] | null;
  production_companies: string[] | null;
  origin_country: string[] | null;
  original_language: string | null;
  // Links
  imdb_url: string | null;
  // Caching and tracking
  details_fetched_at: string | null;
  created_at: string;
}

export interface DbUserTVShow {
  id: string;
  user_id: string;
  tvshow_id: string;
  genre: string | null;
  notes: string | null;
  priority: string | null;
  watching_status: 'want_to_watch' | 'watching' | 'watched' | 'dropped';
  current_season: number | null;
  current_episode: number | null;
  rating: number | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// Joined type for fetching user's TV shows with TV show details
export interface UserTVShowWithDetails extends DbUserTVShow {
  tvshow: DbTVShow;
}

// Input types for creating/updating TV shows
export interface CreateTVShowInput {
  title: string;
  creator?: string;
  first_air_date?: string;
}

export interface CreateUserTVShowInput {
  tvshow_id: string;
  genre?: string;
  notes?: string;
  priority?: string;
  watching_status?: string;
}

export interface UpdateUserTVShowInput {
  genre?: string;
  notes?: string;
  priority?: string;
  watching_status?: string;
  current_season?: number;
  current_episode?: number;
  rating?: number;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface UpdateTVShowInput {
  creator?: string;
  genres?: string[];
}
