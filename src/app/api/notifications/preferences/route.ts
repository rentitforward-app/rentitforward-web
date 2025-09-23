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

    // Get user's notification preferences from notification_preferences table
    const { data: preferencesData, error: preferencesError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

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

    let preferences: NotificationPreferences;
    
    if (preferencesError || !preferencesData) {
      // If no preferences exist, create default ones
      const { data: insertedPrefs, error: insertError } = await supabase
        .from('notification_preferences')
        .insert({
          user_id: user.id,
          booking_notifications: defaultPreferences.email_bookings,
          message_notifications: defaultPreferences.email_messages,
          marketing_notifications: defaultPreferences.email_marketing,
          push_notifications: defaultPreferences.push_notifications,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating default notification preferences:', insertError);
        preferences = defaultPreferences;
      } else {
        preferences = {
          email_bookings: insertedPrefs.booking_notifications,
          email_messages: insertedPrefs.message_notifications,
          email_marketing: insertedPrefs.marketing_notifications,
          push_notifications: insertedPrefs.push_notifications,
          push_bookings: insertedPrefs.booking_notifications,
          push_messages: insertedPrefs.message_notifications,
          push_reminders: insertedPrefs.push_notifications,
        };
      }
    } else {
      // Map from database columns to expected API format
      preferences = {
        email_bookings: preferencesData.booking_notifications || defaultPreferences.email_bookings,
        email_messages: preferencesData.message_notifications || defaultPreferences.email_messages,
        email_marketing: preferencesData.marketing_notifications || defaultPreferences.email_marketing,
        push_notifications: preferencesData.push_notifications || defaultPreferences.push_notifications,
        push_bookings: preferencesData.booking_notifications || defaultPreferences.push_bookings,
        push_messages: preferencesData.message_notifications || defaultPreferences.push_messages,
        push_reminders: preferencesData.push_notifications || defaultPreferences.push_reminders,
      };
    }

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

    // Map API format to database columns
    const dbPreferences = {
      booking_notifications: validatedPreferences.email_bookings ?? validatedPreferences.push_bookings,
      message_notifications: validatedPreferences.email_messages ?? validatedPreferences.push_messages,
      marketing_notifications: validatedPreferences.email_marketing,
      push_notifications: validatedPreferences.push_notifications ?? validatedPreferences.push_reminders,
      updated_at: new Date().toISOString()
    };

    // Update user's notification preferences in the notification_preferences table
    const { error: updateError } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...dbPreferences
      });

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