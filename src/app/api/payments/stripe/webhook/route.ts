import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.log(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    // Handle the event
    switch (event.type) {
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account, supabase);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent, supabase);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer, supabase);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout, supabase);
        break;

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object as any, supabase);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleAccountUpdated(account: Stripe.Account, supabase: any) {
  try {
    const isComplete = account.details_submitted && 
                      account.charges_enabled && 
                      account.payouts_enabled;

    // Update user profile with new status
    const { error } = await supabase
      .from('profiles')
      .update({ 
        stripe_onboarding_complete: isComplete 
      } as any)
      .eq('stripe_account_id', account.id);

    if (error) {
      console.error('Error updating account status:', error);
    }

    console.log(`Account ${account.id} updated: complete=${isComplete}`);
  } catch (error) {
    console.error('Error handling account update:', error);
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    const bookingId = paymentIntent.metadata.booking_id;
    
    if (!bookingId) {
      console.error('No booking_id found in payment intent metadata');
      return;
    }

    // Update booking status to confirmed
    const { error: bookingError } = await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        payment_status: 'paid'
      } as any)
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (bookingError) {
      console.error('Error updating booking after payment:', bookingError);
      return;
    }

    // If this is a Connect payment, create a transfer to the owner
    if (paymentIntent.application_fee_amount && paymentIntent.metadata.owner_id) {
      // Get owner's Stripe account
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', paymentIntent.metadata.owner_id)
        .single();

      if (ownerProfile?.stripe_account_id) {
        // Calculate transfer amount (total - app fee)
        const transferAmount = paymentIntent.amount - (paymentIntent.application_fee_amount || 0);
        
        const transfer = await stripe.transfers.create({
          amount: transferAmount,
          currency: paymentIntent.currency,
          destination: ownerProfile.stripe_account_id,
          metadata: {
            booking_id: bookingId,
            payment_intent_id: paymentIntent.id,
          },
        });

        // Update booking with transfer ID
        await supabase
          .from('bookings')
          .update({ stripe_transfer_id: transfer.id } as any)
          .eq('id', bookingId);
      }
    }

    console.log(`Payment succeeded for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling payment success:', error);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent, supabase: any) {
  try {
    const bookingId = paymentIntent.metadata.booking_id;
    
    if (!bookingId) {
      console.error('No booking_id found in payment intent metadata');
      return;
    }

    // Update booking status to cancelled due to payment failure
    const { error } = await supabase
      .from('bookings')
      .update({ 
        status: 'cancelled',
        payment_status: 'failed'
      } as any)
      .eq('stripe_payment_intent_id', paymentIntent.id);

    if (error) {
      console.error('Error updating booking after payment failure:', error);
    }

    console.log(`Payment failed for booking ${bookingId}`);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer, supabase: any) {
  try {
    const bookingId = transfer.metadata.booking_id;
    
    if (bookingId) {
      // Update booking with transfer information
      await supabase
        .from('bookings')
        .update({ 
          payment_status: 'transferred_to_owner',
          stripe_transfer_id: transfer.id
        } as any)
        .eq('id', bookingId);
    }

    console.log(`Transfer created: ${transfer.id}`);
  } catch (error) {
    console.error('Error handling transfer creation:', error);
  }
}

async function handlePayoutPaid(payout: Stripe.Payout, supabase: any) {
  try {
    // Log payout for record keeping
    console.log(`Payout paid: ${payout.id} for ${payout.amount} ${payout.currency}`);
    
    // You could update user records here to track successful payouts
    // For now, we'll just log it
  } catch (error) {
    console.error('Error handling payout:', error);
  }
}

async function handleAccountDeauthorized(deauth: any, supabase: any) {
  try {
    // Handle when a user disconnects their Stripe account
    const accountId = deauth.account;
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        stripe_account_id: null,
        stripe_onboarding_complete: false
      } as any)
      .eq('stripe_account_id', accountId);

    if (error) {
      console.error('Error handling account deauthorization:', error);
    }

    console.log(`Account deauthorized: ${accountId}`);
  } catch (error) {
    console.error('Error handling account deauthorization:', error);
  }
} 