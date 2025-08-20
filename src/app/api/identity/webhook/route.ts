import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

const endpointSecret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = headers();
  const sig = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'identity.verification_session.verified': {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
        
        console.log('Identity verification verified:', verificationSession.id);
        
        // Update verification status in database
        const { error: updateError } = await supabase
          .from('identity_verifications')
          .update({
            status: 'verified',
            verified_outputs: verificationSession.verified_outputs,
            last_error: null,
            verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_verification_session_id', verificationSession.id);

        if (updateError) {
          console.error('Error updating verification status:', updateError);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        // Update user profile verification status
        const userId = verificationSession.metadata?.user_id;
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              identity_verified: true,
              identity_verified_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }

        break;
      }

      case 'identity.verification_session.requires_input': {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
        
        console.log('Identity verification requires input:', verificationSession.id);
        
        // Update verification status in database
        const { error: updateError } = await supabase
          .from('identity_verifications')
          .update({
            status: 'requires_input',
            last_error: verificationSession.last_error,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_verification_session_id', verificationSession.id);

        if (updateError) {
          console.error('Error updating verification status:', updateError);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        // Update user profile verification status
        const userId = verificationSession.metadata?.user_id;
        if (userId) {
          await supabase
            .from('profiles')
            .update({
              identity_verified: false,
            })
            .eq('id', userId);
        }

        break;
      }

      case 'identity.verification_session.processing': {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
        
        console.log('Identity verification processing:', verificationSession.id);
        
        // Update verification status in database
        const { error: updateError } = await supabase
          .from('identity_verifications')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_verification_session_id', verificationSession.id);

        if (updateError) {
          console.error('Error updating verification status:', updateError);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        break;
      }

      case 'identity.verification_session.canceled': {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
        
        console.log('Identity verification canceled:', verificationSession.id);
        
        // Update verification status in database
        const { error: updateError } = await supabase
          .from('identity_verifications')
          .update({
            status: 'canceled',
            last_error: verificationSession.last_error,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_verification_session_id', verificationSession.id);

        if (updateError) {
          console.error('Error updating verification status:', updateError);
          return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
        }

        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}



