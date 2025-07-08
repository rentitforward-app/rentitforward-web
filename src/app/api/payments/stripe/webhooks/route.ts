import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { constructWebhookEvent } from '@/lib/stripe-utils';
import Stripe from 'stripe';

// POST - Handle Stripe webhook events
export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  try {
    // Construct the webhook event
    const event = constructWebhookEvent(body, signature);
    
    console.log(`[Webhook] Received event: ${event.type}`);

    // Handle the event based on type
    switch (event.type) {
      // ==================== ACCOUNT VERIFICATION EVENTS ====================
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      // ==================== PAYMENT EVENTS ====================
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.requires_action':
        await handlePaymentRequiresAction(event.data.object as Stripe.PaymentIntent);
        break;

      // ==================== TRANSFER EVENTS ====================
      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      case 'transfer.paid':
        await handleTransferPaid(event.data.object as Stripe.Transfer);
        break;

      // ==================== REFUND EVENTS ====================
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      // ==================== PAYOUT EVENTS ====================
      case 'payout.created':
        await handlePayoutCreated(event.data.object as Stripe.Payout);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      // ==================== CAPABILITY EVENTS ====================
      case 'capability.updated':
        await handleCapabilityUpdated(event.data.object as Stripe.Capability);
        break;

      // ==================== CUSTOMER EVENTS ====================
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return NextResponse.json({ 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
}

// ==================== EVENT HANDLERS ====================

async function handleAccountUpdated(account: Stripe.Account) {
  const supabase = await createClient();
  
  try {
    console.log(`[Webhook] Processing account.updated for ${account.id}`);

    // Find the user profile with this Stripe account ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, stripe_account_id, verification_status')
      .eq('stripe_account_id', account.id)
      .single();

    if (profileError || !profile) {
      console.log(`[Webhook] No profile found for Stripe account ${account.id}`);
      return;
    }

    // Determine verification status
    const isVerified = account.details_submitted && account.charges_enabled && account.payouts_enabled;
    const hasPendingRequirements = (account.requirements?.currently_due?.length || 0) > 0 || 
                                   (account.requirements?.past_due?.length || 0) > 0;
    
    let newVerificationStatus = 'unverified';
    let identityStatus = 'unverified';
    let documentStatus = 'not_uploaded';

    if (isVerified) {
      newVerificationStatus = 'verified';
      identityStatus = 'verified';
      documentStatus = 'verified';
    } else if (account.details_submitted && hasPendingRequirements) {
      newVerificationStatus = 'pending';
      identityStatus = account.individual?.verification?.status || 'pending';
      documentStatus = account.individual?.verification?.document?.front ? 'pending' : 'not_uploaded';
    } else if (account.requirements?.disabled_reason) {
      newVerificationStatus = 'rejected';
    }

    // Update the profile
    const updates = {
      stripe_onboarding_complete: isVerified,
      is_verified: isVerified,
      verification_status: newVerificationStatus,
      identity_verification_status: identityStatus,
      document_verification_status: documentStatus,
      verification_requirements: account.requirements?.currently_due || [],
    };

    if (isVerified && !profile.verification_completed_at) {
      updates.verification_completed_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates as any)
      .eq('id', profile.id);

    if (updateError) {
      console.error('[Webhook] Error updating profile:', updateError);
      return;
    }

    // Log the verification action
    await supabase
      .from('verification_audit_log')
      .insert({
        user_id: profile.id,
        action: 'stripe_account_updated',
        details: {
          account_id: account.id,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          requirements: account.requirements,
          verification_status: newVerificationStatus,
        },
      } as any);

    console.log(`[Webhook] Updated verification status for user ${profile.id} to ${newVerificationStatus}`);

  } catch (error) {
    console.error('[Webhook] Error handling account.updated:', error);
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const supabase = await createClient();
  
  try {
    console.log(`[Webhook] Processing payment_intent.succeeded for ${paymentIntent.id}`);

    // Find associated booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, renter_id, owner_id, listing_id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (bookingError || !booking) {
      console.log(`[Webhook] No booking found for payment intent ${paymentIntent.id}`);
      return;
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        paid_at: new Date().toISOString(),
      } as any)
      .eq('id', booking.id);

    if (updateError) {
      console.error('[Webhook] Error updating booking status:', updateError);
      return;
    }

    // TODO: Send confirmation emails to both renter and owner
    // TODO: Create notification records

    console.log(`[Webhook] Booking ${booking.id} confirmed after successful payment`);

  } catch (error) {
    console.error('[Webhook] Error handling payment_intent.succeeded:', error);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const supabase = await createClient();
  
  try {
    console.log(`[Webhook] Processing payment_intent.payment_failed for ${paymentIntent.id}`);

    // Find associated booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (bookingError || !booking) {
      console.log(`[Webhook] No booking found for payment intent ${paymentIntent.id}`);
      return;
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'payment_failed',
        payment_failed_at: new Date().toISOString(),
      } as any)
      .eq('id', booking.id);

    if (updateError) {
      console.error('[Webhook] Error updating booking status:', updateError);
      return;
    }

    console.log(`[Webhook] Booking ${booking.id} marked as payment failed`);

  } catch (error) {
    console.error('[Webhook] Error handling payment_intent.payment_failed:', error);
  }
}

async function handlePaymentRequiresAction(paymentIntent: Stripe.PaymentIntent) {
  const supabase = await createClient();
  
  try {
    console.log(`[Webhook] Processing payment_intent.requires_action for ${paymentIntent.id}`);

    // Find associated booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (bookingError || !booking) {
      console.log(`[Webhook] No booking found for payment intent ${paymentIntent.id}`);
      return;
    }

    // Update booking status to indicate action required
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'requires_action',
      } as any)
      .eq('id', booking.id);

    if (updateError) {
      console.error('[Webhook] Error updating booking status:', updateError);
      return;
    }

    console.log(`[Webhook] Booking ${booking.id} requires additional authentication`);

  } catch (error) {
    console.error('[Webhook] Error handling payment_intent.requires_action:', error);
  }
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  const supabase = await createClient();
  
  try {
    console.log(`[Webhook] Processing transfer.created for ${transfer.id}`);

    if (transfer.metadata?.type === 'rental_payment_release') {
      const paymentIntentId = transfer.metadata.original_payment_intent;
      
      if (paymentIntentId) {
        // Update booking with transfer information
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ 
            stripe_transfer_id: transfer.id,
            escrow_released_at: new Date().toISOString(),
          } as any)
          .eq('stripe_payment_intent_id', paymentIntentId);

        if (updateError) {
          console.error('[Webhook] Error updating booking with transfer:', updateError);
        } else {
          console.log(`[Webhook] Updated booking with transfer ${transfer.id}`);
        }
      }
    }

  } catch (error) {
    console.error('[Webhook] Error handling transfer.created:', error);
  }
}

