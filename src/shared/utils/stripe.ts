// src/utils/stripe.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export const createConnectedAccount = async (email: string) => {
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      transfers: { requested: true },
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

export const createPaymentIntent = async ({
  amount,
  currency = 'aud',
  applicationFeeAmount,
  connectedAccountId,
}: {
  amount: number;
  currency?: string;
  applicationFeeAmount: number;
  connectedAccountId: string;
}) => {
  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency,
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: connectedAccountId,
      },
    },
    {
      stripeAccount: connectedAccountId,
    }
  );

  return intent.client_secret;
};

export const refundDeposit = async (paymentIntentId: string, amount: number) => {
  return await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount,
  });
};
