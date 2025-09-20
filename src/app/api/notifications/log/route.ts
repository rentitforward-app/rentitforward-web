/**
 * POST /api/notifications/log
 * 
 * Log sent notifications for tracking and analytics
 * Used by OneSignal notification service to record delivery
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const logNotificationSchema = z.object({
  user_id: z.string().uuid(),
  fcm_message_id: z.string().optional(),
  fcm_token: z.string().optional(),
  platform: z.enum(['web', 'ios', 'android']).optional(),
  category: z.string(),
  title: z.string().optional(),
  message: z.string().optional(),
  tokens_targeted: z.number().int().min(0).optional(),
  data: z.record(z.any()).optional(),
  booking_id: z.string().uuid().optional(),
  delivery_status: z.enum(['pending', 'sent', 'delivered', 'failed', 'clicked']).default('sent'),
  error_message: z.string().optional(),
  created_at: z.string().datetime(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Parse and validate request body
    const body = await request.json();
    const validation = logNotificationSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid notification log data', details: validation.error.issues },
        { status: 400 }
      );
    }

    const logData = validation.data;

    // Insert notification log record
    const { data: logRecord, error: logError } = await supabase
      .from('notification_logs')
      .insert({
        user_id: logData.user_id,
        notification_type: logData.category,
        title: logData.title || `${logData.category} notification`,
        message: logData.message || '',
        delivery_method: 'push',
        delivery_status: logData.delivery_status,
        fcm_message_id: logData.fcm_message_id,
        fcm_token: logData.fcm_token,
        platform: logData.platform,
        notification_data: {
          tokens_targeted: logData.tokens_targeted,
          category: logData.category,
          data: logData.data,
          sent_at: logData.created_at,
        },
        error_message: logData.error_message,
        sent_at: logData.delivery_status === 'sent' ? logData.created_at : null,
        created_at: logData.created_at,
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to log notification:', logError);
      return NextResponse.json(
        { error: 'Failed to log notification', details: logError },
        { status: 500 }
      );
    }

    // Update notification analytics (optional)
    await updateNotificationAnalytics(logData.category, logData.tokens_targeted || 0);

    return NextResponse.json({
      success: true,
      logId: logRecord.id,
      message: 'Notification logged successfully',
    });

  } catch (error) {
    console.error('Notification logging error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Update notification analytics (optional enhancement)
 */
async function updateNotificationAnalytics(category: string, tokensTargeted: number): Promise<void> {
  try {
    // This could update a separate analytics table
    // For now, just log the analytics data
    console.log(`FCM notification analytics: ${category} sent to ${tokensTargeted} tokens`);
    
    // Future enhancement: Update analytics table
    // await supabase
    //   .from('notification_analytics')
    //   .upsert({
    //     category,
    //     date: new Date().toISOString().split('T')[0],
    //     total_sent: tokensTargeted,
    //   }, {
    //     onConflict: 'category,date'
    //   });
  } catch (error) {
    console.error('Failed to update notification analytics:', error);
  }
}