import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { emailService } from '@/lib/email/resend';
import { fcmService } from '@/lib/notifications/fcm';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { type } = await request.json();

    if (!type || !['email', 'fcm', 'both'].includes(type)) {
      return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    const results: any = {};

    // Test email notification
    if (type === 'email' || type === 'both') {
      try {
        const testEmailData = {
          reportId: 'test-report-123',
          bookingId: 'test-booking-456',
          reporterName: 'Test User',
          reporterRole: 'renter' as const,
          issueType: 'damage',
          severity: 'high' as const,
          title: 'Test Issue Report - Email Notification',
          description: 'This is a test issue report to verify email notifications are working correctly.',
          listingTitle: 'Test Camera Equipment',
          financialImpact: true,
          estimatedCost: 150.00,
          photos: [],
          createdAt: new Date().toISOString(),
          adminUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/issue-reports?report=test-report-123`,
        };

        const emailResult = await emailService.sendAdminIssueNotification(testEmailData);
        results.email = emailResult;
      } catch (error) {
        results.email = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    // Test FCM notification
    if (type === 'fcm' || type === 'both') {
      try {
        const fcmResult = await fcmService.sendTestNotification();
        results.fcm = fcmResult;
      } catch (error) {
        results.fcm = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    // Determine overall success
    const overallSuccess = Object.values(results).every((result: any) => result.success);

    return NextResponse.json({
      success: overallSuccess,
      results,
      message: overallSuccess 
        ? 'Test notifications sent successfully' 
        : 'Some test notifications failed'
    });

  } catch (error) {
    console.error('Error sending test notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
