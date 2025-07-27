import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface NotificationPreferences {
  booking_notifications: boolean;
  message_notifications: boolean;
  payment_notifications: boolean;
  review_notifications: boolean;
  system_notifications: boolean;
  marketing_notifications: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user preferences from database
    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Return default preferences if none exist
    const defaultPreferences: NotificationPreferences = {
      booking_notifications: true,
      message_notifications: true,
      payment_notifications: true,
      review_notifications: true,
      system_notifications: true,
      marketing_notifications: false,
      push_enabled: false,
      email_enabled: true,
    };

    return NextResponse.json({
      preferences: preferences || defaultPreferences,
    });
  } catch (error) {
    console.error('Error in notification preferences GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { preferences }: { preferences: NotificationPreferences } = await request.json();

    // Validate preferences structure
    const requiredFields = [
      'booking_notifications',
      'message_notifications', 
      'payment_notifications',
      'review_notifications',
      'system_notifications',
      'marketing_notifications',
      'push_enabled',
      'email_enabled'
    ];

    for (const field of requiredFields) {
      if (typeof preferences[field as keyof NotificationPreferences] !== 'boolean') {
        return NextResponse.json(
          { error: `Invalid value for ${field}` },
          { status: 400 }
        );
      }
    }

    // System notifications should always be enabled
    preferences.system_notifications = true;

    // Upsert preferences
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving notification preferences:', error);
      return NextResponse.json(
        { error: 'Failed to save preferences' },
        { status: 500 }
      );
    }

    // If push notifications are enabled, tag the user in OneSignal
    if (preferences.push_enabled) {
      try {
        await updateOneSignalTags(user.id, preferences);
      } catch (oneSignalError) {
        console.error('Error updating OneSignal tags:', oneSignalError);
        // Don't fail the request if OneSignal update fails
      }
    }

    return NextResponse.json({
      success: true,
      preferences: data,
    });
  } catch (error) {
    console.error('Error in notification preferences PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function updateOneSignalTags(userId: string, preferences: NotificationPreferences) {
  const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
  const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    console.warn('OneSignal API key or App ID not configured');
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/apps/{app_id}/users/by/external_id/{external_user_id}', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        tags: {
          booking_notifications: preferences.booking_notifications,
          message_notifications: preferences.message_notifications,
          payment_notifications: preferences.payment_notifications,
          review_notifications: preferences.review_notifications,
          marketing_notifications: preferences.marketing_notifications,
          user_type: 'web',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OneSignal API error: ${response.status}`);
    }

    console.log('OneSignal tags updated for user:', userId);
  } catch (error) {
    console.error('Failed to update OneSignal tags:', error);
    throw error;
  }
} 