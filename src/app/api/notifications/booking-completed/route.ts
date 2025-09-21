import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FCMBookingNotifications } from '@/lib/fcm/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      bookingId, 
      ownerId, 
      listingTitle, 
      renterName, 
      totalAmount, 
      startDate, 
      endDate 
    } = body;

    // Validate required fields
    if (!bookingId || !ownerId || !listingTitle || !renterName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Send FCM notification to owner
    await FCMBookingNotifications.notifyOwnerBookingCompleted(
      ownerId,
      bookingId,
      listingTitle,
      renterName,
      totalAmount || 0,
      startDate,
      endDate
    );

    // Create in-app notification
    const supabase = await createClient();
    await supabase.from('app_notifications').insert({
      user_id: ownerId,
      type: 'booking_completed',
      title: '🎉 Booking Completed!',
      message: `${renterName} has completed their booking for "${listingTitle}" and paid $${(totalAmount || 0).toFixed(2)}`,
      action_url: `/bookings/${bookingId}`,
      priority: 8,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send booking completed notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