async function handleTransferPaid(transfer: Stripe.Transfer) {
  const supabase = await createClient();
  
  try {
    console.log(`[Webhook] Processing transfer.paid for ${transfer.id}`);

    // Update booking to indicate transfer completed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        payout_completed_at: new Date().toISOString(),
        status: 'completed',
      } as any)
      .eq('stripe_transfer_id', transfer.id);

    if (updateError) {
      console.error('[Webhook] Error updating booking payout status:', updateError);
    } else {
      console.log(`[Webhook] Transfer ${transfer.id} completed successfully`);
    }

  } catch (error) {
    console.error('[Webhook] Error handling transfer.paid:', error);
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const supabase = await createClient();
  
  try {
    console.log(`[Webhook] Processing charge.refunded for ${charge.id}`);

    if (charge.payment_intent) {
      // Find associated booking
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('id')
        .eq('stripe_payment_intent_id', charge.payment_intent)
        .single();

      if (booking && !bookingError) {
        // Log refund information
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ 
            refunded_at: new Date().toISOString(),
            refund_amount: charge.amount_refunded,
          } as any)
          .eq('id', booking.id);

        if (updateError) {
          console.error('[Webhook] Error updating booking refund:', updateError);
        } else {
          console.log(`[Webhook] Recorded refund for booking ${booking.id}`);
        }
      }
    }

  } catch (error) {
    console.error('[Webhook] Error handling charge.refunded:', error);
  }
}

async function handlePayoutCreated(payout: Stripe.Payout) {
  console.log(`[Webhook] Payout created: ${payout.id} for ${payout.amount} ${payout.currency}`);
  // Could log payout creation for accounting/reporting purposes
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  console.log(`[Webhook] Payout paid: ${payout.id} for ${payout.amount} ${payout.currency}`);
  // Could update internal accounting records
}

async function handlePayoutFailed(payout: Stripe.Payout) {
  console.log(`[Webhook] Payout failed: ${payout.id} - ${payout.failure_message}`);
  // Could alert the user about payout failure
}

async function handleCapabilityUpdated(capability: Stripe.Capability) {
  console.log(`[Webhook] Capability updated: ${capability.id} - ${capability.status}`);
  // The account.updated event will handle the main verification status updates
}

async function handleCustomerUpdated(customer: Stripe.Customer) {
  const supabase = await createClient();
  
  try {
    console.log(`[Webhook] Processing customer.updated for ${customer.id}`);

    // Find the user profile with this Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customer.id)
      .single();

    if (profileError || !profile) {
      console.log(`[Webhook] No profile found for Stripe customer ${customer.id}`);
      return;
    }

    // Update customer information if needed
    const updates: any = {};
    
    if (customer.name && customer.name !== profile.full_name) {
      updates.full_name = customer.name;
    }

    if (customer.phone && customer.phone !== profile.phone) {
      updates.phone = customer.phone;
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (updateError) {
        console.error('[Webhook] Error updating customer profile:', updateError);
      } else {
        console.log(`[Webhook] Updated customer profile for user ${profile.id}`);
      }
    }

  } catch (error) {
    console.error('[Webhook] Error handling customer.updated:', error);
  }
} 