# Stripe Connect + PaymentIntents Migration Plan

## Overview
This document outlines the complete migration from Stripe Checkout to Stripe Connect + PaymentIntents for both web and mobile platforms, incorporating the pricing structure from PRICING_AND_INCENTIVES.md.

## Current vs Target Architecture

### Current (Checkout + WebView)
- Stripe Checkout sessions
- WebView redirects in mobile
- Manual admin payment releases
- Basic pricing structure

### Target (Connect + PaymentIntents)
- Native payment flows
- In-app payment experience
- Automated escrow with admin control
- Full pricing and incentives system

## 1. Pricing Structure Integration

### Base Pricing Components
```typescript
interface PricingBreakdown {
  basePrice: number;           // Owner sets this
  serviceFee: number;          // 15% of base price (renter pays)
  platformCommission: number;  // 20% of base price (owner pays)
  insuranceFee?: number;       // Optional $7/day
  depositAmount?: number;      // Optional security deposit
  deliveryFee?: number;        // Optional delivery
  totalAmount: number;         // Final amount renter pays
  ownerPayout: number;         // Amount owner receives
  platformRevenue: number;     // Total platform earnings
}

// Pricing calculation utility
export function calculateRentalPricing(
  basePrice: number,
  duration: number,
  options: {
    insurance?: boolean;
    deposit?: number;
    delivery?: boolean;
  }
): PricingBreakdown {
  const subtotal = basePrice * duration;
  const serviceFee = Math.round(subtotal * 0.15 * 100) / 100; // 15%
  const platformCommission = Math.round(subtotal * 0.20 * 100) / 100; // 20%
  
  const insuranceFee = options.insurance ? 7 * duration : 0;
  const depositAmount = options.deposit || 0;
  const deliveryFee = options.delivery ? 10 : 0; // $10 delivery fee
  
  const totalAmount = subtotal + serviceFee + insuranceFee + depositAmount + deliveryFee;
  const ownerPayout = subtotal - platformCommission;
  const platformRevenue = serviceFee + platformCommission;
  
  return {
    basePrice: subtotal,
    serviceFee,
    platformCommission,
    insuranceFee,
    depositAmount,
    deliveryFee,
    totalAmount,
    ownerPayout,
    platformRevenue
  };
}
```

### User Incentives System
```typescript
interface UserIncentives {
  points: number;
  credits: number; // 100 points = $10 AUD
  referralCode: string;
  totalEarned: number;
  totalRedeemed: number;
}

// Points calculation
export function calculatePointsEarned(action: string): number {
  const pointsMap = {
    'first_rental': 100,
    'referral': 100,
    'additional_referral': 25,
    'review': 25,
    'ten_rentals': 25,
    'five_star_rating': 50
  };
  return pointsMap[action] || 0;
}

// Credit application
export function applyCredits(totalAmount: number, availableCredits: number): {
  finalAmount: number;
  creditsUsed: number;
} {
  const creditsUsed = Math.min(availableCredits, totalAmount);
  return {
    finalAmount: totalAmount - creditsUsed,
    creditsUsed
  };
}
```

## 2. Stripe Connect Setup

### Owner Onboarding (No Stripe Signup Required)
```typescript
// Web: Owner bank account collection
export async function createStripeConnectAccount(ownerData: {
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: Address;
  bankAccount: BankAccount;
}) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'AU',
    email: ownerData.email,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: 'individual',
    individual: {
      first_name: ownerData.firstName,
      last_name: ownerData.lastName,
      dob: {
        day: parseInt(ownerData.dateOfBirth.split('/')[0]),
        month: parseInt(ownerData.dateOfBirth.split('/')[1]),
        year: parseInt(ownerData.dateOfBirth.split('/')[2]),
      },
      address: {
        line1: ownerData.address.line1,
        city: ownerData.address.city,
        state: ownerData.address.state,
        postal_code: ownerData.address.postalCode,
        country: 'AU',
      },
    },
  });

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile/stripe/refresh`,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/profile/stripe/success`,
    type: 'account_onboarding',
  });

  return { accountId: account.id, onboardingUrl: accountLink.url };
}
```

### Mobile: Bank Account Collection
```typescript
// Mobile: In-app bank account form
interface BankAccountForm {
  accountName: string;
  accountNumber: string;
  bsb: string;
  bankName: string;
}

const BankAccountSetup = () => {
  const [formData, setFormData] = useState<BankAccountForm>({
    accountName: '',
    accountNumber: '',
    bsb: '',
    bankName: ''
  });

  const handleSubmit = async () => {
    // Create Stripe Connect account
    const { accountId, onboardingUrl } = await createStripeConnectAccount({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      bankAccount: formData
    });

    // Store account ID
    await updateUserProfile({ stripe_account_id: accountId });
    
    // Complete onboarding
    router.push(onboardingUrl);
  };

  return (
    <View className="p-4">
      <Text className="text-lg font-semibold mb-4">Add Bank Account</Text>
      
      <TextInput
        placeholder="Account Name"
        value={formData.accountName}
        onChangeText={(text) => setFormData({...formData, accountName: text})}
        className="border border-gray-300 rounded-lg p-3 mb-4"
      />
      
      <TextInput
        placeholder="Account Number"
        value={formData.accountNumber}
        onChangeText={(text) => setFormData({...formData, accountNumber: text})}
        className="border border-gray-300 rounded-lg p-3 mb-4"
        keyboardType="numeric"
      />
      
      <TextInput
        placeholder="BSB"
        value={formData.bsb}
        onChangeText={(text) => setFormData({...formData, bsb: text})}
        className="border border-gray-300 rounded-lg p-3 mb-4"
        keyboardType="numeric"
      />
      
      <TouchableOpacity
        onPress={handleSubmit}
        className="bg-green-600 py-3 rounded-lg"
      >
        <Text className="text-white font-semibold text-center">
          Add Bank Account
        </Text>
      </TouchableOpacity>
    </View>
  );
};
```

