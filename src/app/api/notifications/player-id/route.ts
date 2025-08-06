/**
 * POST/DELETE /api/notifications/player-id
 * 
 * Manage OneSignal player IDs for users
 * - POST: Register/update user's OneSignal player ID
 * - DELETE: Remove user's OneSignal player ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schemas
const registerPlayerIdSchema = z.object({
  playerId: z.string().min(1),
  platform: z.enum(['web', 'mobile']),
  timestamp: z.string().datetime().optional(),
});

const removePlayerIdSchema = z.object({
  platform: z.enum(['web', 'mobile']),
});

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
    const validation = registerPlayerIdSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { playerId, platform, timestamp } = validation.data;

    // Check if user notification preferences exist
    const { data: existingPrefs } = await supabase
      .from('user_notification_preferences')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (existingPrefs) {
      // Update existing preferences with new player ID
      const updateData = platform === 'web' 
        ? { web_player_id: playerId, updated_at: new Date().toISOString() }
        : { mobile_player_id: playerId, updated_at: new Date().toISOString() };

      const { error: updateError } = await supabase
        .from('user_notification_preferences')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update player ID:', updateError);
        return NextResponse.json(
          { error: 'Failed to update player ID', details: updateError },
          { status: 500 }
        );
      }
    } else {
      // Create new notification preferences
      const insertData = {
        user_id: user.id,
        web_player_id: platform === 'web' ? playerId : null,
        mobile_player_id: platform === 'mobile' ? playerId : null,
        booking_updates: true,
        payment_updates: true,
        rental_reminders: true,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('user_notification_preferences')
        .insert(insertData);

      if (insertError) {
        console.error('Failed to create notification preferences:', insertError);
        return NextResponse.json(
          { error: 'Failed to register player ID', details: insertError },
          { status: 500 }
        );
      }
    }

    // Log player ID registration
    await supabase
      .from('notification_history')
      .insert({
        user_id: user.id,
        type: 'player_id_registered',
        title: 'OneSignal Player ID Registered',
        message: `${platform} player ID registered: ${playerId.substring(0, 8)}...`,
        metadata: {
          platform,
          player_id: playerId,
          timestamp: timestamp || new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Player ID registered successfully',
      platform,
      playerId: playerId.substring(0, 8) + '...', // Masked for security
    });

  } catch (error) {
    console.error('Player ID registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
    const validation = removePlayerIdSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { platform } = validation.data;

    // Remove player ID from user preferences
    const updateData = platform === 'web' 
      ? { web_player_id: null, updated_at: new Date().toISOString() }
      : { mobile_player_id: null, updated_at: new Date().toISOString() };

    const { error: updateError } = await supabase
      .from('user_notification_preferences')
      .update(updateData)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to remove player ID:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove player ID', details: updateError },
        { status: 500 }
      );
    }

    // Log player ID removal
    await supabase
      .from('notification_history')
      .insert({
        user_id: user.id,
        type: 'player_id_removed',
        title: 'OneSignal Player ID Removed',
        message: `${platform} player ID removed`,
        metadata: {
          platform,
          timestamp: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Player ID removed successfully',
      platform,
    });

  } catch (error) {
    console.error('Player ID removal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}