import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
// TODO: Replace with shared package import when monorepo is properly configured
const PLATFORM_RATES = {
  SERVICE_FEE_PERCENT: 0.15, // 15% added to renter total
  COMMISSION_PERCENT: 0.20,  // 20% deducted from owner payout
  INSURANCE_PERCENT: 0.10,   // 10% of daily rate per day
  POINTS_TO_CREDIT_RATE: 0.10, // 100 points = $10 AUD
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const { bookingId, userId } = await request.json();

    if (!bookingId || !userId) {
      return NextResponse.json(
        { error: 'Booking ID and User ID are required' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabase = await createClient();

    // Fetch booking details with both owner and renter profiles
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        listings!listing_id (
          id,
          title,
          images,
          price_per_day,
          category,
          location,
          state
        ),
        owner_profile:profiles!owner_id (
          id,
          full_name,
          email,
          stripe_account_id
        ),
        renter_profile:profiles!renter_id (
          id,
          full_name,
          email,
          phone_number,
          address,
          city,
          state,
          postal_code
        )
      `)
      .eq('id', bookingId)
      .eq('renter_id', userId)
      .eq('status', 'payment_required')
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found or not eligible for payment' },
        { status: 404 }
      );
    }

    const ownerStripeAccount = booking.owner_profile?.stripe_account_id;
    // Use shared platform commission rate for consistency
    const platformFee = Math.round(booking.subtotal * PLATFORM_RATES.COMMISSION_PERCENT * 100); // Convert to cents
    const totalAmount = booking.total_amount * 100; // Convert to cents

    // Construct base URL from request or environment
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
      `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`;

    // Debug logging for URL construction
    console.log('🔗 Payment Session URL Construction:');
    console.log('- NEXT_PUBLIC_BASE_URL:', process.env.NEXT_PUBLIC_BASE_URL);
    console.log('- Request protocol:', request.headers.get('x-forwarded-proto'));
    console.log('- Request host:', request.headers.get('host'));
    console.log('- Final baseUrl:', baseUrl);
    console.log('- Success URL will be:', `${baseUrl}/bookings/${bookingId}/payment/success?session_id={CHECKOUT_SESSION_ID}`);

    // Determine payment intent data based on whether owner has connected account
    const paymentIntentData: any = {
      metadata: {
        bookingId,
        userId,
        ownerId: booking.owner_id,
        platformFee: platformFee.toString(),
        hasConnectedAccount: ownerStripeAccount ? 'true' : 'false',
      },
    };

    // Only add application fee and transfer data if owner has connected account
    if (ownerStripeAccount) {
      paymentIntentData.application_fee_amount = platformFee;
      paymentIntentData.transfer_data = {
        destination: ownerStripeAccount,
      };
    }

    // Prepare customer information for auto-filling
    const renterProfile = booking.renter_profile;
    
    // Create or find customer with proper information
    let customerId;
    try {
      // First try to find existing customer by email
      const customers = await stripe.customers.list({
        email: renterProfile?.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        
        // Update customer with latest profile information if needed
        const updateData: any = {};
        if (renterProfile?.full_name) {
          updateData.name = renterProfile.full_name;
        }
        if (renterProfile?.phone_number) {
          updateData.phone = renterProfile.phone_number;
        }
        if (renterProfile?.address && renterProfile?.state && renterProfile?.postal_code) {
          updateData.address = {
            line1: renterProfile.address,
            state: renterProfile.state,
            postal_code: renterProfile.postal_code,
            country: 'AU',
          };
        }
        
        if (Object.keys(updateData).length > 0) {
          await stripe.customers.update(customerId, updateData);
        }
      } else {
        // Create new customer with profile information
        const customerData: any = {
          email: renterProfile?.email,
          metadata: {
            supabase_user_id: userId,
            booking_id: bookingId,
          },
        };

        if (renterProfile?.full_name) {
          customerData.name = renterProfile.full_name;
        }
        if (renterProfile?.phone_number) {
          customerData.phone = renterProfile.phone_number;
        }
        if (renterProfile?.address && renterProfile?.state && renterProfile?.postal_code) {
          customerData.address = {
            line1: renterProfile.address,
            state: renterProfile.state,
            postal_code: renterProfile.postal_code,
            country: 'AU',
          };
        }

        const customer = await stripe.customers.create(customerData);
        customerId = customer.id;
      }
    } catch (customerError) {
      console.warn('Error managing customer:', customerError);
      // Continue without customer ID - Stripe will create one
      customerId = undefined;
    }

    // Try to create Stripe Checkout session with Connect transfer first
    let session;
    try {
      const sessionConfig: any = {
        mode: 'payment',
        payment_method_types: ['card'],
        payment_intent_data: paymentIntentData,
        line_items: [
          {
            price_data: {
              currency: 'aud',
              product_data: {
                name: `Rental: ${booking.listings.title}`,
                description: `${booking.start_date} to ${booking.end_date}`,
                images: booking.listings.images?.length > 0 ? [booking.listings.images[0]] : [],
                metadata: {
                  bookingId,
                  category: booking.listings.category,
                  location: `${booking.listings.location || 'Location not specified'}`,
                },
              },
              unit_amount: booking.subtotal * 100, // Subtotal in cents
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'aud',
              product_data: {
                name: 'Service Fee',
                description: 'Platform service fee (15%)',
              },
              unit_amount: booking.service_fee * 100, // Service fee in cents
            },
            quantity: 1,
          },
          // Add insurance fee if selected
          ...(booking.insurance_fee > 0 ? [{
            price_data: {
              currency: 'aud',
              product_data: {
                name: 'Damage Protection',
                description: 'Optional damage protection coverage (10%)',
              },
              unit_amount: booking.insurance_fee * 100, // Insurance fee in cents
            },
            quantity: 1,
          }] : []),
          // Add delivery fee if delivery method selected
          ...(booking.delivery_fee > 0 ? [{
            price_data: {
              currency: 'aud',
              product_data: {
                name: 'Delivery Fee',
                description: 'Delivery service fee',
              },
              unit_amount: booking.delivery_fee * 100, // Delivery fee in cents
            },
            quantity: 1,
          }] : []),
          // Add security deposit if applicable
          ...(booking.deposit_amount > 0 ? [{
            price_data: {
              currency: 'aud',
              product_data: {
                name: 'Security Deposit',
                description: 'Refundable security deposit (held until return)',
              },
              unit_amount: booking.deposit_amount * 100, // Deposit in cents
            },
            quantity: 1,
          }] : []),
        ],
        metadata: {
          bookingId,
          userId,
          ownerId: booking.owner_id,
          type: 'booking_payment',
        },
        success_url: `${baseUrl}/bookings/${bookingId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/bookings/${bookingId}/payment?cancelled=true`,
        automatic_tax: { enabled: false },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        shipping_address_collection: {
          allowed_countries: ['AU'],
        },
        expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      };

      // Use customer ID if we have one, otherwise use email
      if (customerId) {
        sessionConfig.customer = customerId;
        sessionConfig.customer_update = {
          address: 'auto',
          name: 'auto',
          shipping: 'auto',
        };
      } else {
        sessionConfig.customer_email = renterProfile?.email;
        sessionConfig.customer_creation = 'if_required';
      }

      session = await stripe.checkout.sessions.create(sessionConfig);
    } catch (stripeError: any) {
      // If Connect transfer fails due to account capabilities, create a regular payment
      if (stripeError.code === 'insufficient_capabilities_for_transfer' && ownerStripeAccount) {
        console.log('Owner account lacks transfer capabilities, creating regular payment session');
        
        // Create payment session without Connect transfer (manual payout later)
        const fallbackPaymentData = {
          metadata: {
            bookingId,
            userId,
            ownerId: booking.owner_id,
            platformFee: platformFee.toString(),
            hasConnectedAccount: 'false', // Mark as false to handle manually
            requiresManualPayout: 'true',
          },
        };

        const fallbackSessionConfig: any = {
          mode: 'payment',
          payment_method_types: ['card'],
          payment_intent_data: fallbackPaymentData,
          line_items: [
            {
              price_data: {
                currency: 'aud',
                product_data: {
                  name: `Rental: ${booking.listings.title}`,
                  description: `${booking.start_date} to ${booking.end_date}`,
                  images: booking.listings.images?.length > 0 ? [booking.listings.images[0]] : [],
                  metadata: {
                    bookingId,
                    category: booking.listings.category,
                    location: `${booking.listings.location || 'Location not specified'}`,
                  },
                },
                unit_amount: booking.subtotal * 100,
              },
              quantity: 1,
            },
            {
              price_data: {
                currency: 'aud',
                product_data: {
                  name: 'Service Fee',
                  description: 'Platform service fee (15%)',
                },
                unit_amount: booking.service_fee * 100,
              },
              quantity: 1,
            },
            // Add insurance fee if selected
            ...(booking.insurance_fee > 0 ? [{
              price_data: {
                currency: 'aud',
                product_data: {
                  name: 'Damage Protection',
                  description: 'Optional damage protection coverage (10%)',
                },
                unit_amount: booking.insurance_fee * 100,
              },
              quantity: 1,
            }] : []),
            // Add delivery fee if delivery method selected
            ...(booking.delivery_fee > 0 ? [{
              price_data: {
                currency: 'aud',
                product_data: {
                  name: 'Delivery Fee',
                  description: 'Delivery service fee',
                },
                unit_amount: booking.delivery_fee * 100,
              },
              quantity: 1,
            }] : []),
            // Add security deposit if applicable
            ...(booking.deposit_amount > 0 ? [{
              price_data: {
                currency: 'aud',
                product_data: {
                  name: 'Security Deposit',
                  description: 'Refundable security deposit (held until return)',
                },
                unit_amount: booking.deposit_amount * 100,
              },
              quantity: 1,
            }] : []),
          ],
          metadata: {
            bookingId,
            userId,
            ownerId: booking.owner_id,
            type: 'booking_payment',
            requiresManualPayout: 'true',
          },
          success_url: `${baseUrl}/bookings/${bookingId}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/bookings/${bookingId}/payment?cancelled=true`,
          automatic_tax: { enabled: false },
          allow_promotion_codes: true,
          billing_address_collection: 'required',
          shipping_address_collection: {
            allowed_countries: ['AU'],
          },
          expires_at: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        };

        // Use customer ID if we have one, otherwise use email
        if (customerId) {
          fallbackSessionConfig.customer = customerId;
          fallbackSessionConfig.customer_update = {
            address: 'auto',
            name: 'auto',
            shipping: 'auto',
          };
        } else {
          fallbackSessionConfig.customer_email = renterProfile?.email;
          fallbackSessionConfig.customer_creation = 'if_required';
        }

        session = await stripe.checkout.sessions.create(fallbackSessionConfig);
      } else {
        // Re-throw other Stripe errors
        throw stripeError;
      }
    }

    // Update booking with Stripe session ID
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        stripe_session_id: session.id,
        payment_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Error updating booking with session ID:', updateError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ url: session.url });

  } catch (error) {
    console.error('Error creating payment session:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}