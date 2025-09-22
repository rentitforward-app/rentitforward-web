import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fcmAdminService } from '@/lib/fcm/admin';

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
    const fcmTitle = '🎉 Booking Completed!';
    const fcmBody = `${renterName} has completed their booking for "${listingTitle}"`;
    const fcmData = { 
      type: 'booking_completed', 
      booking_id: bookingId, 
      action_url: `/bookings/${bookingId}` 
    };
    
    await fcmAdminService.sendToUser(ownerId, fcmTitle, fcmBody, fcmData);

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

