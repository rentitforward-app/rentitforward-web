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
  onesignal_id: z.string(),
  category: z.string(),
  title: z.string().optional(),
  message: z.string().optional(),
  players_targeted: z.number().int().min(0),
  data: z.record(z.any()).optional(),
  booking_id: z.string().uuid().optional(),
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
      .from('notification_history')
      .insert({
        user_id: logData.user_id,
        type: logData.category,
        title: logData.title || `${logData.category} notification`,
        message: logData.message || '',
        onesignal_id: logData.onesignal_id,
        status: 'sent',
        booking_id: logData.booking_id,
        metadata: {
          players_targeted: logData.players_targeted,
          category: logData.category,
          data: logData.data,
          sent_at: logData.created_at,
        },
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
    await this.updateNotificationAnalytics(logData.category, logData.players_targeted);

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
async function updateNotificationAnalytics(category: string, playersTargeted: number): Promise<void> {
  try {
    // This could update a separate analytics table
    // For now, just log the analytics data
    console.log(`Notification analytics: ${category} sent to ${playersTargeted} players`);
    
    // Future enhancement: Update analytics table
    // await supabase
    //   .from('notification_analytics')
    //   .upsert({
    //     category,
    //     date: new Date().toISOString().split('T')[0],
    //     total_sent: playersTargeted,
    //   }, {
    //     onConflict: 'category,date'
    //   });
  } catch (error) {
    console.error('Failed to update notification analytics:', error);
  }
}