import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { 
  createPaymentIntent,
  createEscrowPayment,
  getPaymentIntent,
  confirmPaymentIntent,
  releaseEscrowPayment,
  refundDeposit,
  formatAmountForStripe,
  calculatePlatformFee
} from '@/lib/stripe-utils';

// POST - Create payment intent for bookings
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...paymentData } = await request.json();

    // Get user profile to check for customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id as any)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profileData = profile as any;

    if (!profileData.stripe_customer_id) {
      return NextResponse.json({ 
        error: 'Customer account required. Please create a customer account first.' 
      }, { status: 400 });
    }

    if (action === 'create_booking_payment') {
      const { 
        booking_id, 
        listing_id, 
        amount, 
        deposit_amount = 0, 
        currency = 'aud' 
      } = paymentData;

      if (!booking_id || !listing_id || !amount) {
        return NextResponse.json({ 
          error: 'Booking ID, listing ID, and amount are required' 
        }, { status: 400 });
      }

      // Get listing and owner details
      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .select(`
          id, title, owner_id, daily_rate,
          profiles!listings_owner_id_fkey(stripe_account_id, full_name)
        `)
        .eq('id', listing_id)
        .single();

      if (listingError || !listing) {
        return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
      }

      const listingData = listing as any;
      const ownerProfile = listingData.profiles;

      if (!ownerProfile?.stripe_account_id) {
        return NextResponse.json({ 
          error: 'Owner has not set up their payment account' 
        }, { status: 400 });
      }

      // Calculate fees
      const amountInCents = formatAmountForStripe(amount);
      const depositInCents = formatAmountForStripe(deposit_amount);
      const platformFee = calculatePlatformFee(amountInCents);

      try {
        const paymentResult = await createEscrowPayment({
          amount: amountInCents,
          depositAmount: depositInCents,
          currency,
          applicationFeeAmount: platformFee,
          connectedAccountId: ownerProfile.stripe_account_id,
          customerId: profileData.stripe_customer_id,
          bookingId: booking_id,
          listingTitle: listingData.title,
        });

        // Update booking with payment intent
        await supabase
          .from('bookings')
          .update({ 
            stripe_payment_intent_id: paymentResult.payment_intent_id,
            status: 'pending_payment'
          } as any)
          .eq('id', booking_id);

        return NextResponse.json({
          client_secret: paymentResult.client_secret,
          payment_intent_id: paymentResult.payment_intent_id,
          amount: amountInCents + depositInCents,
          platform_fee: platformFee,
          breakdown: {
            rental_amount: amountInCents,
            deposit_amount: depositInCents,
            platform_fee: platformFee,
            total_amount: amountInCents + depositInCents,
          }
        });
      } catch (error) {
        console.error('Payment intent creation error:', error);
        return NextResponse.json({ 
          error: 'Failed to create payment intent' 
        }, { status: 500 });
      }
    }

    if (action === 'create_simple_payment') {
      const { amount, currency = 'aud', description, metadata = {} } = paymentData;

      if (!amount) {
        return NextResponse.json({ error: 'Amount is required' }, { status: 400 });
      }

      const amountInCents = formatAmountForStripe(amount);

      try {
        const paymentResult = await createPaymentIntent({
          amount: amountInCents,
          currency,
          customerId: profileData.stripe_customer_id,
          description,
          metadata: {
            user_id: user.id,
            ...metadata,
          },
          // For simple payments, no connected account
          connectedAccountId: '', // This will need to be handled differently
          applicationFeeAmount: 0,
        });

        return NextResponse.json({
          client_secret: paymentResult.client_secret,
          payment_intent_id: paymentResult.payment_intent_id,
          amount: amountInCents,
        });
      } catch (error) {
        console.error('Simple payment intent creation error:', error);
        return NextResponse.json({ 
          error: 'Failed to create payment intent' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Payment intent API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - Retrieve payment intent status
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const paymentIntentId = url.searchParams.get('payment_intent_id');

    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID is required' }, { status: 400 });
    }

    try {
      const paymentIntent = await getPaymentIntent(paymentIntentId);

      return NextResponse.json({
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
        created: paymentIntent.created,
        last_payment_error: paymentIntent.last_payment_error,
      });
    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      return NextResponse.json({ 
        error: 'Failed to retrieve payment intent' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Payment intent retrieval API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update payment intent or handle escrow actions
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, payment_intent_id, ...actionData } = await request.json();

    if (!payment_intent_id) {
      return NextResponse.json({ error: 'Payment intent ID is required' }, { status: 400 });
    }

    // Verify user has permission to modify this payment
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, renter_id, owner_id, status, stripe_payment_intent_id')
      .eq('stripe_payment_intent_id', payment_intent_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Associated booking not found' }, { status: 404 });
    }

    const bookingData = booking as any;

    // Check if user has permission (either renter or owner)
    if (bookingData.renter_id !== user.id && bookingData.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to payment' }, { status: 403 });
    }

    if (action === 'confirm_payment') {
      try {
        const confirmedIntent = await confirmPaymentIntent(payment_intent_id);
        
        // Update booking status
        await supabase
          .from('bookings')
          .update({ status: 'confirmed' } as any)
          .eq('id', bookingData.id);

        return NextResponse.json({
          status: confirmedIntent.status,
          confirmed: true,
        });
      } catch (error) {
        console.error('Payment confirmation error:', error);
        return NextResponse.json({ 
          error: 'Failed to confirm payment' 
        }, { status: 500 });
      }
    }

    if (action === 'release_escrow') {
      // Only owner can initiate escrow release after rental completion
      if (bookingData.owner_id !== user.id) {
        return NextResponse.json({ 
          error: 'Only the item owner can release escrow funds' 
        }, { status: 403 });
      }

      const { amount_to_release } = actionData;

      if (!amount_to_release) {
        return NextResponse.json({ error: 'Amount to release is required' }, { status: 400 });
      }

      try {
        const transferId = await releaseEscrowPayment(
          payment_intent_id, 
          formatAmountForStripe(amount_to_release)
        );

        // Update booking with transfer info
        await supabase
          .from('bookings')
          .update({ 
            stripe_transfer_id: transferId,
            status: 'completed'
          } as any)
          .eq('id', bookingData.id);

        return NextResponse.json({
          transfer_id: transferId,
          amount_released: formatAmountForStripe(amount_to_release),
          escrow_released: true,
        });
      } catch (error) {
        console.error('Escrow release error:', error);
        return NextResponse.json({ 
          error: 'Failed to release escrow payment' 
        }, { status: 500 });
      }
    }

    if (action === 'refund_deposit') {
      // Only owner can refund deposit
      if (bookingData.owner_id !== user.id) {
        return NextResponse.json({ 
          error: 'Only the item owner can refund deposits' 
        }, { status: 403 });
      }

      const { deposit_amount, reason } = actionData;

      if (!deposit_amount) {
        return NextResponse.json({ error: 'Deposit amount is required' }, { status: 400 });
      }

      try {
        const refundId = await refundDeposit(
          payment_intent_id, 
          formatAmountForStripe(deposit_amount),
          reason
        );

        return NextResponse.json({
          refund_id: refundId,
          amount_refunded: formatAmountForStripe(deposit_amount),
          deposit_refunded: true,
        });
      } catch (error) {
        console.error('Deposit refund error:', error);
        return NextResponse.json({ 
          error: 'Failed to refund deposit' 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Payment intent update API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 