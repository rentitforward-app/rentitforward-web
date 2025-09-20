import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface NotificationPreferences {
  booking_notifications: boolean;
  message_notifications: boolean;
  payment_notifications: boolean;
  review_notifications: boolean;
  system_notifications: boolean;
  marketing_notifications: boolean;
  push_notifications: boolean;
  email_enabled: boolean;
  fcm_web_enabled: boolean;
  fcm_mobile_enabled: boolean;
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
      push_notifications: false,
      email_enabled: true,
      fcm_web_enabled: false,
      fcm_mobile_enabled: false,
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
      'push_notifications',
      'email_enabled',
      'fcm_web_enabled',
      'fcm_mobile_enabled'
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

    // If push notifications are enabled, ensure FCM tokens are active
    if (preferences.push_notifications) {
      try {
        await updateFCMSubscriptions(user.id, preferences);
      } catch (fcmError) {
        console.error('Error updating FCM subscriptions:', fcmError);
        // Don't fail the request if FCM update fails
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

async function updateFCMSubscriptions(userId: string, preferences: NotificationPreferences) {
  try {
    const supabase = await createClient();
    
    // Update FCM subscription preferences based on platform enablement
    const updates: any = {};
    
    if (!preferences.fcm_web_enabled) {
      // Deactivate web FCM tokens if web notifications are disabled
      await supabase
        .from('fcm_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('platform', 'web');
    }
    
    if (!preferences.fcm_mobile_enabled) {
      // Deactivate mobile FCM tokens if mobile notifications are disabled
      await supabase
        .from('fcm_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .in('platform', ['ios', 'android']);
    }
    
    // If push notifications are completely disabled, deactivate all tokens
    if (!preferences.push_notifications) {
      await supabase
        .from('fcm_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId);
    }

    console.log('FCM subscriptions updated for user:', userId);
  } catch (error) {
    console.error('Failed to update FCM subscriptions:', error);
    throw error;
  }
} 