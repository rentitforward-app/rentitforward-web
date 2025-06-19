import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      // @ts-ignore - Temporary fix for deployment
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profileData = await request.json();

    // Update profile
    const { data: profile, error } = await supabase
      .from('profiles')
      // @ts-ignore - Temporary fix for deployment
      .update({
        full_name: profileData.full_name,
        phone: profileData.phone,
        bio: profileData.bio,
        location: profileData.location,
        state: profileData.state,
        postcode: profileData.postcode,
        avatar_url: profileData.avatar_url,
        updated_at: new Date().toISOString(),
      })
      // @ts-ignore - Temporary fix for deployment
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error in update profile API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 