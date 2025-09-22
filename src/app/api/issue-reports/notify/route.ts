import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { emailService } from '@/lib/email/resend';
import { fcmService } from '@/lib/notifications/fcm';

// Create Supabase client with service role key for admin access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { report_id, booking_id, severity, issue_type, title } = body;

    if (!report_id || !booking_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch the full report details from the database
    const { data: report, error: reportError } = await supabaseAdmin
      .from('issue_reports_with_details')
      .select('*')
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      console.error('Error fetching report details:', reportError);
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Send email notification to admin
    try {
      const adminEmailData = {
        reportId: report.id,
        bookingId: report.booking_id,
        issueType: report.issue_type,
        severity: report.severity,
        title: report.title,
        description: report.description,
        reporterName: report.reporter_name || 'Unknown',
        reporterRole: report.reporter_role,
        itemTitle: report.listing_title || 'Unknown Item',
        reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/issue-reports?id=${report.id}`,
        createdAt: new Date(report.created_at).toLocaleString(),
      };

      await emailService.sendAdminIssueNotification(adminEmailData);
      console.log('Admin email notification sent successfully');
    } catch (emailError) {
      console.error('Error sending admin email notification:', emailError);
      // Don't fail the request if email fails
    }

    // Send FCM notification for urgent issues (high/critical severity)
    try {
      if (severity === 'high' || severity === 'critical') {
        const fcmData = {
          title: `🚨 ${severity.toUpperCase()} Issue Report`,
          body: `${issue_type}: ${title}`,
          data: {
            type: 'issue_report',
            report_id: report_id,
            booking_id: booking_id,
            severity: severity,
            url: `/admin/issue-reports?id=${report_id}`,
          },
        };

        await fcmService.sendIssueReportNotification(fcmData);
        console.log('FCM notification sent successfully');
      }
    } catch (fcmError) {
      console.error('Error sending FCM notification:', fcmError);
      // Don't fail the request if FCM fails
    }

    // Send confirmation email to reporter
    try {
      const reporterEmail = report.reporter_email;
      if (reporterEmail) {
        const confirmationData = {
          reportId: report.id,
          reporterName: report.reporter_name || 'User',
          issueType: report.issue_type,
          title: report.title,
          itemTitle: report.listing_title || 'Unknown Item',
          createdAt: new Date(report.created_at).toLocaleString(),
        };

        await emailService.sendReporterConfirmation(confirmationData, reporterEmail);
        console.log('Reporter confirmation email sent successfully');
      }
    } catch (confirmationError) {
      console.error('Error sending confirmation email:', confirmationError);
      // Don't fail the request if confirmation email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Notifications sent successfully',
    });

  } catch (error) {
    console.error('Error in issue report notification endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}


