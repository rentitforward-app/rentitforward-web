/**
 * GET /api/notifications/player-ids/[userId]
 * 
 * Fetch OneSignal player IDs for a specific user
 * Used by notification service to send targeted notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { userId } = await params;
    
    // Get current user for authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only allow users to access their own player IDs or admin access
    if (user.id !== userId) {
      // Check if user has admin role (implement admin check here)
      // For now, only allow self-access
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch user's notification preferences including player IDs
    const { data: preferences, error: prefsError } = await supabase
      .from('user_notification_preferences')
      .select(`
        user_id,
        web_player_id,
        mobile_player_id,
        booking_updates,
        payment_updates,
        rental_reminders,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('Failed to fetch user notification preferences:', prefsError);
      return NextResponse.json(
        { error: 'Failed to fetch player IDs', details: prefsError },
        { status: 500 }
      );
    }

    // Collect active player IDs
    const playerIds: string[] = [];
    
    if (preferences?.web_player_id) {
      playerIds.push(preferences.web_player_id);
    }
    
    if (preferences?.mobile_player_id) {
      playerIds.push(preferences.mobile_player_id);
    }

    return NextResponse.json({
      userId,
      playerIds,
      preferences: preferences ? {
        bookingUpdates: preferences.booking_updates,
        paymentUpdates: preferences.payment_updates,
        rentalReminders: preferences.rental_reminders,
        hasWebNotifications: !!preferences.web_player_id,
        hasMobileNotifications: !!preferences.mobile_player_id,
        lastUpdated: preferences.updated_at,
      } : null,
    });

  } catch (error) {
    console.error('Player IDs fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}