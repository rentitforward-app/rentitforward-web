/**
 * GET /api/notifications/fcm-tokens/[userId]
 * 
 * Fetch FCM tokens for a specific user
 * Replaces OneSignal player IDs endpoint
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

    // Only allow users to access their own tokens or admin access
    if (user.id !== userId) {
      // Check if user has admin role (implement admin check here)
      // For now, only allow self-access
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch user's FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_subscriptions')
      .select(`
        id,
        fcm_token,
        platform,
        device_type,
        device_id,
        app_version,
        is_active,
        last_active,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_active', { ascending: false });

    if (tokensError) {
      console.error('Failed to fetch user FCM tokens:', tokensError);
      return NextResponse.json(
        { error: 'Failed to fetch FCM tokens', details: tokensError },
        { status: 500 }
      );
    }

    // Fetch user's notification preferences
    const { data: preferences, error: prefsError } = await supabase
      .from('notification_preferences')
      .select(`
        user_id,
        booking_notifications,
        message_notifications,
        payment_notifications,
        review_notifications,
        system_notifications,
        marketing_notifications,
        push_notifications,
        email_enabled,
        fcm_web_enabled,
        fcm_mobile_enabled,
        created_at,
        updated_at
      `)
      .eq('user_id', userId)
      .single();

    if (prefsError && prefsError.code !== 'PGRST116') {
      console.error('Failed to fetch user notification preferences:', prefsError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences', details: prefsError },
        { status: 500 }
      );
    }

    // Group tokens by platform
    const tokensByPlatform = tokens.reduce((groups, token) => {
      const platform = token.platform;
      if (!groups[platform]) {
        groups[platform] = [];
      }
      groups[platform].push({
        id: token.id,
        token: token.fcm_token,
        device_type: token.device_type,
        device_id: token.device_id,
        app_version: token.app_version,
        last_active: token.last_active,
        created_at: token.created_at,
      });
      return groups;
    }, {} as Record<string, any[]>);

    return NextResponse.json({
      userId,
      totalTokens: tokens.length,
      tokensByPlatform,
      tokens: tokens.map(token => ({
        id: token.id,
        token: token.fcm_token,
        platform: token.platform,
        device_type: token.device_type,
        device_id: token.device_id,
        app_version: token.app_version,
        last_active: token.last_active,
        created_at: token.created_at,
      })),
      preferences: preferences ? {
        bookingNotifications: preferences.booking_notifications,
        messageNotifications: preferences.message_notifications,
        paymentNotifications: preferences.payment_notifications,
        reviewNotifications: preferences.review_notifications,
        systemNotifications: preferences.system_notifications,
        marketingNotifications: preferences.marketing_notifications,
        pushNotifications: preferences.push_notifications,
        emailEnabled: preferences.email_enabled,
        fcmWebEnabled: preferences.fcm_web_enabled,
        fcmMobileEnabled: preferences.fcm_mobile_enabled,
        hasWebNotifications: tokensByPlatform.web?.length > 0,
        hasMobileNotifications: (tokensByPlatform.ios?.length || 0) + (tokensByPlatform.android?.length || 0) > 0,
        lastUpdated: preferences.updated_at,
      } : null,
    });

  } catch (error) {
    console.error('FCM tokens fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

