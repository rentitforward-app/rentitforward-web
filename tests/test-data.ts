/**
 * Test Data Factory for E2E Tests
 * 
 * Provides consistent test data for notification and other E2E tests
 */

export interface TestUser {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface TestListing {
  title: string;
  description: string;
  price: string;
  location: string;
  category?: string;
}

export interface TestBooking {
  startDate: string;
  endDate: string;
  message: string;
  includeInsurance: boolean;
}

export interface TestMessage {
  content: string;
  timestamp?: Date;
}

export class TestDataFactory {
  private static instance: TestDataFactory;
  private timestamp: number;

  private constructor() {
    this.timestamp = Date.now();
  }

  static getInstance(): TestDataFactory {
    if (!TestDataFactory.instance) {
      TestDataFactory.instance = new TestDataFactory();
    }
    return TestDataFactory.instance;
  }

  /**
   * Generate unique test users with timestamped emails
   */
  createTestUsers(): { renter: TestUser; owner: TestUser; admin: TestUser } {
    return {
      renter: {
        name: 'Test Renter',
        email: `renter_${this.timestamp}@test.com`,
        password: 'SecurePassword123!',
        role: 'user'
      },
      owner: {
        name: 'Test Owner',
        email: `owner_${this.timestamp}@test.com`,
        password: 'SecurePassword123!',
        role: 'user'
      },
      admin: {
        name: 'Test Admin',
        email: `admin_${this.timestamp}@test.com`,
        password: 'AdminPassword123!',
        role: 'admin'
      }
    };
  }

  /**
   * Generate test listing data
   */
  createTestListing(): TestListing {
    return {
      title: 'Professional DSLR Camera - E2E Test',
      description: 'High-quality professional camera perfect for photography and videography. Includes lens kit and accessories.',
      price: '75',
      location: 'Sydney, NSW, Australia',
      category: 'Electronics'
    };
  }

