import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unifiedEmailService } from '@/lib/email/unified-email-service';

interface ReturnPhoto {
  uri: string;
  timestamp: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  description?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  try {
    const { id } = await params;
    const { 
      photos, 
      damage_report, 
      user_type 
    }: { 
      photos: ReturnPhoto[]; 
      damage_report?: string; 
      user_type: 'owner' | 'renter';
    } = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking details to verify permissions and status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings!inner(id, title),
        renter_profile:renter_id(id, full_name, email),
        owner_profile:owner_id(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user is involved in this booking (renter or owner)
    if (booking.renter_id !== user.id && booking.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if booking is in correct status for return verification
    if (booking.status !== 'in_progress') {
      return NextResponse.json({ 
        error: 'Booking must be in progress to verify return' 
      }, { status: 400 });
    }

    // Validate photos
    if (!photos || photos.length < 3 || photos.length > 8) {
      return NextResponse.json({ 
        error: 'Must provide between 3 and 8 return verification photos' 
      }, { status: 400 });
    }

    // Check if it's within the return period (allow returns until end of rental day)
    const today = new Date();
    const endDate = new Date(booking.end_date);
    const endOfRentalPeriod = new Date(endDate);
    endOfRentalPeriod.setHours(23, 59, 59, 999);

    if (today > endOfRentalPeriod) {
      // Allow late returns but flag them
      console.log(`Late return detected for booking ${id}. Current: ${today}, End: ${endOfRentalPeriod}`);
    }

    // Determine if the current user is the renter or owner
    const isRenter = booking.renter_id === user.id;
    const isOwner = booking.owner_id === user.id;

    // Process photos - In a real implementation, you would upload these to storage
    // For now, we'll store the photo data with metadata
    const processedPhotos = photos.map((photo, index) => ({
      ...photo,
      user_id: user.id,
      user_type: isRenter ? 'renter' : 'owner',
      photo_index: index,
      uploaded_at: new Date().toISOString(),
    }));

    // Get current return images
    const currentReturnImages = booking.return_images || [];
    
    // Add new photos to existing ones
    const updatedReturnImages = [
      ...currentReturnImages,
      ...processedPhotos,
    ];

    // Update booking with return verification data
    const updateData: any = {
      return_images: updatedReturnImages,
      updated_at: new Date().toISOString(),
    };

    // Handle damage report if provided
    if (damage_report && damage_report.trim()) {
      updateData.damage_report = damage_report.trim();
      updateData.has_issues = true;
      
      // Create an issue report
      try {
        await supabase
          .from('issue_reports')
          .insert({
            booking_id: id,
            reporter_id: user.id,
            reporter_role: isRenter ? 'renter' : 'owner',
            issue_type: 'damage',
            severity: 'medium',
            title: `Damage reported during return verification`,
            description: damage_report.trim(),
            occurred_at: new Date().toISOString(),
            financial_impact: true, // Assume financial impact for damage reports
            status: 'open',
          });
      } catch (issueError) {
        console.error('Error creating issue report:', issueError);
      }
    }

    if (isRenter) {
      updateData.return_confirmed_by_renter = true;
      updateData.return_confirmed_at = new Date().toISOString();
    } else if (isOwner) {
      updateData.return_confirmed_by_owner = true;
      updateData.return_confirmed_at = new Date().toISOString();
    }

    // Check if both parties have now confirmed return
    const renterConfirmed = isRenter ? true : (booking.return_confirmed_by_renter || false);
    const ownerConfirmed = isOwner ? true : (booking.return_confirmed_by_owner || false);
    
    // If both parties have confirmed, complete the rental
    let rentalCompleted = false;
    if (renterConfirmed && ownerConfirmed) {
      updateData.status = 'completed';
      updateData.completed_at = new Date().toISOString();
      
      // If no damage report, automatically refund the deposit
      if (!damage_report || !damage_report.trim()) {
        updateData.deposit_status = 'refunded';
      } else {
        // Hold deposit for admin review due to damage report
        updateData.deposit_status = 'held';
      }
      
      rentalCompleted = true;
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating booking with return verification:', updateError);
      return NextResponse.json({ 
        error: 'Failed to save return verification' 
      }, { status: 500 });
    }

    // Send notifications for return verification
    try {
      const { fcmAdminService } = await import('@/lib/fcm/admin');
      
      // Determine notification recipients
      const otherPartyId = isRenter ? booking.owner_id : booking.renter_id;
      const otherPartyName = isRenter ? booking.owner_profile.full_name : booking.renter_profile.full_name;
      const currentUserName = isRenter ? booking.renter_profile.full_name : booking.owner_profile.full_name;
      
      if (rentalCompleted) {
        // Rental completed notifications
        const notifications = [
          {
            user_id: booking.renter_id,
            type: 'rental_completed',
            title: 'Rental Completed! 🎉',
            message: `Your rental of "${booking.listings.title}" has been completed successfully. ${damage_report ? 'Damage report is under review.' : 'Your deposit will be refunded shortly.'}`,
            action_url: `/bookings/${id}`,
            data: {
              booking_id: id,
              listing_title: booking.listings.title,
              has_damage_report: Boolean(damage_report),
            },
            priority: 8,
          },
          {
            user_id: booking.owner_id,
            type: 'rental_completed',
            title: 'Rental Completed 📦',
            message: `"${booking.listings.title}" rental with ${booking.renter_profile.full_name} has been completed. ${damage_report ? 'Damage report requires review.' : 'Everything looks good!'}`,
            action_url: `/bookings/${id}`,
            data: {
              booking_id: id,
              listing_title: booking.listings.title,
              renter_name: booking.renter_profile.full_name,
              has_damage_report: Boolean(damage_report),
            },
            priority: 8,
          },
        ];

        await supabase.from('app_notifications').insert(notifications);

        // Send FCM to both parties
        const [renterTokens, ownerTokens] = await Promise.all([
          fcmAdminService.getUserFCMTokens(booking.renter_id),
          fcmAdminService.getUserFCMTokens(booking.owner_id),
        ]);

        if (renterTokens.length > 0) {
          await fcmAdminService.sendToTokens(
            renterTokens.map(t => t.token),
            {
              notification: {
                title: 'Rental Completed! 🎉',
                body: damage_report 
                  ? `"${booking.listings.title}" return completed. Damage report is under review.`
                  : `"${booking.listings.title}" returned successfully! Your deposit will be refunded.`,
                icon: '/icons/notification-icon-192.png',
              },
              data: {
                type: 'rental_completed',
                booking_id: id,
                action_url: `/bookings/${id}`,
              },
            }
          );
        }

        if (ownerTokens.length > 0) {
          await fcmAdminService.sendToTokens(
            ownerTokens.map(t => t.token),
            {
              notification: {
                title: 'Rental Completed 📦',
                body: damage_report
                  ? `"${booking.listings.title}" returned with damage report. Review required.`
                  : `"${booking.listings.title}" returned in good condition by ${booking.renter_profile.full_name}.`,
                icon: '/icons/notification-icon-192.png',
              },
              data: {
                type: 'rental_completed',
                booking_id: id,
                action_url: `/bookings/${id}`,
              },
            }
          );
        }

        // Notify admin for payment release processing
        if (damage_report) {
          // Admin notification for damage report requiring review
          await supabase
            .from('app_notifications')
            .insert({
              user_id: 'admin',
              type: 'damage_report_submitted',
              title: 'Damage Report Requires Review',
              message: `Damage reported for "${booking.listings.title}" rental (${id}). Review required before payment release.`,
              action_url: `/admin/bookings/${id}`,
              data: {
                booking_id: id,
                listing_title: booking.listings.title,
                reporter_name: currentUserName,
                damage_description: damage_report,
                requires_manual_review: true,
              },
              priority: 9,
            });
        } else {
          // Admin notification for successful completion - ready for automatic payment release
          await supabase
            .from('app_notifications')
            .insert({
              user_id: 'admin',
              type: 'rental_completed_successfully',
              title: 'Rental Completed - Payment Release',
              message: `"${booking.listings.title}" rental completed successfully without issues. Ready for payment release to owner.`,
              action_url: `/admin/bookings/${id}`,
              data: {
                booking_id: id,
                listing_title: booking.listings.title,
                owner_id: booking.owner_id,
                renter_id: booking.renter_id,
                total_amount: booking.total_amount,
                deposit_amount: booking.deposit_amount,
                requires_manual_review: false,
                ready_for_payment_release: true,
              },
              priority: 7,
            });
        }

      } else {
        // Waiting for other party verification
        await supabase
          .from('app_notifications')
          .insert({
            user_id: otherPartyId,
            type: 'return_verification_submitted',
            title: 'Return Verification Received',
            message: `${currentUserName} has submitted return verification for "${booking.listings.title}". ${damage_report ? 'A damage report was included.' : 'Please verify on your end to complete the return.'}`,
            action_url: `/bookings/${id}`,
            data: {
              booking_id: id,
              listing_title: booking.listings.title,
              verifier_name: currentUserName,
              has_damage_report: Boolean(damage_report),
            },
            priority: 8,
          });

        // Send FCM push notification
        const otherPartyTokens = await fcmAdminService.getUserFCMTokens(otherPartyId);
        if (otherPartyTokens.length > 0) {
          await fcmAdminService.sendToTokens(
            otherPartyTokens.map(t => t.token),
            {
              notification: {
                title: 'Return Verification Received 📸',
                body: damage_report
                  ? `${currentUserName} reported damage during return of "${booking.listings.title}". Review required.`
                  : `${currentUserName} has verified return condition. Please complete your verification.`,
                icon: '/icons/notification-icon-192.png',
              },
              data: {
                type: 'return_verification_submitted',
                booking_id: id,
                action_url: `/bookings/${id}`,
              },
            }
          );
        }
      }

    } catch (notificationError) {
      console.error('Failed to send return verification notifications:', notificationError);
    }

    // Send completion emails if rental is completed
    if (rentalCompleted) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au';
        
        const emailData = {
          booking_id: id,
          listing_title: booking.listings.title,
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_amount: booking.total_amount,
          renter_name: booking.renter_profile.full_name,
          renter_email: booking.renter_profile.email,
          owner_name: booking.owner_profile.full_name,
          owner_email: booking.owner_profile.email,
          base_url: baseUrl,
          damage_report: damage_report || null,
        };

        // Send rental completed emails to both parties
        await Promise.all([
          unifiedEmailService.sendRentalCompletedEmail(emailData, false), // renter
          unifiedEmailService.sendRentalCompletedEmail(emailData, true),  // owner
        ]);
      } catch (emailError) {
        console.error('Failed to send rental completed emails:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Return verification submitted successfully',
      photos_uploaded: processedPhotos.length,
      return_complete: rentalCompleted,
      has_damage_report: Boolean(damage_report),
      deposit_status: updateData.deposit_status || booking.deposit_status,
    });

  } catch (error) {
    console.error('Error processing return verification:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
