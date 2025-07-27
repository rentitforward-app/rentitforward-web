import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  createPushNotification, 
  createNotification,
  shouldSendNotification,
  NotificationType,
  NotificationContext,
  PushNotification 
} from '@rentitforward/shared/src';

interface SendNotificationRequest {
  user_id: string;
  type: NotificationType;
  context: any; // Will be typed based on the notification type
  urgency?: 'immediate' | 'normal' | 'low';
  override_preferences?: boolean;
}

interface OneSignalAPIResponse {
  id: string;
  recipients: number;
  external_id_hash?: Record<string, string>;
}

async function sendToOneSignal(notification: PushNotification): Promise<OneSignalAPIResponse> {
  const ONESIGNAL_API_KEY = process.env.ONESIGNAL_API_KEY;
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;

  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    throw new Error('OneSignal API credentials not configured');
  }

  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      ...notification,
      app_id: ONESIGNAL_APP_ID,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OneSignal API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify API key or authentication
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    // For now, we'll require either a valid auth token or internal API key
    if (!authHeader && apiKey !== process.env.INTERNAL_API_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: SendNotificationRequest = await request.json();
    const { user_id, type, context, urgency = 'normal', override_preferences = false } = body;

    if (!user_id || !type || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, type, context' },
        { status: 400 }
      );
    }

    // Get user's notification preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .single();

    // Check if we should send the notification based on preferences
    if (!override_preferences && preferences) {
      const shouldSend = shouldSendNotification(type, {
        push_notifications: preferences.push_notifications,
        booking_notifications: preferences.booking_notifications,
        message_notifications: preferences.message_notifications,
        payment_notifications: preferences.payment_notifications,
        review_notifications: preferences.review_notifications,
        system_notifications: preferences.system_notifications,
        marketing_notifications: preferences.marketing_notifications,
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        quiet_hours_start: preferences.quiet_hours_start,
        quiet_hours_end: preferences.quiet_hours_end,
        timezone: preferences.timezone,
      });

      if (!shouldSend) {
        return NextResponse.json(
          { message: 'Notification blocked by user preferences', sent: false },
          { status: 200 }
        );
      }
    }

    // Create notification payload
    const appNotification = createNotification(type, context, user_id);
    
    // Store notification in database
    const { data: savedNotification, error: dbError } = await supabase
      .from('notifications')
      .insert({
        ...appNotification,
        user_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to save notification to database:', dbError);
      return NextResponse.json(
        { error: 'Failed to save notification' },
        { status: 500 }
      );
    }

    // Create OneSignal push notification
    const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
    if (!ONESIGNAL_APP_ID) {
      console.error('OneSignal App ID not configured');
      return NextResponse.json(
        { error: 'OneSignal not configured' },
        { status: 500 }
      );
    }

    const pushNotification = createPushNotification(
      ONESIGNAL_APP_ID,
      {
        ...appNotification,
        id: savedNotification.id,
      },
      {
        external_user_ids: [user_id],
        priority: urgency === 'immediate' ? 10 : urgency === 'normal' ? 7 : 5,
      }
    );

    // Send via OneSignal
    try {
      const oneSignalResponse = await sendToOneSignal(pushNotification);
      
      // Update notification with OneSignal ID
      await supabase
        .from('notifications')
        .update({
          onesignal_id: oneSignalResponse.id,
          sent_at: new Date().toISOString(),
        })
        .eq('id', savedNotification.id);

      return NextResponse.json({
        message: 'Notification sent successfully',
        notification_id: savedNotification.id,
        onesignal_id: oneSignalResponse.id,
        recipients: oneSignalResponse.recipients,
        sent: true,
      });

    } catch (oneSignalError) {
      console.error('OneSignal delivery failed:', oneSignalError);
      
      // Mark notification as failed
      await supabase
        .from('notifications')
        .update({
          data: {
            ...savedNotification.data,
            error: oneSignalError instanceof Error ? oneSignalError.message : 'Unknown error',
          },
        })
        .eq('id', savedNotification.id);

      return NextResponse.json({
        message: 'Notification saved but delivery failed',
        notification_id: savedNotification.id,
        error: oneSignalError instanceof Error ? oneSignalError.message : 'Unknown error',
        sent: false,
      }, { status: 207 }); // 207 Multi-Status
    }

  } catch (error) {
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Utility function to send notifications from other parts of the app
export async function sendNotificationToUser(
  user_id: string,
  type: NotificationType,
  context: any,
  options: {
    urgency?: 'immediate' | 'normal' | 'low';
    override_preferences?: boolean;
  } = {}
): Promise<{ success: boolean; notification_id?: string; error?: string }> {
  try {
    const response = await fetch('/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.INTERNAL_API_KEY || '',
      },
      body: JSON.stringify({
        user_id,
        type,
        context,
        ...options,
      }),
    });

    const result = await response.json();
    
    if (response.ok) {
      return {
        success: true,
        notification_id: result.notification_id,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Failed to send notification',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
} 