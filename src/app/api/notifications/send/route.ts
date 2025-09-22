/**
 * POST /api/notifications/send
 * 
 * Send FCM notification to users
 * Replaces OneSignal notification sending
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fcmAdminService } from '@/lib/fcm/admin';
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
        // Send simple FCM notification using admin service
        const title = `Notification: ${notificationData.type}`;
        const body = `You have a new ${notificationData.type} notification`;
        const data = { 
          type: notificationData.type, 
          ...notificationData.context 
        };
        
        const result = await fcmAdminService.sendToUser(
          notificationData.user_id, 
          title, 
          body, 
          data
        );

        return NextResponse.json({
          success: result.success,
          message: result.success ? 'Notification sent successfully' : 'Failed to send notification',
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

      // Send notifications to all specified users using FCM admin service
      const results = await Promise.allSettled(
        notificationData.user_ids.map(userId =>
          fcmAdminService.sendToUser(
            userId,
            notificationData.title || `Notification: ${notificationData.category}`,
            notificationData.message || 'You have a new notification',
            { 
              type: notificationData.category,
              ...notificationData.data,
              action_url: notificationData.url 
            }
          )
        )
      );

      const successfulSends = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failedSends = results.length - successfulSends;

      const detailedResults = results.map((result, index) => ({
        userId: notificationData.user_ids[index],
        success: result.status === 'fulfilled' ? result.value.success : false,
        error: result.status === 'fulfilled' ? result.value.error : 'Promise rejected',
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

