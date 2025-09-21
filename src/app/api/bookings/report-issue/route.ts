import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { emailService } from '@/lib/email/resend';
import { fcmService } from '@/lib/notifications/fcm';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    
    const reportData = {
      id: uuidv4(),
      booking_id: formData.get('booking_id') as string,
      reporter_id: formData.get('reporter_id') as string,
      reporter_role: formData.get('reporter_role') as string,
      issue_type: formData.get('issue_type') as string,
      severity: formData.get('severity') as string,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      occurred_at: formData.get('occurred_at') as string,
      location: formData.get('location') as string,
      financial_impact: formData.get('financial_impact') === 'true',
      estimated_cost: parseFloat(formData.get('estimated_cost') as string) || 0,
      resolution_requested: formData.get('resolution_requested') as string,
      contact_preference: formData.get('contact_preference') as string,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Validate required fields
    if (!reportData.booking_id || !reportData.issue_type || !reportData.title || !reportData.description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get photos from form data
    const photos = formData.getAll('photos') as File[];
    const photoUrls: string[] = [];

    // Upload photos to Supabase Storage (if any)
    if (photos.length > 0) {
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        if (photo.size > 0) { // Check if file is not empty
          const fileExt = photo.name.split('.').pop();
          const fileName = `${reportData.id}_${i + 1}.${fileExt}`;
          const filePath = `issue-reports/${reportData.booking_id}/${fileName}`;

          try {
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('issue-photos')
              .upload(filePath, photo, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadError) {
              console.error('Photo upload error:', uploadError);
              // Continue without this photo rather than failing the entire request
            } else {
              // Get public URL
              const { data: { publicUrl } } = supabase.storage
                .from('issue-photos')
                .getPublicUrl(filePath);
              
              photoUrls.push(publicUrl);
            }
          } catch (photoError) {
            console.error('Error processing photo:', photoError);
            // Continue without this photo
          }
        }
      }
    }

    // Add photo URLs to report data
    const finalReportData = {
      ...reportData,
      photos: photoUrls
    };

    // Insert report into database
    const { data: insertData, error: insertError } = await supabase
      .from('issue_reports')
      .insert([finalReportData])
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    // Get booking details for notification
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listing:listings(*),
        renter:profiles!bookings_renter_id_fkey(*),
        owner:profiles!bookings_owner_id_fkey(*)
      `)
      .eq('id', reportData.booking_id)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
    }

    // Send email notification to admin
    try {
      const adminEmailData = {
        reportId: finalReportData.id,
        bookingId: finalReportData.booking_id,
        reporterName: booking?.renter?.full_name || booking?.owner?.full_name || 'Unknown',
        reporterRole: finalReportData.reporter_role as 'owner' | 'renter',
        issueType: finalReportData.issue_type,
        severity: finalReportData.severity as 'low' | 'medium' | 'high' | 'critical',
        title: finalReportData.title,
        description: finalReportData.description,
        listingTitle: booking?.listing?.title || 'Unknown Listing',
        financialImpact: finalReportData.financial_impact,
        estimatedCost: finalReportData.estimated_cost,
        photos: photoUrls,
        createdAt: finalReportData.created_at,
        adminUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/issue-reports?report=${finalReportData.id}`,
      };

      await emailService.sendAdminIssueNotification(adminEmailData);
    } catch (emailError) {
      console.error('Error sending admin email notification:', emailError);
      // Don't fail the request if email fails
    }

    // Send FCM notification for urgent issues (high/critical severity)
    try {
      if (finalReportData.severity === 'high' || finalReportData.severity === 'critical') {
        const fcmData = {
          reportId: finalReportData.id,
          bookingId: finalReportData.booking_id,
          reporterName: booking?.renter?.full_name || booking?.owner?.full_name || 'Unknown',
          reporterRole: finalReportData.reporter_role as 'owner' | 'renter',
          issueType: finalReportData.issue_type,
          severity: finalReportData.severity as 'low' | 'medium' | 'high' | 'critical',
          title: finalReportData.title,
          listingTitle: booking?.listing?.title || 'Unknown Listing',
          financialImpact: finalReportData.financial_impact,
          estimatedCost: finalReportData.estimated_cost,
        };

        await fcmService.sendIssueReportNotification(fcmData);
      }
    } catch (fcmError) {
      console.error('Error sending FCM notification:', fcmError);
      // Don't fail the request if FCM fails
    }

    // Send confirmation email to reporter
    try {
      const confirmationData = {
        reportId: finalReportData.id,
        reporterName: booking?.renter?.full_name || booking?.owner?.full_name || 'Unknown',
        title: finalReportData.title,
        bookingId: finalReportData.booking_id,
        listingTitle: booking?.listing?.title || 'Unknown Listing',
        status: finalReportData.status,
        contactPreference: finalReportData.contact_preference,
      };

      await emailService.sendReporterConfirmation(confirmationData, user.email);
    } catch (confirmationError) {
      console.error('Error sending confirmation email:', confirmationError);
      // Don't fail the request if confirmation fails
    }

    return NextResponse.json({ 
      success: true, 
      report_id: insertData.id,
      message: 'Issue report submitted successfully' 
    });

  } catch (error) {
    console.error('Error processing issue report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

