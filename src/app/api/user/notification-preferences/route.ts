/**
 * GET/POST /api/user/notification-preferences
 * 
 * Manage user notification preferences
 * - GET: Fetch current preferences
 * - POST: Update preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const notificationPreferencesSchema = z.object({
  preferences: z.object({
    bookingUpdates: z.boolean(),
    paymentUpdates: z.boolean(),
    rentalReminders: z.boolean(),
    marketingNotifications: z.boolean(),
    emailBackup: z.boolean(),
  }),
});

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

    // Fetch user's notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('user_notification_preferences')
      .select(`
        booking_updates,
        payment_updates,
        rental_reminders,
        web_player_id,
        mobile_player_id,
        created_at,
        updated_at
      `)
      .eq('user_id', user.id)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('Failed to fetch notification preferences:', prefsError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences', details: prefsError },
        { status: 500 }
      );
    }

    // Return preferences with defaults if not found
    const defaultPrefs = {
      bookingUpdates: true,
      paymentUpdates: true,
      rentalReminders: true,
      marketingNotifications: false,
      emailBackup: true,
    };

    const userPreferences = preferences ? {
      bookingUpdates: preferences.booking_updates,
      paymentUpdates: preferences.payment_updates,
      rentalReminders: preferences.rental_reminders,
      marketingNotifications: false, // Not stored yet, default to false
      emailBackup: true, // Not stored yet, default to true
    } : defaultPrefs;

    return NextResponse.json({
      preferences: userPreferences,
      hasWebNotifications: !!preferences?.web_player_id,
      hasMobileNotifications: !!preferences?.mobile_player_id,
      lastUpdated: preferences?.updated_at || null,
    });

  } catch (error) {
    console.error('Notification preferences fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Parse and validate request body
    const body = await request.json();
    const validation = notificationPreferencesSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid preferences data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { preferences } = validation.data;

    // Check if preferences exist
    const { data: existingPrefs } = await supabase
      .from('user_notification_preferences')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    const prefsData = {
      booking_updates: preferences.bookingUpdates,
      payment_updates: preferences.paymentUpdates,
      rental_reminders: preferences.rentalReminders,
      updated_at: new Date().toISOString(),
    };

    if (existingPrefs) {
      // Update existing preferences
      const { error: updateError } = await supabase
        .from('user_notification_preferences')
        .update(prefsData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update notification preferences:', updateError);
        return NextResponse.json(
          { error: 'Failed to update preferences', details: updateError },
          { status: 500 }
        );
      }
    } else {
      // Create new preferences
      const { error: insertError } = await supabase
        .from('user_notification_preferences')
        .insert({
          user_id: user.id,
          ...prefsData,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Failed to create notification preferences:', insertError);
        return NextResponse.json(
          { error: 'Failed to create preferences', details: insertError },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      preferences,
      message: 'Notification preferences updated successfully',
    });

  } catch (error) {
    console.error('Notification preferences update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}