import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings:listing_id (
          title,
          owner_id
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking status to payment_pending
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'payment_pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Booking update error:', updateError);
    }

    // Create Stripe price for this booking amount
    const amountInCents = Math.round(booking.total_amount * 100);
    const productId = 'prod_SoPPzmDCab9Olw'; // Rental Booking product

    console.log(`Creating Stripe price for booking ${bookingId}: $${booking.total_amount} (${amountInCents} cents)`);

    // Create dynamic price using Stripe MCP
    let stripePrice;
    try {
      const createPriceResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/stripe/mcp/create-price`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product: productId,
          unit_amount: amountInCents,
          currency: 'usd'
        }),
      });

      if (!createPriceResponse.ok) {
        throw new Error(`Failed to create price: ${createPriceResponse.statusText}`);
      }

      stripePrice = await createPriceResponse.json();
      console.log('Created Stripe price:', stripePrice.id);
    } catch (error) {
      console.error('Price creation failed:', error);
      return NextResponse.json(
        { error: 'Failed to create payment price' },
        { status: 500 }
      );
    }

    // Create payment link using Stripe MCP
    let paymentLink;
    try {
      const createLinkResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/stripe/mcp/create-payment-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price: stripePrice.id,
          quantity: 1,
          bookingId: booking.id
        }),
      });

      if (!createLinkResponse.ok) {
        throw new Error(`Failed to create payment link: ${createLinkResponse.statusText}`);
      }

      paymentLink = await createLinkResponse.json();
      console.log('Created payment link:', paymentLink.url);
    } catch (error) {
      console.error('Payment link creation failed:', error);
      return NextResponse.json(
        { error: 'Failed to create payment link' },
        { status: 500 }
      );
    }

    // Store the Stripe price and payment link in the booking
    await supabase
      .from('bookings')
      .update({ 
        stripe_payment_intent_id: stripePrice.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    return NextResponse.json({
      success: true,
      paymentUrl: paymentLink.url,
      bookingId: booking.id,
      amount: booking.total_amount,
      priceId: stripePrice.id
    });

  } catch (error) {
    console.error('Payment checkout creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}