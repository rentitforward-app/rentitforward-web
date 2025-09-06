import { 
  calculatePaymentBreakdown, 
  validatePaymentBreakdown,
  getDepositRecommendation,
  calculatePointsForAction,
  formatCurrency,
  calculateStripeAmounts
} from '../payment-calculations';

describe('Payment Calculations', () => {
  describe('calculatePaymentBreakdown', () => {
    it('should calculate correct breakdown for basic rental', () => {
      const input = {
        basePricePerDay: 30,
        totalDays: 3,
        includeInsurance: false,
        securityDeposit: 0,
        pointsToRedeem: 0,
        isFirstRental: false
      };

      const breakdown = calculatePaymentBreakdown(input);

      // Base calculation: 30 * 3 = 90
      expect(breakdown.subtotal).toBe(90);
      
      // Renter service fee: 90 * 0.15 = 13.50
      expect(breakdown.renterServiceFeeAmount).toBe(13.5);
      
      // Owner commission: 90 * 0.20 = 18
      expect(breakdown.ownerCommissionAmount).toBe(18);
      
      // Owner net earnings: 90 - 18 = 72
      expect(breakdown.ownerNetEarnings).toBe(72);
      
      // Platform revenue: 13.50 + 18 = 31.50
      expect(breakdown.platformTotalRevenue).toBe(31.5);
      
      // Renter total: 90 + 13.50 = 103.50
      expect(breakdown.renterTotalAmount).toBe(103.5);
    });

    it('should calculate correct breakdown with insurance', () => {
      const input = {
        basePricePerDay: 50,
        totalDays: 2,
        includeInsurance: true,
        insuranceFeePerDay: 7,
        securityDeposit: 0,
        pointsToRedeem: 0,
        isFirstRental: false
      };

      const breakdown = calculatePaymentBreakdown(input);

      // Base: 50 * 2 = 100
      expect(breakdown.subtotal).toBe(100);
      
      // Insurance: 7 * 2 = 14
      expect(breakdown.insuranceFee).toBe(14);
      
      // Service fee: 100 * 0.15 = 15
      expect(breakdown.renterServiceFeeAmount).toBe(15);
      
      // Renter total: 100 + 15 + 14 = 129
      expect(breakdown.renterTotalAmount).toBe(129);
    });

    it('should calculate correct breakdown with delivery fee', () => {
      const input = {
        basePricePerDay: 40,
        totalDays: 1,
        includeInsurance: false,
        deliveryFee: 20,
        securityDeposit: 0,
        pointsToRedeem: 0,
        isFirstRental: false
      };

      const breakdown = calculatePaymentBreakdown(input);

      // Base: 40 * 1 = 40
      expect(breakdown.subtotal).toBe(40);
      
      // Service fee: 40 * 0.15 = 6
      expect(breakdown.renterServiceFeeAmount).toBe(6);
      
      // Delivery fee: 20
      expect(breakdown.deliveryFee).toBe(20);
      
      // Renter total: 40 + 6 + 20 = 66
      expect(breakdown.renterTotalAmount).toBe(66);
    });

    it('should calculate correct breakdown with security deposit', () => {
      const input = {
        basePricePerDay: 100,
        totalDays: 1,
        includeInsurance: false,
        securityDeposit: 200,
        pointsToRedeem: 0,
        isFirstRental: false
      };

      const breakdown = calculatePaymentBreakdown(input);

      // Base: 100 * 1 = 100
      expect(breakdown.subtotal).toBe(100);
      
      // Service fee: 100 * 0.15 = 15
      expect(breakdown.renterServiceFeeAmount).toBe(15);
      
      // Deposit: 200
      expect(breakdown.securityDeposit).toBe(200);
      
      // Renter total: 100 + 15 + 200 = 315
      expect(breakdown.renterTotalAmount).toBe(315);
    });

    it('should apply points credit correctly', () => {
      const input = {
        basePricePerDay: 30,
        totalDays: 2,
        includeInsurance: false,
        securityDeposit: 0,
        pointsToRedeem: 100, // 100 points = $10 credit
        isFirstRental: false
      };

      const breakdown = calculatePaymentBreakdown(input);

      // Base: 30 * 2 = 60
      expect(breakdown.subtotal).toBe(60);
      
      // Service fee: 60 * 0.15 = 9
      expect(breakdown.renterServiceFeeAmount).toBe(9);
      
      // Points credit: 100 points = $10
      expect(breakdown.pointsCreditApplied).toBe(10);
      
      // Renter total before credit: 60 + 9 = 69
      // After credit: 69 - 10 = 59
      expect(breakdown.renterTotalAmount).toBe(59);
    });

    it('should award points for first rental', () => {
      const input = {
        basePricePerDay: 25,
        totalDays: 1,
        includeInsurance: false,
        securityDeposit: 0,
        pointsToRedeem: 0,
        isFirstRental: true
      };

      const breakdown = calculatePaymentBreakdown(input);

      expect(breakdown.pointsEarned).toBe(100); // First rental bonus
    });
  });

  describe('validatePaymentBreakdown', () => {
    it('should validate correct breakdown', () => {
      const input = {
        basePricePerDay: 30,
        totalDays: 2,
        includeInsurance: false,
        securityDeposit: 0,
        pointsToRedeem: 0,
        isFirstRental: false
      };

      const breakdown = calculatePaymentBreakdown(input);
      const validation = validatePaymentBreakdown(breakdown);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('getDepositRecommendation', () => {
    it('should recommend no deposit for low-value items', () => {
      const recommendation = getDepositRecommendation(50);
      
      expect(recommendation.recommended).toBe(0);
      expect(recommendation.range.min).toBe(0);
      expect(recommendation.range.max).toBe(0);
      expect(recommendation.tip).toContain('Trust-based rental');
    });

    it('should recommend moderate deposit for mid-value items', () => {
      const recommendation = getDepositRecommendation(300);
      
      expect(recommendation.recommended).toBe(75);
      expect(recommendation.range.min).toBe(50);
      expect(recommendation.range.max).toBe(100);
    });

    it('should recommend higher deposit for high-value items', () => {
      const recommendation = getDepositRecommendation(1000);
      
      expect(recommendation.recommended).toBe(200);
      expect(recommendation.range.min).toBe(100);
      expect(recommendation.range.max).toBe(300);
    });
  });

  describe('calculatePointsForAction', () => {
    it('should return correct points for different actions', () => {
      expect(calculatePointsForAction('first_rental')).toBe(100);
      expect(calculatePointsForAction('referral_first')).toBe(100);
      expect(calculatePointsForAction('referral_additional')).toBe(25);
      expect(calculatePointsForAction('successful_review')).toBe(25);
      expect(calculatePointsForAction('milestone_10_rentals')).toBe(25);
      expect(calculatePointsForAction('maintain_5_star_rating')).toBe(50);
      expect(calculatePointsForAction('unknown_action')).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(29.99)).toBe('$29.99');
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(0.5)).toBe('$0.50');
    });
  });

  describe('calculateStripeAmounts', () => {
    it('should convert to cents correctly', () => {
      const breakdown = calculatePaymentBreakdown({
        basePricePerDay: 30,
        totalDays: 2,
        includeInsurance: true,
        insuranceFeePerDay: 7,
        deliveryFee: 20,
        securityDeposit: 50,
        pointsToRedeem: 0,
        isFirstRental: false
      });

      const stripeAmounts = calculateStripeAmounts(breakdown);

      // Verify amounts are in cents
      expect(stripeAmounts.totalAmountCents).toBe(Math.round(breakdown.renterTotalAmount * 100));
      expect(stripeAmounts.platformFeeCents).toBe(Math.round(breakdown.renterServiceFeeAmount * 100));
      expect(stripeAmounts.ownerAmountCents).toBe(Math.round(breakdown.ownerNetEarnings * 100));
      expect(stripeAmounts.depositCents).toBe(Math.round(breakdown.securityDeposit * 100));
      expect(stripeAmounts.insuranceCents).toBe(Math.round(breakdown.insuranceFee * 100));
    });
  });
});
