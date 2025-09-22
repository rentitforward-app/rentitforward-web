import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentTimestamp = new Date().toISOString();

    // Update or insert the user's preferences with the current timestamp
    const { error: upsertError } = await supabase
      .from('preferences')
      .upsert(
        {
          user_id: user.id,
          notifications_last_viewed_at: currentTimestamp,
        },
        {
          onConflict: 'user_id',
        }
      );

    if (upsertError) {
      console.error('Error updating notifications last viewed:', upsertError);
      return NextResponse.json(
        { error: 'Failed to mark notifications as viewed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lastViewedAt: currentTimestamp,
      message: 'Notifications marked as viewed'
    });

  } catch (error) {
    console.error('Error marking notifications as viewed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
