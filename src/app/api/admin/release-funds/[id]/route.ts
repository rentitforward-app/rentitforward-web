import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Platform commission rate (should match create-session)
const PLATFORM_COMMISSION_PERCENT = 0.20; // 20% platform fee

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id: bookingId } = resolvedParams;
    const { adminUserId, releaseType = 'automatic' } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // TODO: Add admin authorization check
    // Verify the requesting user is an admin
    if (adminUserId) {
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', adminUserId)
        .single();

      if (adminError || !adminProfile || adminProfile.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized: Admin access required' },
          { status: 403 }
        );
      }
    }

    // Fetch booking details with owner info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles!owner_id (
          id,
          full_name,
          email,
          stripe_account_id
        )
      `)
      .eq('id', bookingId)
      .eq('status', 'completed') // Only release funds for completed rentals
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or not eligible for fund release' },
        { status: 404 }
      );
    }

    // Check if funds have already been released
    if (booking.admin_released_at) {
      return NextResponse.json(
        { error: 'Funds have already been released for this booking' },
        { status: 400 }
      );
    }

    const ownerStripeAccount = booking.profiles?.stripe_account_id;
    if (!ownerStripeAccount) {
      return NextResponse.json(
        { error: 'Owner does not have a connected Stripe account' },
        { status: 400 }
      );
    }

    // Calculate amounts
    const totalPaid = booking.total_amount * 100; // Convert to cents
    const platformFee = Math.round(booking.subtotal * PLATFORM_COMMISSION_PERCENT * 100);
    const ownerPayout = totalPaid - platformFee; // Owner gets total minus platform fee
    const depositAmount = booking.deposit_amount * 100; // Security deposit to refund to renter

    // Get the original payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
    
    // Create transfer to owner (minus platform fee)
    const transfer = await stripe.transfers.create({
      amount: ownerPayout,
      currency: 'aud',
      destination: ownerStripeAccount,
      metadata: {
        type: 'rental_payment_release',
        booking_id: bookingId,
        original_payment_intent: booking.stripe_payment_intent_id,
        release_type: releaseType,
        admin_user_id: adminUserId || 'system',
        platform_fee: platformFee.toString(),
      },
    });

    // If there's a security deposit, create a separate refund to the renter
    let depositRefund = null;
    if (depositAmount > 0) {
      try {
        // Find the charge associated with the payment intent
        const charges = await stripe.charges.list({
          payment_intent: booking.stripe_payment_intent_id,
          limit: 1,
        });

        if (charges.data.length > 0) {
          depositRefund = await stripe.refunds.create({
            charge: charges.data[0].id,
            amount: depositAmount,
            reason: 'requested_by_customer',
            metadata: {
              type: 'security_deposit_refund',
              booking_id: bookingId,
              release_type: releaseType,
            },
          });
        }
      } catch (refundError) {
        console.error('Error creating deposit refund:', refundError);
        // Don't fail the entire operation if deposit refund fails
      }
    }

    // Update booking with release information
    const updateData = {
      admin_released_at: new Date().toISOString(),
      stripe_transfer_id: transfer.id,
      status: 'funds_released',
      payout_amount: ownerPayout / 100, // Store in dollars
      platform_fee_amount: platformFee / 100, // Store in dollars
      updated_at: new Date().toISOString(),
    };

    if (depositRefund) {
      updateData.deposit_refund_id = depositRefund.id;
      updateData.deposit_refunded_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking with release info:', updateError);
      // Don't fail the request since Stripe transfer was already created
    }

    // Create notifications for owner and renter
    const notifications = [
      {
        user_id: booking.owner_id,
        type: 'funds_released',
        title: 'Payment Released',
        message: `Your payout of $${(ownerPayout / 100).toFixed(2)} has been released and will arrive in your account within 2-7 business days.`,
        data: {
          booking_id: bookingId,
          transfer_id: transfer.id,
          amount: ownerPayout / 100,
          currency: 'AUD',
          platform_fee: platformFee / 100,
        },
        created_at: new Date().toISOString(),
      },
    ];

    if (depositRefund) {
      notifications.push({
        user_id: booking.renter_id,
        type: 'deposit_refunded',
        title: 'Security Deposit Refunded',
        message: `Your security deposit of $${(depositAmount / 100).toFixed(2)} has been refunded and will appear in your account within 5-10 business days.`,
        data: {
          booking_id: bookingId,
          refund_id: depositRefund.id,
          amount: depositAmount / 100,
          currency: 'AUD',
        },
        created_at: new Date().toISOString(),
      });
    }

    // Insert notifications
    for (const notification of notifications) {
      try {
        await supabase.from('notifications').insert(notification);
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
      }
    }

    // Log the release action for audit purposes
    try {
      await supabase.from('admin_actions').insert({
        admin_user_id: adminUserId,
        action_type: 'release_funds',
        resource_type: 'booking',
        resource_id: bookingId,
        details: {
          transfer_id: transfer.id,
          owner_payout: ownerPayout / 100,
          platform_fee: platformFee / 100,
          deposit_refund_id: depositRefund?.id,
          release_type: releaseType,
        },
        created_at: new Date().toISOString(),
      });
    } catch (auditError) {
      console.error('Error logging admin action:', auditError);
    }

    return NextResponse.json({
      success: true,
      transfer: {
        id: transfer.id,
        amount: ownerPayout / 100,
        currency: 'AUD',
        destination: ownerStripeAccount,
        platform_fee: platformFee / 100,
      },
      deposit_refund: depositRefund ? {
        id: depositRefund.id,
        amount: depositAmount / 100,
        currency: 'AUD',
      } : null,
      booking_id: bookingId,
    });

  } catch (error) {
    console.error('Error releasing funds:', error);
    return NextResponse.json(
      { 
        error: 'Failed to release funds',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
