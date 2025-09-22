import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unifiedEmailService } from '@/lib/email/unified-email-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  try {
    const { id } = await params;

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

    // Check if booking is in correct status for pickup
    if (booking.status !== 'confirmed') {
      return NextResponse.json({ 
        error: 'Booking must be confirmed to confirm pickup' 
      }, { status: 400 });
    }

    // Check if it's the pickup date
    const today = new Date();
    const startDate = new Date(booking.start_date);
    const isPickupDate = startDate.toDateString() === today.toDateString();

    if (!isPickupDate) {
      return NextResponse.json({ 
        error: 'Pickup can only be confirmed on the pickup date' 
      }, { status: 400 });
    }

    // Update booking status to 'active' (picked up)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'active',
        pickup_confirmed_at: new Date().toISOString(),
        pickup_confirmed_by: user.id
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      return NextResponse.json({ 
        error: 'Failed to confirm pickup' 
      }, { status: 500 });
    }

    // Send FCM push notifications and in-app notifications
    try {
      const { fcmAdminService } = await import('@/lib/fcm/admin');
      
      // Create in-app notifications for both parties
      await supabase
        .from('app_notifications')
        .insert([
          {
            user_id: booking.renter_id,
            type: 'pickup_confirmed',
            title: 'Pickup Confirmed!',
            message: `Your rental of "${booking.listings.title}" has been picked up successfully.`,
            action_url: `/bookings/${id}`,
            data: {
              booking_id: id,
              listing_title: booking.listings.title,
              pickup_date: booking.start_date,
            },
            priority: 7,
          },
          {
            user_id: booking.owner_id,
            type: 'pickup_confirmed',
            title: 'Item Picked Up',
            message: `"${booking.listings.title}" has been picked up by ${booking.renter_profile.full_name}.`,
            action_url: `/bookings/${id}`,
            data: {
              booking_id: id,
              listing_title: booking.listings.title,
              renter_name: booking.renter_profile.full_name,
            },
            priority: 7,
          },
        ]);

      // Send FCM push notifications
      const renterTokens = await fcmAdminService.getUserFCMTokens(booking.renter_id);
      const ownerTokens = await fcmAdminService.getUserFCMTokens(booking.owner_id);

      if (renterTokens.length > 0) {
        await fcmAdminService.sendToTokens(
          renterTokens.map(t => t.token),
          {
            notification: {
              title: 'Pickup Confirmed! 📦',
              body: `Your rental of "${booking.listings.title}" has been picked up successfully.`,
              icon: '/icons/notification-icon-192.png',
            },
            data: {
              type: 'pickup_confirmed',
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
              title: 'Item Picked Up 📦',
              body: `"${booking.listings.title}" has been picked up by ${booking.renter_profile.full_name}.`,
              icon: '/icons/notification-icon-192.png',
            },
            data: {
              type: 'pickup_confirmed',
              booking_id: id,
              action_url: `/bookings/${id}`,
            },
          }
        );
      }
    } catch (fcmError) {
      console.error('Failed to send FCM notifications:', fcmError);
    }

    // Send pickup confirmation emails
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
        listing_location: 'Location TBD',
        base_url: baseUrl,
      };

      // Send email to both parties
      await Promise.all([
        unifiedEmailService.sendPickupConfirmationEmail(emailData, false), // renter
        unifiedEmailService.sendPickupConfirmationEmail(emailData, true),  // owner
      ]);
    } catch (emailError) {
      console.error('Failed to send pickup confirmation emails:', emailError);
      // Don't fail the pickup confirmation if email fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pickup confirmed successfully' 
    });

  } catch (error) {
    console.error('Error confirming pickup:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

