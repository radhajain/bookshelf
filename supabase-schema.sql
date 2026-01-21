-- =============================================
-- BOOKSHELF APP - COMPLETE SUPABASE SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create tables
-- =============================================

-- Shared book catalog (all books go here)
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  cover_image TEXT,
  description TEXT,
  isbn TEXT,
  published_date TEXT,
  publisher TEXT,
  page_count INTEGER,
  -- Cached rating data from APIs
  google_rating DECIMAL(3,2),
  google_ratings_count INTEGER,
  open_library_rating DECIMAL(3,2),
  open_library_ratings_count INTEGER,
  goodreads_url TEXT,
  amazon_url TEXT,
  subjects TEXT[],
  details_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(title, author)
);

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's bookshelf (junction table linking users to books)
CREATE TABLE IF NOT EXISTS public.user_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  genre TEXT DEFAULT 'Uncategorized',
  notes TEXT,
  priority TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, book_id)
);

-- 2. Enable Row Level Security
-- =============================================

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for books table
-- =============================================

-- Anyone can read books (public catalog)
CREATE POLICY "Books are viewable by everyone"
  ON public.books FOR SELECT
  USING (true);

-- Authenticated users can insert books
CREATE POLICY "Authenticated users can insert books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update books (for caching details)
CREATE POLICY "Authenticated users can update books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. RLS Policies for profiles table
-- =============================================

-- Anyone can view profiles (for public bookshelf pages)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. RLS Policies for user_books table
-- =============================================

-- Users can view their own books
CREATE POLICY "Users can view own user_books"
  ON public.user_books FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Anyone can view user_books for public profiles (for public bookshelf pages)
CREATE POLICY "Anyone can view user_books for public profiles"
  ON public.user_books FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = user_books.user_id
      AND profiles.username IS NOT NULL
    )
  );

-- Users can insert their own user_books
CREATE POLICY "Users can insert own user_books"
  ON public.user_books FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own user_books
CREATE POLICY "Users can update own user_books"
  ON public.user_books FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own user_books
CREATE POLICY "Users can delete own user_books"
  ON public.user_books FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. Create indexes for performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_books_title ON public.books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON public.books(author);
CREATE INDEX IF NOT EXISTS idx_user_books_user_id ON public.user_books(user_id);
CREATE INDEX IF NOT EXISTS idx_user_books_book_id ON public.user_books(book_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 7. Create function to auto-create profile on signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Grant necessary permissions
-- =============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.books TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.user_books TO anon, authenticated;
