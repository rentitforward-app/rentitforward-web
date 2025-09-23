import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unifiedEmailService } from '@/lib/email/unified-email-service';

interface PickupPhoto {
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
    const { photos, user_type }: { photos: PickupPhoto[]; user_type: 'owner' | 'renter' } = await request.json();

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

    // Check if booking is in correct status for pickup verification
    if (booking.status !== 'confirmed') {
      return NextResponse.json({ 
        error: 'Booking must be confirmed to verify pickup' 
      }, { status: 400 });
    }

    // Validate photos
    if (!photos || photos.length < 3 || photos.length > 8) {
      return NextResponse.json({ 
        error: 'Must provide between 3 and 8 verification photos' 
      }, { status: 400 });
    }

    // Check if it's the pickup date (allow pickup verification within the rental period)
    const today = new Date();
    const startDate = new Date(booking.start_date);
    const endDate = new Date(booking.end_date);
    
    // Set dates to start and end of day for comparison
    const startOfPickupDate = new Date(startDate);
    startOfPickupDate.setHours(0, 0, 0, 0);
    const endOfRentalPeriod = new Date(endDate);
    endOfRentalPeriod.setHours(23, 59, 59, 999);

    if (today < startOfPickupDate || today > endOfRentalPeriod) {
      return NextResponse.json({ 
        error: 'Pickup verification can only be done during the rental period' 
      }, { status: 400 });
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

    // Get current pickup images
    const currentPickupImages = booking.pickup_images || [];
    
    // Add new photos to existing ones
    const updatedPickupImages = [
      ...currentPickupImages,
      ...processedPhotos,
    ];

    // Update booking with photo verification data
    const updateData: any = {
      pickup_images: updatedPickupImages,
      updated_at: new Date().toISOString(),
    };

    if (isRenter) {
      updateData.pickup_confirmed_by_renter = true;
      updateData.pickup_confirmed_at = new Date().toISOString();
    } else if (isOwner) {
      updateData.pickup_confirmed_by_owner = true;
      updateData.pickup_confirmed_at = new Date().toISOString();
    }

    // Check if both parties have now confirmed pickup with photos
    const renterConfirmed = isRenter ? true : (booking.pickup_confirmed_by_renter || false);
    const ownerConfirmed = isOwner ? true : (booking.pickup_confirmed_by_owner || false);
    
    // If both parties have confirmed, update status to 'in_progress'
    if (renterConfirmed && ownerConfirmed) {
      updateData.status = 'in_progress';
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating booking with pickup verification:', updateError);
      return NextResponse.json({ 
        error: 'Failed to save pickup verification' 
      }, { status: 500 });
    }

    // Send notifications for pickup verification
    try {
      const { fcmAdminService } = await import('@/lib/fcm/admin');
      
      // Determine notification recipients
      const otherPartyId = isRenter ? booking.owner_id : booking.renter_id;
      const otherPartyName = isRenter ? booking.owner_profile.full_name : booking.renter_profile.full_name;
      const currentUserName = isRenter ? booking.renter_profile.full_name : booking.owner_profile.full_name;
      
      // Create in-app notification for the other party
      await supabase
        .from('app_notifications')
        .insert({
          user_id: otherPartyId,
          type: 'pickup_verification_submitted',
          title: 'Pickup Verification Received',
          message: `${currentUserName} has submitted pickup verification photos for "${booking.listings.title}". ${renterConfirmed && ownerConfirmed ? 'Pickup is now complete!' : 'Waiting for your verification.'}`,
          action_url: `/bookings/${id}`,
          data: {
            booking_id: id,
            listing_title: booking.listings.title,
            verifier_name: currentUserName,
            verification_complete: renterConfirmed && ownerConfirmed,
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
              title: renterConfirmed && ownerConfirmed ? 'Pickup Complete! 📦' : 'Pickup Verification Received 📸',
              body: renterConfirmed && ownerConfirmed 
                ? `"${booking.listings.title}" pickup is now complete. Your rental has started!`
                : `${currentUserName} has verified the item condition. Please verify on your end to complete pickup.`,
              icon: '/icons/notification-icon-192.png',
            },
            data: {
              type: 'pickup_verification_submitted',
              booking_id: id,
              action_url: `/bookings/${id}`,
            },
          }
        );
      }

      // If both parties have confirmed, send "rental started" notifications
      if (renterConfirmed && ownerConfirmed) {
        // Notification for both parties
        await supabase
          .from('app_notifications')
          .insert([
            {
              user_id: booking.renter_id,
              type: 'rental_started',
              title: 'Rental Started! 🎉',
              message: `Your rental of "${booking.listings.title}" has officially started. Enjoy your rental!`,
              action_url: `/bookings/${id}`,
              data: {
                booking_id: id,
                listing_title: booking.listings.title,
              },
              priority: 7,
            },
            {
              user_id: booking.owner_id,
              type: 'rental_started',
              title: 'Item Rental Started 📦',
              message: `"${booking.listings.title}" rental has started with ${booking.renter_profile.full_name}.`,
              action_url: `/bookings/${id}`,
              data: {
                booking_id: id,
                listing_title: booking.listings.title,
                renter_name: booking.renter_profile.full_name,
              },
              priority: 7,
            },
          ]);

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
                title: 'Rental Started! 🎉',
                body: `Your rental of "${booking.listings.title}" has officially started. Enjoy!`,
                icon: '/icons/notification-icon-192.png',
              },
              data: {
                type: 'rental_started',
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
                title: 'Rental Started 📦',
                body: `"${booking.listings.title}" rental has started with ${booking.renter_profile.full_name}.`,
                icon: '/icons/notification-icon-192.png',
              },
              data: {
                type: 'rental_started',
                booking_id: id,
                action_url: `/bookings/${id}`,
              },
            }
          );
        }
      }
    } catch (notificationError) {
      console.error('Failed to send pickup verification notifications:', notificationError);
    }

    // Send pickup verification emails if both parties have confirmed
    if (renterConfirmed && ownerConfirmed) {
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
        };

        // Send pickup completed emails to both parties
        await Promise.all([
          unifiedEmailService.sendRentalStartedEmail(emailData, false), // renter
          unifiedEmailService.sendRentalStartedEmail(emailData, true),  // owner
        ]);
      } catch (emailError) {
        console.error('Failed to send pickup completed emails:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Pickup verification submitted successfully',
      photos_uploaded: processedPhotos.length,
      pickup_complete: renterConfirmed && ownerConfirmed,
    });

  } catch (error) {
    console.error('Error processing pickup verification:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
