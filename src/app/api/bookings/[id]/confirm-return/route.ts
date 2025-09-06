import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();

  try {
    const { id } = await params;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking details to verify permissions and status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if user is involved in this booking (renter or owner)
    if (booking.renter_id !== user.id && booking.owner_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if booking is in correct status for return
    if (booking.status !== 'active' && booking.status !== 'picked_up') {
      return NextResponse.json({ 
        error: 'Booking must be active to confirm return' 
      }, { status: 400 });
    }

    // Check if it's after the pickup date
    const today = new Date();
    const startDate = new Date(booking.start_date);
    const isAfterPickupDate = today >= startDate;

    if (!isAfterPickupDate) {
      return NextResponse.json({ 
        error: 'Return can only be confirmed after pickup date' 
      }, { status: 400 });
    }

    // Update booking status to 'completed'
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'completed',
        return_confirmed_at: new Date().toISOString(),
        return_confirmed_by: user.id
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating booking status:', updateError);
      return NextResponse.json({ 
        error: 'Failed to confirm return' 
      }, { status: 500 });
    }

    // TODO: Here we could trigger additional logic like:
    // - Release security deposit
    // - Process final payments to owner
    // - Send completion notifications
    // - Award points to both parties

    return NextResponse.json({ 
      success: true, 
      message: 'Return confirmed successfully' 
    });

  } catch (error) {
    console.error('Error confirming return:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
