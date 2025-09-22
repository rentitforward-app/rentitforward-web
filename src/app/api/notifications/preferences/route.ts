import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface NotificationPreferences {
  email_bookings: boolean;
  email_messages: boolean;
  email_marketing: boolean;
  push_notifications: boolean;
  push_bookings: boolean;
  push_messages: boolean;
  push_reminders: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's notification preferences from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching notification preferences:', profileError);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // Default preferences if none exist
    const defaultPreferences: NotificationPreferences = {
      email_bookings: true,
      email_messages: true,
      email_marketing: false,
      push_notifications: true,
      push_bookings: true,
      push_messages: true,
      push_reminders: true,
    };

    const preferences = profile?.notification_preferences || defaultPreferences;

    return NextResponse.json({ 
      success: true, 
      preferences 
    });

  } catch (error) {
    console.error('Error in GET /api/notifications/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { preferences }: { preferences: Partial<NotificationPreferences> } = await request.json();

    if (!preferences) {
      return NextResponse.json({ error: 'Preferences data is required' }, { status: 400 });
    }

    // Validate preferences
    const validKeys: (keyof NotificationPreferences)[] = [
      'email_bookings', 'email_messages', 'email_marketing',
      'push_notifications', 'push_bookings', 'push_messages', 'push_reminders'
    ];

    const validatedPreferences: Partial<NotificationPreferences> = {};
    for (const key of validKeys) {
      if (preferences[key] !== undefined) {
        validatedPreferences[key] = Boolean(preferences[key]);
      }
    }

    // Update user's notification preferences
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        notification_preferences: validatedPreferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating notification preferences:', updateError);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notification preferences updated successfully',
      preferences: validatedPreferences
    });

  } catch (error) {
    console.error('Error in PUT /api/notifications/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}