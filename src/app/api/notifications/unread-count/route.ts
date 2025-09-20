/**
 * GET /api/notifications/unread-count
 * 
 * Get unread notification count for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get unread count from app_notifications
    const { data: countResult, error: countError } = await supabase
      .rpc('get_unread_notification_count', { target_user_id: user.id });

    if (countError) {
      console.error('Error getting unread count:', countError);
      return NextResponse.json(
        { error: 'Failed to get unread count', details: countError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      count: countResult || 0,
      userId: user.id,
    });

  } catch (error) {
    console.error('Unread count fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
