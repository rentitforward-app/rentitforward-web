import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { product, unit_amount, currency } = await request.json();

    if (!product || !unit_amount || !currency) {
      return NextResponse.json(
        { error: 'Product, unit_amount, and currency are required' },
        { status: 400 }
      );
    }

    // This would normally call the MCP Stripe tool directly
    // For testing, we'll create a mock response that matches Stripe's structure
    const mockPrice = {
      id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      object: 'price',
      active: true,
      billing_scheme: 'per_unit',
      created: Math.floor(Date.now() / 1000),
      currency: currency,
      livemode: false,
      product: product,
      type: 'one_time',
      unit_amount: unit_amount,
      unit_amount_decimal: unit_amount.toString(),
    };

    console.log('Created mock Stripe price:', mockPrice);

    return NextResponse.json(mockPrice);

  } catch (error) {
    console.error('Stripe price creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create price' },
      { status: 500 }
    );
  }
}