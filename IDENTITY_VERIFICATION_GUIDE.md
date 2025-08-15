# Identity Verification System Documentation

## Overview

The Rent It Forward platform now includes a comprehensive identity verification system powered by Stripe Identity. This system ensures trust and security by requiring users to verify their identity before renting items.

## Features

- **Stripe Identity Integration**: Uses Stripe's robust identity verification service
- **Document Verification**: Supports government-issued IDs (passport, driver's license, national ID)
- **Live Selfie Matching**: Ensures the person matches the ID document
- **Real-time Status Updates**: Webhook-based status updates
- **Settings Page Integration**: Easy access to verification from user settings
- **Booking Protection**: Prevents unverified users from renting items
- **Mobile-Friendly**: Works across all devices and platforms

## System Architecture

### API Routes

#### 1. Verification Session Management (`/api/identity/verification-session`)

**POST** - Creates a new verification session
- Creates Stripe Identity verification session
- Stores session info in database
- Returns client secret for frontend

**GET** - Retrieves current verification status
- Fetches latest status from Stripe
- Updates local database with current status
- Returns verification details

#### 2. Webhook Handler (`/api/identity/webhook`)

Handles Stripe Identity webhook events:
- `identity.verification_session.verified`
- `identity.verification_session.requires_input`
- `identity.verification_session.processing`
- `identity.verification_session.canceled`

### Database Schema

#### `identity_verifications` Table

```sql
CREATE TABLE identity_verifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_verification_session_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'requires_input',
  verified_outputs JSONB,
  last_error JSONB,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

#### `profiles` Table Updates

Added columns:
- `identity_verified` (boolean, default false)
- `identity_verified_at` (timestamp, nullable)

### React Components

#### 1. `IdentityVerification`

Main verification component for settings page:
- Displays verification status
- Shows required documents
- Handles verification flow
- Real-time status updates

```tsx
<IdentityVerification onVerificationComplete={() => {
  // Handle completion
}} />
```

#### 2. `IdentityVerificationGate`

Protection component for sensitive actions:
- Wraps components requiring verification
- Shows modal if verification required
- Prevents action if not verified

```tsx
<IdentityVerificationGate action="rent">
  <BookingButton />
</IdentityVerificationGate>
```

#### 3. `VerificationDashboard`

Enhanced dashboard including identity verification alongside payment verification.

## Integration Points

### 1. Settings Page

The identity verification component is integrated into the main settings page under the "Payments & Verification" section.

### 2. Booking Flow

All booking attempts are protected by the verification gate. Users must complete identity verification before they can rent items.

### 3. API Validation

The booking creation API validates identity verification status server-side and returns a 403 error with specific messaging if verification is missing.

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Identity Webhook Secret
STRIPE_IDENTITY_WEBHOOK_SECRET=whsec_your_stripe_identity_webhook_secret

# Required for redirect URLs
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Stripe Configuration

### 1. Enable Stripe Identity

1. Go to your Stripe Dashboard
2. Navigate to "Identity" section
3. Enable Identity verification
4. Configure allowed document types
5. Set up webhook endpoints

### 2. Webhook Configuration

Set up a webhook endpoint at: `https://yourdomain.com/api/identity/webhook`

Required events:
- `identity.verification_session.verified`
- `identity.verification_session.requires_input`
- `identity.verification_session.processing`
- `identity.verification_session.canceled`

### 3. Document Types

Configure these document types in Stripe:
- Passport
- Driver's License
- National ID Card

Options enabled:
- `require_id_number: true`
- `require_live_capture: true`
- `require_matching_selfie: true`

## User Experience Flow

### 1. First-Time User

1. User attempts to rent an item
2. Verification gate shows modal explaining requirement
3. User clicks "Start Verification" → redirected to settings
4. Identity verification component loads
5. User clicks "Start Verification" → Stripe Identity modal opens
6. User completes document upload and selfie
7. Verification processes (usually 1-5 minutes)
8. User receives confirmation and can now rent items

### 2. Returning User

- Verified users: No interruption, normal booking flow
- Unverified users: Shown verification requirement modal
- Users with failed verification: Prompted to retry

### 3. Verification States

- **Not Started**: No verification attempt yet
- **Processing**: Documents uploaded, under review
- **Verified**: Successfully verified ✅
- **Requires Input**: Failed verification, needs retry
- **Canceled**: User canceled the process

## Error Handling

### Client-Side Errors

- Network failures: Retry mechanism
- Stripe errors: User-friendly messages
- Missing data: Clear guidance

### Server-Side Errors

- Database errors: Logged and graceful fallback
- Stripe API errors: Proper error responses
- Webhook failures: Retry mechanism built-in

### Common Error Scenarios

1. **Document Quality Issues**
   - Blurry photos
   - Poor lighting
   - Partial document visibility

2. **Selfie Matching Issues**
   - Different person
   - Poor selfie quality
   - Lighting conditions

3. **Document Type Issues**
   - Expired documents
   - Unsupported document types
   - Foreign documents (depending on config)

## Testing

### Test Mode

Stripe Identity provides test modes with predefined outcomes:

```javascript
// Test verification that will succeed
const testSuccessVerification = await stripe.identity.verificationSessions.create({
  type: 'document',
  metadata: { test_result: 'success' }
});

// Test verification that will fail
const testFailVerification = await stripe.identity.verificationSessions.create({
  type: 'document',
  metadata: { test_result: 'fail' }
});
```

### Test Documents

Use Stripe's test document images for consistent testing across different scenarios.

## Security Considerations

### Data Protection

- All sensitive data handled by Stripe
- Local database stores only verification status
- No document images stored locally
- GDPR compliant through Stripe

### Access Control

- RLS policies prevent cross-user access
- Server-side validation on all endpoints
- Webhook signature verification
- Rate limiting on verification attempts

### Privacy

- Minimal data retention
- Clear privacy policy updates
- User consent before verification
- Right to data deletion

## Monitoring and Analytics

### Key Metrics

1. **Verification Completion Rate**
   - Track start vs. completion
   - Identify drop-off points

2. **Verification Success Rate**
   - Monitor pass/fail rates
   - Document quality issues

3. **Time to Verification**
   - Average processing time
   - User experience impact

4. **Error Rates**
   - API failures
   - Webhook delivery issues
   - User experience problems

### Logging

- All verification attempts logged
- Webhook events tracked
- Error conditions monitored
- User journey analytics

## Maintenance

### Regular Tasks

1. **Monitor Verification Queue**
   - Check for stuck verifications
   - Handle manual review cases

2. **Review Error Logs**
   - Identify common issues
   - Improve error messaging

3. **Update Documentation**
   - Keep user guides current
   - Update troubleshooting guides

### Performance Optimization

1. **Database Indexing**
   - User ID lookups
   - Status filtering
   - Date range queries

2. **Caching Strategy**
   - Verification status caching
   - Rate limit user checks

3. **Webhook Reliability**
   - Retry mechanisms
   - Dead letter queues
   - Monitoring alerts

## Troubleshooting

### Common Issues

1. **Verification Not Starting**
   - Check Stripe API keys
   - Verify webhook configuration
   - Check network connectivity

2. **Webhook Not Receiving**
   - Verify endpoint URL
   - Check webhook signature
   - Review Stripe logs

3. **Status Not Updating**
   - Check webhook delivery
   - Verify database permissions
   - Review RLS policies

### Debug Tools

1. **Stripe Dashboard**
   - View verification sessions
   - Check webhook delivery logs
   - Monitor API usage

2. **Application Logs**
   - Server-side error logs
   - Client-side error tracking
   - User journey logs

3. **Database Queries**
   - Check verification records
   - Monitor status updates
   - Review user permissions

## Future Enhancements

### Planned Features

1. **Enhanced Document Support**
   - Additional document types
   - International document support
   - Business verification

2. **Improved UX**
   - Progressive verification
   - Mobile app optimization
   - Offline verification handling

3. **Advanced Security**
   - Risk scoring integration
   - Fraud detection
   - Behavioral analysis

### Integration Opportunities

1. **Background Checks**
   - Criminal history checks
   - Credit score integration
   - Reference verification

2. **Enhanced Trust Scores**
   - Combine multiple verification types
   - Social media verification
   - Phone number verification

## Support and Documentation

### User Support

- In-app help guides
- Email support for verification issues
- FAQ section for common problems
- Video tutorials for verification process

### Developer Resources

- API documentation
- Integration examples
- Testing guidelines
- Best practices guide

For technical support or questions, contact the development team or refer to the Stripe Identity documentation.
