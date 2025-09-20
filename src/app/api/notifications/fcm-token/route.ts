/**
 * POST /api/notifications/fcm-token
 * 
 * Register or update FCM token for a user
 * Replaces OneSignal player ID registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const fcmTokenSchema = z.object({
  fcm_token: z.string().min(1),
  platform: z.enum(['web', 'ios', 'android']),
  device_type: z.enum(['web', 'ios', 'android']),
  device_id: z.string().optional(),
  app_version: z.string().optional(),
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
    const validation = fcmTokenSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid FCM token data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const tokenData = validation.data;

    // Check if token already exists for this user/device
    const { data: existingToken, error: fetchError } = await supabase
      .from('fcm_subscriptions')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('fcm_token', tokenData.fcm_token)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Failed to check existing FCM token:', fetchError);
      return NextResponse.json(
        { error: 'Failed to check existing token', details: fetchError },
        { status: 500 }
      );
    }

    let result;

    if (existingToken) {
      // Update existing token
      const { data: updatedToken, error: updateError } = await supabase
        .from('fcm_subscriptions')
        .update({
          platform: tokenData.platform,
          device_type: tokenData.device_type,
          device_id: tokenData.device_id,
          app_version: tokenData.app_version,
          is_active: true,
          last_active: new Date().toISOString(),
        })
        .eq('id', existingToken.id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update FCM token:', updateError);
        return NextResponse.json(
          { error: 'Failed to update FCM token', details: updateError },
          { status: 500 }
        );
      }

      result = updatedToken;
    } else {
      // Deactivate any existing tokens for this user/device combination
      if (tokenData.device_id) {
        await supabase
          .from('fcm_subscriptions')
          .update({ is_active: false })
          .eq('user_id', user.id)
          .eq('device_id', tokenData.device_id)
          .eq('platform', tokenData.platform);
      }

      // Insert new token
      const { data: newToken, error: insertError } = await supabase
        .from('fcm_subscriptions')
        .insert({
          user_id: user.id,
          fcm_token: tokenData.fcm_token,
          platform: tokenData.platform,
          device_type: tokenData.device_type,
          device_id: tokenData.device_id,
          app_version: tokenData.app_version,
          is_active: true,
          last_active: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert FCM token:', insertError);
        return NextResponse.json(
          { error: 'Failed to register FCM token', details: insertError },
          { status: 500 }
        );
      }

      result = newToken;
    }

    // Update notification preferences to enable FCM for this platform
    const fcmField = tokenData.platform === 'web' ? 'fcm_web_enabled' : 'fcm_mobile_enabled';
    await supabase
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        [fcmField]: true,
        push_notifications: true, // Enable push notifications when registering token
      }, {
        onConflict: 'user_id'
      });

    return NextResponse.json({
      success: true,
      message: 'FCM token registered successfully',
      token: {
        id: result.id,
        platform: result.platform,
        device_type: result.device_type,
        is_active: result.is_active,
        created_at: result.created_at,
        updated_at: result.updated_at,
      },
    });

  } catch (error) {
    console.error('FCM token registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/fcm-token
 * 
 * Deactivate FCM token for a user
 */
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

    // Get FCM token from query params or body
    const url = new URL(request.url);
    const fcmToken = url.searchParams.get('token');

    if (!fcmToken) {
      const body = await request.json();
      if (!body.fcm_token) {
        return NextResponse.json(
          { error: 'FCM token is required' },
          { status: 400 }
        );
      }
    }

    const tokenToDeactivate = fcmToken || (await request.json()).fcm_token;

    // Deactivate the token
    const { error: updateError } = await supabase
      .from('fcm_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('fcm_token', tokenToDeactivate);

    if (updateError) {
      console.error('Failed to deactivate FCM token:', updateError);
      return NextResponse.json(
        { error: 'Failed to deactivate FCM token', details: updateError },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'FCM token deactivated successfully',
    });

  } catch (error) {
    console.error('FCM token deactivation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

