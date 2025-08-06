import { NextRequest, NextResponse } from 'next/server';

// Note: This will use the MCP Stripe tools available in the environment
declare global {
  var mcp_stripe_web_create_price: (params: {
    product: string;
    unit_amount: number;
    currency: string;
  }) => Promise<{ id: string; [key: string]: any }>;
}

export async function POST(request: NextRequest) {
  try {
    const { amount, bookingId, listingTitle } = await request.json();

    if (!amount || !bookingId) {
      return NextResponse.json(
        { error: 'Amount and booking ID are required' },
        { status: 400 }
      );
    }

    // Use the existing Rental Booking product
    const productId = 'prod_SoPPzmDCab9Olw'; // From our Stripe product list

    // Create price using Stripe MCP tools
    const response = await fetch('/api/mcp/stripe/create-price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product: productId,
        unit_amount: amount,
        currency: 'usd'
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create Stripe price');
    }

    const price = await response.json();

    return NextResponse.json({
      success: true,
      priceId: price.id,
      amount: amount,
      currency: 'usd'
    });

  } catch (error) {
    console.error('Stripe price creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create price' },
      { status: 500 }
    );
  }
}