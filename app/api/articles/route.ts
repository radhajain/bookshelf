import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/articles - Get all articles in library with optional search
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const publication = searchParams.get('publication');
  const section = searchParams.get('section');

  const supabase = await createClient();

  // Get current user to check which articles they already have
  const { data: { user } } = await supabase.auth.getUser();

  let dbQuery = supabase.from('articles').select('*').order('created_at', { ascending: false });

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,author.ilike.%${query}%`);
  }

  if (publication && publication !== 'all') {
    dbQuery = dbQuery.eq('publication', publication);
  }

  if (section && section !== 'all') {
    dbQuery = dbQuery.eq('section', section);
  }

  const { data: articles, error } = await dbQuery.limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If user is logged in, get their article IDs to mark which ones they have
  let userArticleIds: string[] = [];
  if (user) {
    const { data: userArticles } = await supabase
      .from('user_articles')
      .select('article_id')
      .eq('user_id', user.id);

    userArticleIds = userArticles?.map(ua => ua.article_id) || [];
  }

  // Add inMyShelf flag to each article
  const articlesWithShelfStatus = articles?.map(article => ({
    ...article,
    inMyShelf: userArticleIds.includes(article.id),
  })) || [];

  // Get unique publications for filtering
  const { data: publicationData } = await supabase
    .from('articles')
    .select('publication')
    .not('publication', 'is', null);

  const allPublications = publicationData?.map(a => a.publication) || [];
  const publications = [...new Set(allPublications)].sort();

  // Get unique sections for filtering
  const { data: sectionData } = await supabase
    .from('articles')
    .select('section')
    .not('section', 'is', null);

  const allSections = sectionData?.map(a => a.section) || [];
  const sections = [...new Set(allSections)].sort();

  return NextResponse.json({ articles: articlesWithShelfStatus, publications, sections });
}

// POST /api/articles - Find or create article in shared catalog
export async function POST(request: Request) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    title,
    author,
    publication,
    publication_date,
    article_url,
    description,
    thumbnail_image,
    section,
    reading_time_minutes,
    word_count,
    subjects
  } = body;

  if (!title || !article_url) {
    return NextResponse.json({ error: 'Title and article_url are required' }, { status: 400 });
  }

  // First, try to find existing article by URL (unique identifier)
  const { data: existingByUrl } = await supabase
    .from('articles')
    .select('*')
    .eq('article_url', article_url)
    .single();

  if (existingByUrl) {
    return NextResponse.json(existingByUrl);
  }

  // Create new article in catalog
  const { data: newArticle, error } = await supabase
    .from('articles')
    .insert({
      title,
      author: author || null,
      publication: publication || null,
      publication_date: publication_date || null,
      article_url,
      description: description || null,
      thumbnail_image: thumbnail_image || null,
      section: section || null,
      reading_time_minutes: reading_time_minutes || null,
      word_count: word_count || null,
      subjects: subjects || null,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violation (race condition)
    if (error.code === '23505') {
      // Try to find the article that was just created
      const { data: article } = await supabase
        .from('articles')
        .select('*')
        .eq('article_url', article_url)
        .single();

      if (article) {
        return NextResponse.json(article);
      }
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(newArticle, { status: 201 });
}
