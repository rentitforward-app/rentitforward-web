import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { price, quantity, bookingId } = await request.json();

    if (!price || !quantity) {
      return NextResponse.json(
        { error: 'Price and quantity are required' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // For testing, create a mock Stripe payment link with return URLs
    // In production, this would use the real MCP Stripe tool with after_completion URLs
    const mockPaymentLink = {
      id: `plink_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url: `https://buy.stripe.com/test_${Math.random().toString(36).substr(2, 20)}?success_url=${encodeURIComponent(`${baseUrl}/payment/success?booking_id=${bookingId}`)}&cancel_url=${encodeURIComponent(`${baseUrl}/payment/cancel?booking_id=${bookingId}`)}`,
      active: true,
      billing_mode: 'one_time',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      metadata: {
        booking_id: bookingId,
      },
      price: price,
      quantity: quantity,
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${baseUrl}/payment/success?booking_id=${bookingId}`
        }
      }
    };

    console.log('Created mock Stripe payment link with return URLs:', mockPaymentLink);

    return NextResponse.json(mockPaymentLink);

  } catch (error) {
    console.error('Stripe payment link creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment link' },
      { status: 500 }
    );
  }
}