## 3. Payment Flow Implementation

### Web: PaymentIntents with Connect
```typescript
// Web API: Create PaymentIntent
export async function createRentalPaymentIntent(
  bookingId: string,
  pricing: PricingBreakdown,
  ownerStripeAccountId: string
) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(pricing.totalAmount * 100), // Convert to cents
    currency: 'aud',
    application_fee_amount: Math.round(pricing.platformRevenue * 100),
    transfer_data: {
      destination: ownerStripeAccountId,
    },
    metadata: {
      bookingId,
      type: 'rental_payment',
      status: 'held_for_release',
      basePrice: pricing.basePrice.toString(),
      serviceFee: pricing.serviceFee.toString(),
      platformCommission: pricing.platformCommission.toString(),
      insuranceFee: pricing.insuranceFee?.toString() || '0',
      depositAmount: pricing.depositAmount?.toString() || '0',
    },
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return paymentIntent;
}

// Web: Payment confirmation
export async function confirmRentalPayment(
  paymentIntentId: string,
  bookingId: string
) {
  // Update booking status
  await supabase
    .from('bookings')
    .update({
      payment_status: 'paid_awaiting_release',
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq('id', bookingId);

  // Award points for first rental
  const { data: user } = await supabase.auth.getUser();
  if (user) {
    await awardPoints(user.id, 'first_rental');
  }
}
```

### Mobile: Native Payment Sheet
```typescript
// Mobile: Payment flow
import { useStripe } from '@stripe/stripe-react-native';

const RentalPaymentScreen = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      // Create PaymentIntent
      const { client_secret } = await createRentalPaymentIntent(
        booking.id,
        pricing,
        listing.owner.stripe_account_id
      );

      // Present payment sheet
      const { error } = await presentPaymentSheet({
        paymentIntentClientSecret: client_secret,
        merchantDisplayName: 'Rent It Forward',
        applePay: {
          merchantCountryCode: 'AU',
        },
        googlePay: {
          merchantCountryCode: 'AU',
          testEnv: __DEV__,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // Payment successful
      await confirmRentalPayment(paymentIntentId, booking.id);
      router.push('/booking/success');
      
    } catch (error) {
      console.error('Payment failed:', error);
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="p-4">
      <Text className="text-2xl font-bold mb-4">Payment Summary</Text>
      
      <View className="bg-gray-50 p-4 rounded-lg mb-4">
        <View className="flex-row justify-between mb-2">
          <Text>Base Price ({duration} days)</Text>
          <Text>${pricing?.basePrice.toFixed(2)}</Text>
        </View>
        
        <View className="flex-row justify-between mb-2">
          <Text>Service Fee (15%)</Text>
          <Text>${pricing?.serviceFee.toFixed(2)}</Text>
        </View>
        
        {pricing?.insuranceFee && pricing.insuranceFee > 0 && (
          <View className="flex-row justify-between mb-2">
            <Text>Insurance</Text>
            <Text>${pricing.insuranceFee.toFixed(2)}</Text>
          </View>
        )}
        
        {pricing?.depositAmount && pricing.depositAmount > 0 && (
          <View className="flex-row justify-between mb-2">
            <Text>Security Deposit</Text>
            <Text>${pricing.depositAmount.toFixed(2)}</Text>
          </View>
        )}
        
        <View className="border-t border-gray-300 pt-2 mt-2">
          <View className="flex-row justify-between">
            <Text className="font-semibold">Total</Text>
            <Text className="font-semibold">${pricing?.totalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        onPress={handlePayment}
        disabled={loading}
        className={`py-4 px-6 rounded-lg ${
          loading ? 'bg-gray-400' : 'bg-green-600'
        }`}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white font-semibold text-center">
            Pay ${pricing?.totalAmount.toFixed(2)}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
```

## 4. Admin Payment Release System

