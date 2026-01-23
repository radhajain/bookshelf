import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/user-articles - Get current user's article collection
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_articles')
    .select(`
      *,
      article:articles(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/user-articles - Add article to user's shelf
export async function POST(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    article_id,
    articleId,
    title,
    author,
    publication,
    publication_date,
    article_url,
    description,
    thumbnail_image,
    section,
    genre,
    notes,
    priority,
    read
  } = body;

  let finalArticleId = article_id || articleId;

  // If no article_id provided, find or create the article first
  if (!finalArticleId && article_url) {
    // Try to find existing article by URL
    const { data: existingByUrl } = await supabase
      .from('articles')
      .select('id')
      .eq('article_url', article_url)
      .single();

    if (existingByUrl) {
      finalArticleId = existingByUrl.id;
    } else {
      // Create new article
      const { data: newArticle, error: articleError } = await supabase
        .from('articles')
        .insert({
          title: title || 'Unknown Article',
          author: author || null,
          publication: publication || null,
          publication_date: publication_date || null,
          article_url,
          description: description || null,
          thumbnail_image: thumbnail_image || null,
          section: section || null,
        })
        .select('id')
        .single();

      if (articleError) {
        // Handle race condition - another request created it
        if (articleError.code === '23505') {
          const { data: article } = await supabase
            .from('articles')
            .select('id')
            .eq('article_url', article_url)
            .single();
          finalArticleId = article?.id;
        } else {
          return NextResponse.json({ error: articleError.message }, { status: 500 });
        }
      } else {
        finalArticleId = newArticle.id;
      }
    }
  }

  if (!finalArticleId) {
    return NextResponse.json({ error: 'article_id or article_url is required' }, { status: 400 });
  }

  // Add to user's collection
  const { data, error } = await supabase
    .from('user_articles')
    .insert({
      user_id: user.id,
      article_id: finalArticleId,
      genre: genre || null,
      notes: notes || null,
      priority: priority || null,
      read: read || false,
    })
    .select(`
      *,
      article:articles(*)
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Article already in your collection' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/user-articles - Remove article from collection (expects ?id=xxx)
export async function DELETE(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('user_articles')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/user-articles - Update user article (read status, notes, etc.)
export async function PATCH(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const body = await request.json();
  const { read, read_at, notes, priority, genre } = body;

  const updateData: Record<string, unknown> = {};
  if (read !== undefined) updateData.read = read;
  if (read_at !== undefined) updateData.read_at = read_at;
  if (notes !== undefined) updateData.notes = notes;
  if (priority !== undefined) updateData.priority = priority;
  if (genre !== undefined) updateData.genre = genre;

  const { data, error } = await supabase
    .from('user_articles')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(`
      *,
      article:articles(*)
    `)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
