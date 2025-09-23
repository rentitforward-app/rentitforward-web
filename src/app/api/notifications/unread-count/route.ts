import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's last viewed timestamp from profiles
    const { data: profile, error: preferencesError } = await supabase
      .from('profiles')
      .select('notifications_last_viewed_at')
      .eq('id', user.id)
      .single();

    if (preferencesError && preferencesError.code !== 'PGRST116') {
      console.error('Error fetching preferences:', preferencesError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    const lastViewedAt = profile?.notifications_last_viewed_at;

    let unreadCount = 0;

    if (lastViewedAt) {
      // Count notifications created after the last viewed timestamp
      const { count, error: countError } = await supabase
        .from('app_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gt('created_at', lastViewedAt);

      if (countError) {
        console.error('Error counting unread notifications:', countError);
        return NextResponse.json(
          { error: 'Failed to count unread notifications' },
          { status: 500 }
        );
      }

      unreadCount = count || 0;
    } else {
      // If no last viewed timestamp, count all notifications
      const { count, error: countError } = await supabase
        .from('app_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Error counting all notifications:', countError);
        return NextResponse.json(
          { error: 'Failed to count notifications' },
          { status: 500 }
        );
      }

      unreadCount = count || 0;
    }

    return NextResponse.json({
      unreadCount,
      lastViewedAt,
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}