### Enhanced Admin Dashboard
```typescript
// Admin: Payment release management
interface PaymentReleaseData {
  bookingId: string;
  ownerName: string;
  listingTitle: string;
  totalAmount: number;
  ownerPayout: number;
  platformRevenue: number;
  paymentStatus: 'paid_awaiting_release' | 'released' | 'failed';
  createdAt: string;
  completedAt?: string;
}

const PaymentReleaseDashboard = () => {
  const [payments, setPayments] = useState<PaymentReleaseData[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);

  const handleReleasePayment = async (paymentId: string) => {
    try {
      // Release funds to owner
      const transfer = await stripe.transfers.create({
        amount: Math.round(payment.ownerPayout * 100),
        currency: 'aud',
        destination: payment.ownerStripeAccountId,
        metadata: {
          bookingId: payment.bookingId,
          type: 'rental_payment_release',
        },
      });

      // Update database
      await supabase
        .from('bookings')
        .update({
          payment_status: 'released',
          stripe_transfer_id: transfer.id,
          admin_released_at: new Date().toISOString(),
        })
        .eq('id', payment.bookingId);

      // Send notification to owner
      await sendPayoutNotification(payment.ownerEmail, payment.ownerPayout);
      
    } catch (error) {
      console.error('Payment release failed:', error);
    }
  };

  const handleBulkRelease = async () => {
    for (const paymentId of selectedPayments) {
      await handleReleasePayment(paymentId);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Payment Releases</h1>
      
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Pending Releases</h2>
            <Button
              onClick={handleBulkRelease}
              disabled={selectedPayments.length === 0}
            >
              Release Selected ({selectedPayments.length})
            </Button>
          </div>
        </div>
        
        <div className="divide-y">
          {payments.map((payment) => (
            <div key={payment.bookingId} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{payment.listingTitle}</h3>
                  <p className="text-gray-600">{payment.ownerName}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold">${payment.ownerPayout.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">
                    Platform: ${payment.platformRevenue.toFixed(2)}
                  </p>
                </div>
                
                <Button
                  onClick={() => handleReleasePayment(payment.bookingId)}
                  size="sm"
                >
                  Release
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

## 5. User Incentives Implementation

### Points System
```typescript
// Points management
export async function awardPoints(userId: string, action: string) {
  const points = calculatePointsEarned(action);
  
  if (points > 0) {
    await supabase
      .from('user_points')
      .insert({
        user_id: userId,
        action,
        points,
        created_at: new Date().toISOString(),
      });
    
    // Update user's total points
    await supabase.rpc('update_user_points', {
      user_id: userId,
      points_to_add: points
    });
  }
}

// Credit application at checkout
export async function applyUserCredits(
  userId: string,
  totalAmount: number
): Promise<{ finalAmount: number; creditsUsed: number }> {
  const { data: user } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();
  
  const availableCredits = Math.floor((user?.points || 0) / 100) * 10; // 100 points = $10
  const creditsUsed = Math.min(availableCredits, totalAmount);
  
  return {
    finalAmount: totalAmount - creditsUsed,
    creditsUsed
  };
}
```

### Referral System
```typescript
// Referral tracking
export async function processReferral(referralCode: string, newUserId: string) {
  // Find referrer
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id, referral_code')
    .eq('referral_code', referralCode)
    .single();
  
  if (referrer) {
    // Award points to referrer
    await awardPoints(referrer.id, 'referral');
    
    // Track referral
    await supabase
      .from('referrals')
      .insert({
        referrer_id: referrer.id,
        referred_id: newUserId,
        created_at: new Date().toISOString(),
      });
  }
}
```

## 6. Migration Timeline

### Phase 1: Backend Setup (Week 1-2)
- [ ] Implement pricing calculation utilities
- [ ] Set up Stripe Connect account creation
- [ ] Create PaymentIntent API endpoints
- [ ] Update database schema for new fields

### Phase 2: Web Implementation (Week 3-4)
- [ ] Replace Checkout with PaymentIntents
- [ ] Implement bank account collection
- [ ] Update admin dashboard for payment releases
- [ ] Add user incentives system

### Phase 3: Mobile Implementation (Week 5-6)
- [ ] Install Stripe React Native SDK
- [ ] Implement native payment sheet
- [ ] Add bank account collection flow
- [ ] Update booking flow with new pricing

### Phase 4: Testing & Launch (Week 7-8)
- [ ] End-to-end testing
- [ ] Admin training on new system
- [ ] Gradual rollout to users
- [ ] Monitor and optimize

## 7. Database Schema Updates

```sql
-- Add new fields to bookings table
ALTER TABLE bookings ADD COLUMN stripe_payment_intent_id TEXT;
ALTER TABLE bookings ADD COLUMN stripe_transfer_id TEXT;
ALTER TABLE bookings ADD COLUMN admin_released_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN pricing_breakdown JSONB;

-- Add user points table
CREATE TABLE user_points (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add referrals table
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES profiles(id),
  referred_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add referral code to profiles
ALTER TABLE profiles ADD COLUMN referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN points INTEGER DEFAULT 0;
```

## 8. Environment Variables

```env
# Stripe Connect
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Mobile Stripe
STRIPE_PUBLISHABLE_KEY_MOBILE=pk_live_...

# Platform settings
PLATFORM_SERVICE_FEE_RATE=0.15
PLATFORM_COMMISSION_RATE=0.20
INSURANCE_FEE_PER_DAY=7
DELIVERY_FEE=10
```

This comprehensive plan provides a complete migration path to Stripe Connect + PaymentIntents while incorporating your pricing and incentives system. The implementation maintains admin control while providing a much better user experience.

