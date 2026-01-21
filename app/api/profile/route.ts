import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

// GET /api/profile - Get current user's profile
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT /api/profile - Update profile
export async function PUT(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { username, display_name } = body;

  // Validate username if provided
  if (username !== undefined) {
    if (username && !/^[a-zA-Z0-9_-]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3-20 characters, alphanumeric with - and _ allowed' },
        { status: 400 }
      );
    }

    // Check if username is taken (if not null)
    if (username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .single();

      if (existing) {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 409 });
      }
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({
      username: username === '' ? null : username,
      display_name: display_name || null,
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
