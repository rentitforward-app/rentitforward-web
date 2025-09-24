import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        owner_id,
        total_amount,
        deposit_amount,
        owner_commission_rate,
        has_issues,
        status
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Call the Supabase function
    const response = await fetch('https://ulcrjgjbsromujglyxbu.supabase.co/functions/v1/process-booking-completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        bookingId: booking.id,
        ownerId: booking.owner_id,
        totalAmount: parseFloat(booking.total_amount),
        depositAmount: parseFloat(booking.deposit_amount || '0'),
        platformCommissionRate: booking.owner_commission_rate || 0.20,
        hasIssues: booking.has_issues || false,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json(result);
    } else {
      const error = await response.text();
      return NextResponse.json(
        { error: 'Failed to process booking completion', details: error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error processing booking completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