  /**
   * Generate test booking data with future dates
   */
  createTestBooking(): TestBooking {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 7); // 1 week from now
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 3); // 3 days rental
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      message: 'I need this camera for a professional photography project. Will take great care of it!',
      includeInsurance: true
    };
  }

  /**
   * Generate test message data
   */
  createTestMessages(): TestMessage[] {
    return [
      {
        content: 'Hi! I\'m interested in renting your camera. Is it available for the dates I selected?'
      },
      {
        content: 'Yes, it\'s available! The camera is in excellent condition and includes all accessories.'
      },
      {
        content: 'Perfect! I\'ll proceed with the booking. When would be a good time for pickup?'
      },
      {
        content: 'Anytime after 2 PM works for me. I\'ll send you the exact address once booking is confirmed.'
      },
      {
        content: 'Great! Looking forward to using your camera. I\'ll take excellent care of it.'
      }
    ];
  }

  /**
   * Generate Stripe test card details
   */
  getTestCardDetails() {
    return {
      cardNumber: '4242424242424242', // Stripe test card that always succeeds
      expiry: '12/25',
      cvc: '123',
      name: 'Test Cardholder'
    };
  }

  /**
   * Generate test card details for different scenarios
   */
  getTestCardScenarios() {
    return {
      success: {
        cardNumber: '4242424242424242',
        expiry: '12/25',
        cvc: '123',
        name: 'Success Test'
      },
      decline: {
        cardNumber: '4000000000000002',
        expiry: '12/25',
        cvc: '123',
        name: 'Decline Test'
      },
      insufficientFunds: {
        cardNumber: '4000000000009995',
        expiry: '12/25',
        cvc: '123',
        name: 'Insufficient Funds'
      },
      expired: {
        cardNumber: '4000000000000069',
        expiry: '12/25',
        cvc: '123',
        name: 'Expired Card'
      }
    };
  }

  /**
   * Generate notification test data for different event types
   */
  getNotificationTestData() {
    return {
      booking_request: {
        title: '📋 New Booking Request',
        message: 'Test User wants to rent your Professional DSLR Camera',
        type: 'booking_request',
        priority: 8
      },
      booking_approved: {
        title: '✅ Booking Confirmed!',
        message: 'Your booking for Professional DSLR Camera has been approved',
        type: 'booking_approved',
        priority: 9
      },
      booking_rejected: {
        title: '❌ Booking Declined',
        message: 'Your request for Professional DSLR Camera was declined',
        type: 'booking_rejected',
        priority: 7
      },
      booking_cancelled: {
        title: '🚫 Booking Cancelled',
        message: 'Booking for Professional DSLR Camera has been cancelled',
        type: 'booking_cancelled',
        priority: 8
      },
      pickup_confirmed: {
        title: '📦 Pickup Confirmed',
        message: 'Professional DSLR Camera pickup has been confirmed',
        type: 'pickup_confirmed',
        priority: 7
      },
      return_confirmed: {
        title: '🔄 Return Confirmed',
        message: 'Professional DSLR Camera return has been confirmed',
        type: 'return_confirmed',
        priority: 7
      },
      payment_received: {
        title: '💳 Payment Received',
        message: 'Payment of $225.00 received for Professional DSLR Camera',
        type: 'payment_received',
        priority: 8
      },
      payment_released: {
        title: '💰 Payment Released!',
        message: 'Your payout of $202.50 has been processed',
        type: 'payment_released',
        priority: 9
      },
      new_message: {
        title: '💬 New Message',
        message: 'You have a new message about Professional DSLR Camera',
        type: 'new_message',
        priority: 6
      }
    };
  }

  /**
   * Generate admin test scenarios
   */
  getAdminTestScenarios() {
    return [
      {
        name: 'Email Notification Test',
        eventType: 'booking_approved',
        notificationType: 'email',
        expectedResult: 'Email sent successfully'
      },
      {
        name: 'Push Notification Test',
        eventType: 'booking_request',
        notificationType: 'fcm',
        expectedResult: 'Push notification sent'
      },
      {
        name: 'In-App Notification Test',
        eventType: 'new_message',
        notificationType: 'in_app',
        expectedResult: 'In-app notification created'
      },
      {
        name: 'All Notifications Test',
        eventType: 'payment_released',
        notificationType: 'all',
        expectedResult: 'All notifications sent successfully'
      }
    ];
  }

  /**
   * Generate environment validation test data
   */
  getEnvironmentTestData() {
    return {
      requiredServices: ['resend', 'fcm', 'supabase', 'stripe'],
      requiredEnvVars: {
        resend: ['RESEND_API_KEY'],
        fcm: [
          'FIREBASE_PROJECT_ID',
          'FIREBASE_PRIVATE_KEY', 
          'FIREBASE_CLIENT_EMAIL',
          'NEXT_PUBLIC_FIREBASE_API_KEY',
          'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
        ],
        supabase: [
          'NEXT_PUBLIC_SUPABASE_URL',
          'NEXT_PUBLIC_SUPABASE_ANON_KEY',
          'SUPABASE_SERVICE_ROLE_KEY'
        ],
        stripe: [
          'STRIPE_SECRET_KEY',
          'STRIPE_WEBHOOK_SECRET'
        ]
      }
    };
  }

  /**
   * Generate test selectors for consistent element targeting
   */
  getTestSelectors() {
    return {
      // Navigation
      notificationBell: '[data-testid="notification-bell"]',
      notificationBadge: '[data-testid="notification-badge"]',
      userMenu: '[data-testid="user-menu"]',
      logoutButton: '[data-testid="logout-button"]',
      
      // Forms
      nameInput: 'input[name="name"]',
      emailInput: 'input[name="email"]',
      passwordInput: 'input[name="password"]',
      termsCheckbox: 'input[type="checkbox"]',
      submitButton: 'button[type="submit"]',
      
      // Booking
      startDateInput: '[data-testid="start-date"]',
      endDateInput: '[data-testid="end-date"]',
      bookingMessage: '[data-testid="booking-message"]',
      includeInsurance: '[data-testid="include-insurance"]',
      bookingStatus: '[data-testid="booking-status"]',
      
      // Payment
      cardholderName: '[data-testid="cardholder-name"]',
      paymentSuccess: '[data-testid="payment-success"]',
      bookingConfirmation: '[data-testid="booking-confirmation"]',
      
      // Listings
      listingCard: '[data-testid="listing-card"]',
      listingTitle: '[data-testid="listing-title"]',
      
      // Admin
      eventTypeSelect: '[data-testid="event-type-select"]',
      notificationTypeSelect: '[data-testid="notification-type-select"]',
      testResult: '[data-testid="test-result"]',
      configStatus: '[data-testid="config-status"]',
      
      // Notifications
      emailBookingToggle: '[data-testid="email-booking-toggle"]',
      emailMessageToggle: '[data-testid="email-message-toggle"]',
      pushBookingToggle: '[data-testid="push-booking-toggle"]'
    };
  }

  /**
   * Reset timestamp for new test run
   */
  resetTimestamp(): void {
    this.timestamp = Date.now();
  }

  /**
   * Get current timestamp
   */
  getTimestamp(): number {
    return this.timestamp;
  }
}

// Export singleton instance
export const testData = TestDataFactory.getInstance();

