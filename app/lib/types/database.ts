// Database types matching the Supabase schema

export interface DbBook {
  id: string;
  title: string;
  author: string | null;
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
  suggested_genre: string | null;
  details_fetched_at: string | null;
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
  genre: string;
  notes: string | null;
  priority: string | null;
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
  genre?: string;
  notes?: string;
  priority?: string;
}

export interface UpdateUserBookInput {
  genre?: string;
  notes?: string;
  priority?: string;
}

export interface UpdateProfileInput {
  username?: string | null;
  display_name?: string | null;
}
