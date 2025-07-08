// Temporary local Stripe utilities to fix build issues
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export const createConnectedAccount = async (email: string, country: string = 'AU') => {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    country,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
    business_profile: {
      product_description: 'Peer-to-peer rental marketplace',
    },
    metadata: {
      platform: 'rent-it-forward',
    },
  });
  return account.id;
};

export const createAccountLink = async (accountId: string, refreshUrl: string, returnUrl: string) => {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
  return link.url;
};

export const getAccountStatus = async (accountId: string) => {
  const account = await stripe.accounts.retrieve(accountId);
  return {
    id: account.id,
    charges_enabled: account.charges_enabled,
    payouts_enabled: account.payouts_enabled,
    details_submitted: account.details_submitted,
    currently_due: account.requirements?.currently_due || [],
    eventually_due: account.requirements?.eventually_due || [],
    past_due: account.requirements?.past_due || [],
    pending_verification: account.requirements?.pending_verification || [],
    disabled_reason: account.requirements?.disabled_reason,
    business_type: account.business_type,
    country: account.country,
  };
};

export const createLoginLink = async (accountId: string) => {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
};

export const createCustomer = async ({
  email,
  name,
  phone,
  metadata = {},
}: {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}) => {
  const customer = await stripe.customers.create({
    email,
    name,
    phone,
    metadata: {
      platform: 'rent-it-forward',
      ...metadata,
    },
  });
  return customer.id;
};

export const getVerificationStatus = async (accountId: string) => {
  const account = await stripe.accounts.retrieve(accountId);
  
  return {
    overall_status: account.charges_enabled && account.payouts_enabled ? 'verified' : 'pending',
    identity_verification: {
      status: account.individual?.verification?.status || 'unverified',
      details: account.individual?.verification?.details,
    },
    document_verification: {
      front_uploaded: !!account.individual?.verification?.document?.front,
      back_uploaded: !!account.individual?.verification?.document?.back,
      status: account.individual?.verification?.document?.back 
        ? 'verified' 
        : account.individual?.verification?.document?.front 
          ? 'pending' 
          : 'unverified',
    },
    requirements: {
      currently_due: account.requirements?.currently_due || [],
      eventually_due: account.requirements?.eventually_due || [],
      past_due: account.requirements?.past_due || [],
      pending_verification: account.requirements?.pending_verification || [],
    },
    capabilities: {
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
    },
    disabled_reason: account.requirements?.disabled_reason,
  };
};

export const uploadVerificationDocument = async (
  accountId: string,
  documentType: 'identity_document' | 'address_document',
  frontImageData: string,
  backImageData?: string
) => {
  // Create file from base64 data
  const frontBuffer = Buffer.from(frontImageData.split(',')[1], 'base64');
  
  const frontFile = await stripe.files.create({
    purpose: 'identity_document',
    file: {
      data: frontBuffer,
      name: 'front.jpg',
      type: 'image/jpeg',
    },
  });

  let backFile;
  if (backImageData) {
    const backBuffer = Buffer.from(backImageData.split(',')[1], 'base64');
    backFile = await stripe.files.create({
      purpose: 'identity_document',
      file: {
        data: backBuffer,
        name: 'back.jpg',
        type: 'image/jpeg',
      },
    });
  }

  return {
    front_file_id: frontFile.id,
    back_file_id: backFile?.id,
  };
};

export const createPaymentIntent = async ({
  amount,
  currency = 'aud',
  applicationFeeAmount,
  connectedAccountId,
  customerId,
  metadata = {},
  description,
}: {
  amount: number;
  currency?: string;
  applicationFeeAmount: number;
  connectedAccountId: string;
  customerId?: string;
  metadata?: Record<string, string>;
  description?: string;
}) => {
  const intent = await stripe.paymentIntents.create({
    amount,
    currency,
    application_fee_amount: applicationFeeAmount,
    customer: customerId,
    description,
    metadata: {
      platform: 'rent-it-forward',
      ...metadata,
    },
    transfer_data: {
      destination: connectedAccountId,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    client_secret: intent.client_secret,
    payment_intent_id: intent.id,
  };
};

export const createEscrowPayment = async ({
  amount,
  depositAmount,
  currency = 'aud',
  applicationFeeAmount,
  connectedAccountId,
  customerId,
  bookingId,
  listingTitle,
}: {
  amount: number;
  depositAmount: number;
  currency?: string;
  applicationFeeAmount: number;
  connectedAccountId: string;
  customerId: string;
  bookingId: string;
  listingTitle: string;
}) => {
  const totalAmount = amount + depositAmount;
  
  const intent = await stripe.paymentIntents.create({
    amount: totalAmount,
    currency,
    application_fee_amount: applicationFeeAmount,
    customer: customerId,
    description: `Rental payment for "${listingTitle}"`,
    metadata: {
      platform: 'rent-it-forward',
      booking_id: bookingId,
      rental_amount: amount.toString(),
      deposit_amount: depositAmount.toString(),
    },
    transfer_data: {
      destination: connectedAccountId,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    client_secret: intent.client_secret,
    payment_intent_id: intent.id,
  };
};

export const getPaymentIntent = async (paymentIntentId: string) => {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

export const confirmPaymentIntent = async (paymentIntentId: string) => {
  return await stripe.paymentIntents.confirm(paymentIntentId);
};

export const releaseEscrowPayment = async (paymentIntentId: string, amountToRelease: number) => {
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  
  const transfer = await stripe.transfers.create({
    amount: amountToRelease,
    currency: intent.currency,
    destination: typeof intent.transfer_data?.destination === 'string' 
      ? intent.transfer_data.destination 
      : intent.transfer_data?.destination?.id || '',
    description: `Rental payment release for ${intent.description}`,
    metadata: {
      payment_intent_id: paymentIntentId,
      release_type: 'escrow_release',
    },
  });

  return transfer.id;
};

export const refundDeposit = async (paymentIntentId: string, depositAmount: number, reason?: string) => {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: depositAmount,
    reason: reason as any,
    metadata: {
      refund_type: 'deposit_refund',
    },
  });

  return refund.id;
};

export const constructWebhookEvent = (payload: string | Buffer, signature: string) => {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET as string
  );
};

export const calculatePlatformFee = (amount: number, feePercentage: number = 5) => {
  return Math.round((amount * feePercentage) / 100);
};

export const formatAmountForStripe = (amount: number) => {
  return Math.round(amount * 100);
}; 