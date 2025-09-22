import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unifiedEmailService } from '@/lib/email/unified-email-service';
import { fcmAdminService } from '@/lib/fcm/admin';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication and admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { eventType, notificationType } = await request.json();

    const validEventTypes = [
      'booking_request',
      'booking_approved', 
      'booking_rejected',
      'booking_cancelled',
      'pickup_confirmed',
      'return_confirmed',
      'payment_received',
      'payment_released',
      'new_message'
    ];

    const validNotificationTypes = ['email', 'fcm', 'in_app', 'all'];

    if (!eventType || !validEventTypes.includes(eventType)) {
      return NextResponse.json({ 
        error: 'Invalid event type', 
        validTypes: validEventTypes 
      }, { status: 400 });
    }

    if (!notificationType || !validNotificationTypes.includes(notificationType)) {
      return NextResponse.json({ 
        error: 'Invalid notification type', 
        validTypes: validNotificationTypes 
      }, { status: 400 });
    }

    const results: any = {};
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au';

    // Test data for different event types
    const testData = {
      booking_request: {
        email: {
          to: profile.email || 'admin@rentitforward.com.au',
          subject: '📋 Test Booking Request Notification',
          html: `
            <h2>Test Booking Request</h2>
            <p>This is a test notification for booking request events.</p>
            <p><strong>Listing:</strong> Test Camera Equipment</p>
            <p><strong>Renter:</strong> Test User</p>
            <p><strong>Dates:</strong> ${new Date().toLocaleDateString()} - ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
            <p><strong>Total:</strong> $150.00</p>
          `,
        },
        fcm: {
          title: '📋 New Booking Request',
          body: 'Test User wants to rent your Test Camera Equipment',
          data: { type: 'booking_request', booking_id: 'test-123' }
        },
        inApp: {
          type: 'booking_request',
          title: '📋 New Booking Request',
          message: 'Test User wants to rent your Test Camera Equipment',
          action_url: '/bookings/test-123',
          priority: 8
        }
      },
      booking_approved: {
        email: async () => await unifiedEmailService.sendBookingConfirmationEmail({
          booking_id: 'test-123',
          listing_title: 'Test Camera Equipment',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          total_amount: 150.00,
          renter_name: 'Test Renter',
          renter_email: profile.email || 'test@example.com',
          owner_name: 'Test Owner',
          owner_email: profile.email || 'test@example.com',
          listing_location: 'Test Location',
          base_url: baseUrl
        }, false),
        fcm: {
          title: '✅ Booking Confirmed!',
          body: 'Your booking for Test Camera Equipment has been approved',
          data: { type: 'booking_approved', booking_id: 'test-123' }
        },
        inApp: {
          type: 'booking_approved',
          title: '✅ Booking Confirmed!',
          message: 'Your booking for Test Camera Equipment has been approved',
          action_url: '/bookings/test-123',
          priority: 9
        }
      },
      booking_rejected: {
        email: {
          to: profile.email || 'test@example.com',
          subject: '❌ Test Booking Request Declined',
          html: `
            <h2>Booking Request Declined</h2>
            <p>This is a test notification for booking rejection events.</p>
            <p><strong>Listing:</strong> Test Camera Equipment</p>
            <p>The owner has declined your booking request.</p>
          `,
        },
        fcm: {
          title: '❌ Booking Declined',
          body: 'Your request for Test Camera Equipment was declined',
          data: { type: 'booking_rejected', booking_id: 'test-123' }
        },
        inApp: {
          type: 'booking_rejected',
          title: '❌ Booking Declined',
          message: 'Your request for Test Camera Equipment was declined',
          action_url: '/bookings/test-123',
          priority: 7
        }
      },
      booking_cancelled: {
        email: async () => await unifiedEmailService.sendBookingCancellationEmail({
          booking_id: 'test-123',
          listing_title: 'Test Camera Equipment',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          total_amount: 150.00,
          renter_name: 'Test Renter',
          renter_email: profile.email || 'test@example.com',
          owner_name: 'Test Owner',
          owner_email: profile.email || 'test@example.com',
          listing_location: 'Test Location',
          base_url: baseUrl,
          cancellation_fee: 15.00,
          refund_amount: 135.00
        }, false, false),
        fcm: {
          title: '🚫 Booking Cancelled',
          body: 'Booking for Test Camera Equipment has been cancelled',
          data: { type: 'booking_cancelled', booking_id: 'test-123' }
        },
        inApp: {
          type: 'booking_cancelled',
          title: '🚫 Booking Cancelled',
          message: 'Booking for Test Camera Equipment has been cancelled',
          action_url: '/bookings/test-123',
          priority: 8
        }
      },
      pickup_confirmed: {
        email: async () => await unifiedEmailService.sendPickupConfirmationEmail({
          booking_id: 'test-123',
          listing_title: 'Test Camera Equipment',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          total_amount: 150.00,
          renter_name: 'Test Renter',
          renter_email: profile.email || 'test@example.com',
          owner_name: 'Test Owner',
          owner_email: profile.email || 'test@example.com',
          listing_location: 'Test Location',
          base_url: baseUrl
        }, false),
        fcm: {
          title: '📦 Pickup Confirmed',
          body: 'Test Camera Equipment pickup has been confirmed',
          data: { type: 'pickup_confirmed', booking_id: 'test-123' }
        },
        inApp: {
          type: 'pickup_confirmed',
          title: '📦 Pickup Confirmed',
          message: 'Test Camera Equipment pickup has been confirmed',
          action_url: '/bookings/test-123',
          priority: 7
        }
      },
      return_confirmed: {
        email: async () => await unifiedEmailService.sendReturnConfirmationEmail({
          booking_id: 'test-123',
          listing_title: 'Test Camera Equipment',
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          total_amount: 150.00,
          renter_name: 'Test Renter',
          renter_email: profile.email || 'test@example.com',
          owner_name: 'Test Owner',
          owner_email: profile.email || 'test@example.com',
          listing_location: 'Test Location',
          base_url: baseUrl
        }, false),
        fcm: {
          title: '🔄 Return Confirmed',
          body: 'Test Camera Equipment return has been confirmed',
          data: { type: 'return_confirmed', booking_id: 'test-123' }
        },
        inApp: {
          type: 'return_confirmed',
          title: '🔄 Return Confirmed',
          message: 'Test Camera Equipment return has been confirmed',
          action_url: '/bookings/test-123',
          priority: 7
        }
      },
      payment_received: {
        email: async () => await unifiedEmailService.sendPaymentReceivedEmail({
          booking_id: 'test-123',
          listing_title: 'Test Camera Equipment',
          owner_name: 'Test Owner',
          owner_email: profile.email || 'test@example.com',
          renter_name: 'Test Renter',
          amount: 150.00,
          base_url: baseUrl
        }),
        fcm: {
          title: '💳 Payment Received',
          body: 'Payment of $150.00 received for Test Camera Equipment',
          data: { type: 'payment_received', booking_id: 'test-123' }
        },
        inApp: {
          type: 'payment_received',
          title: '💳 Payment Received',
          message: 'Payment of $150.00 received for Test Camera Equipment',
          action_url: '/bookings/test-123',
          priority: 8
        }
      },
      payment_released: {
        email: async () => await unifiedEmailService.sendPaymentReleaseEmail({
          booking_id: 'test-123',
          listing_title: 'Test Camera Equipment',
          owner_name: 'Test Owner',
          owner_email: profile.email || 'test@example.com',
          renter_name: 'Test Renter',
          amount: 135.00,
          payout_id: 'test-payout-123',
          base_url: baseUrl
        }),
        fcm: {
          title: '💰 Payment Released!',
          body: 'Your payout of $135.00 has been processed',
          data: { type: 'payment_released', booking_id: 'test-123' }
        },
        inApp: {
          type: 'payment_released',
          title: '💰 Payment Released!',
          message: 'Your payout of $135.00 has been processed',
          action_url: '/payouts/test-payout-123',
          priority: 9
        }
      },
      new_message: {
        email: async () => await unifiedEmailService.sendMessageNotificationEmail({
          sender_name: 'Test Sender',
          recipient_name: 'Test User',
          recipient_email: profile.email || 'test@example.com',
          listing_title: 'Test Camera Equipment',
          booking_id: 'test-123',
          message_preview: 'This is a test message to verify message notifications are working correctly.',
          base_url: baseUrl
        }),
        fcm: {
          title: '💬 New Message',
          body: 'Test Sender: This is a test message...',
          data: { type: 'new_message', conversation_id: 'test-conv-123' }
        },
        inApp: {
          type: 'new_message',
          title: '💬 New Message from Test Sender',
          message: 'This is a test message to verify message notifications...',
          action_url: '/messages?with=test-user&booking=test-123',
          priority: 6
        }
      }
    };

    const currentTestData = testData[eventType as keyof typeof testData];

    // Test email notification
    if (notificationType === 'email' || notificationType === 'all') {
      try {
        let emailResult;
        if (typeof currentTestData.email === 'function') {
          emailResult = await currentTestData.email();
        } else {
          emailResult = await unifiedEmailService.sendEmail(currentTestData.email);
        }
        results.email = emailResult;
      } catch (error) {
        results.email = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    // Test FCM notification
    if (notificationType === 'fcm' || notificationType === 'all') {
      try {
        // Get user's FCM tokens
        const userTokens = await fcmAdminService.getUserFCMTokens(user.id);
        
        if (userTokens.length === 0) {
          results.fcm = { 
            success: false, 
            error: 'No FCM tokens found for user. Please register for push notifications first.' 
          };
        } else {
          // Build FCM message
          const { buildFCMMessage } = await import('@/lib/fcm/admin');
          const fcmMessage = buildFCMMessage(
            currentTestData.fcm.title,
            currentTestData.fcm.body,
            currentTestData.fcm.data
          );

          // Send to all user tokens
          const tokens = userTokens.map(t => t.token);
          const fcmResult = await fcmAdminService.sendToTokens(tokens, fcmMessage);
          results.fcm = fcmResult;
        }
      } catch (error) {
        results.fcm = { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }

    // Test in-app notification
    if (notificationType === 'in_app' || notificationType === 'all') {
      try {
        const { error: insertError } = await supabase
          .from('app_notifications')
          .insert({
            user_id: user.id,
            ...currentTestData.inApp
          });

        results.in_app = insertError 
          ? { success: false, error: insertError.message }
          : { success: true, message: 'In-app notification created' };
      } catch (error) {
        results.in_app = { 
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
      eventType,
      notificationType,
      message: overallSuccess 
        ? `Test ${eventType} notifications sent successfully via ${notificationType}` 
        : `Some ${eventType} test notifications failed`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error sending test notifications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

