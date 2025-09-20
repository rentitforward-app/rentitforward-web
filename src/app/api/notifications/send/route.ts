/**
 * POST /api/notifications/send
 * 
 * Send FCM notification to users
 * Replaces OneSignal notification sending
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fcmNotificationService } from '@/lib/fcm/notifications';
import { z } from 'zod';

const sendNotificationSchema = z.object({
  user_ids: z.array(z.string().uuid()).min(1),
  category: z.string(),
  title: z.string().optional(),
  message: z.string().optional(),
  template_vars: z.record(z.string()).optional(),
  data: z.record(z.any()).optional(),
  url: z.string().optional(),
  image_url: z.string().optional(),
  priority: z.enum(['normal', 'high']).default('normal'),
  platforms: z.array(z.enum(['web', 'ios', 'android'])).optional(),
});

const sendTypedNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.string(),
  context: z.record(z.any()),
  priority: z.enum(['normal', 'high']).default('normal'),
  platforms: z.array(z.enum(['web', 'ios', 'android'])).optional(),
  image_url: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user for authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user has permission to send notifications
    // This should be restricted to admin users or service accounts
    const isServiceRole = request.headers.get('authorization')?.includes('service_role');
    if (!isServiceRole) {
      // For now, allow authenticated users to send notifications
      // In production, implement proper role-based access control
      console.warn('Non-service role attempting to send notifications');
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'send_typed') {
      // Send typed notification using shared notification system
      const validation = sendTypedNotificationSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid typed notification data', details: validation.error.issues },
          { status: 400 }
        );
      }

      const notificationData = validation.data;

      try {
        const result = await fcmNotificationService.sendTypedNotification(
          notificationData.type as any,
          notificationData.user_id,
          notificationData.context,
          {
            priority: notificationData.priority,
            platforms: notificationData.platforms,
            imageUrl: notificationData.image_url,
          }
        );

        return NextResponse.json({
          success: result.success,
          message: result.success ? 'Notification sent successfully' : 'Failed to send notification',
          result: {
            messageIds: result.messageIds,
            tokensTargeted: result.tokensTargeted,
            platformResults: result.platformResults,
          },
          error: result.error,
        });
      } catch (error) {
        console.error('Failed to send typed notification:', error);
        return NextResponse.json(
          { error: 'Failed to send notification', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else {
      // Send custom notification
      const validation = sendNotificationSchema.safeParse(body);
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid notification data', details: validation.error.issues },
          { status: 400 }
        );
      }

      const notificationData = validation.data;

      // Send notifications to all specified users
      const results = await Promise.allSettled(
        notificationData.user_ids.map(userId =>
          fcmNotificationService.sendNotification({
            category: notificationData.category as any,
            userId,
            title: notificationData.title,
            message: notificationData.message,
            templateVars: notificationData.template_vars,
            data: notificationData.data,
            url: notificationData.url,
            imageUrl: notificationData.image_url,
            priority: notificationData.priority,
            platforms: notificationData.platforms,
          })
        )
      );

      const successfulSends = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failedSends = results.length - successfulSends;

      const detailedResults = results.map((result, index) => ({
        userId: notificationData.user_ids[index],
        success: result.status === 'fulfilled' ? result.value.success : false,
        error: result.status === 'fulfilled' ? result.value.error : 'Promise rejected',
        messageIds: result.status === 'fulfilled' ? result.value.messageIds : undefined,
        tokensTargeted: result.status === 'fulfilled' ? result.value.tokensTargeted : 0,
      }));

      return NextResponse.json({
        success: successfulSends > 0,
        message: `Sent ${successfulSends} notifications, ${failedSends} failed`,
        summary: {
          total: results.length,
          successful: successfulSends,
          failed: failedSends,
        },
        results: detailedResults,
      });
    }

  } catch (error) {
    console.error('Notification send error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

