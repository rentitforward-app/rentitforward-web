interface CreateNotificationParams {
  userId: string;
  type: 'message' | 'booking' | 'payment' | 'review' | 'favorite' | 'system';
  title: string;
  message: string;
  relatedId?: string;
  actionUrl?: string;
  metadata?: any;
}

// Create a notification via API
export async function createNotification(params: CreateNotificationParams): Promise<boolean> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        related_id: params.relatedId,
        action_url: params.actionUrl,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to create notification:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
}

/**
 * Send review request email notification
 */
async function sendReviewRequestEmailNotification(
  userId: string,
  bookingId: string,
  listingTitle: string,
  otherPartyName: string,
  reviewType: 'renter' | 'owner'
): Promise<void> {
  try {
    // Get user email - you'd typically fetch this from your user database
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (!profile?.email) {
      console.warn('No email found for user:', userId);
      return;
    }

    const { sendReviewEmail } = await import('./email-service');
    
    const templateData = {
      recipientName: profile.full_name || 'There',
      listingTitle,
      otherPartyName,
      reviewType,
      bookingId,
      actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/bookings/${bookingId}/reviews`,
    };

    const result = await sendReviewEmail('request', profile.email, templateData);
    
    if (!result.success) {
      console.error('Failed to send review request email:', result.error);
    } else {
      console.log('Review request email sent successfully:', result.messageId);
    }
  } catch (error) {
    console.error('Error sending review request email:', error);
  }
}

/**
 * Send review response email notification
 */
async function sendReviewResponseEmailNotification(
  reviewerId: string,
  reviewId: string,
  responseAuthorName: string
): Promise<void> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', reviewerId)
      .single();

    if (!profile?.email) {
      console.warn('No email found for reviewer:', reviewerId);
      return;
    }

    // Get review details for the email
    const { data: review } = await supabase
      .from('reviews')
      .select(`
        id,
        booking:booking_id (
          listing:listing_id (title)
        )
      `)
      .eq('id', reviewId)
      .single();

    const listingTitle = review?.booking?.listing?.title || 'your rental';

    const { sendReviewEmail } = await import('./email-service');
    
    const templateData = {
      recipientName: profile.full_name || 'There',
      responderName: responseAuthorName,
      listingTitle,
      reviewId,
      actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/reviews/${reviewId}`,
    };

    const result = await sendReviewEmail('response', profile.email, templateData);
    
    if (!result.success) {
      console.error('Failed to send review response email:', result.error);
    } else {
      console.log('Review response email sent successfully:', result.messageId);
    }
  } catch (error) {
    console.error('Error sending review response email:', error);
  }
}

/**
 * Create renter review notification with email
 */
export async function createRenterReviewNotification(
  renterId: string,
  bookingId: string,
  listingTitle: string,
  ownerName: string
): Promise<boolean> {
  const notificationResult = await createNotification({
    userId: renterId,
    type: 'review',
    title: 'Review Request',
    message: `Please review your experience with ${listingTitle}`,
    relatedId: bookingId,
    actionUrl: `/bookings/${bookingId}/reviews`,
    metadata: {
      bookingId,
      listingTitle,
      ownerName,
      notificationSubtype: 'request'
    }
  });

  // Send email notification
  try {
    await sendReviewRequestEmailNotification(renterId, bookingId, listingTitle, ownerName, 'renter');
  } catch (error) {
    console.error('Failed to send renter review request email:', error);
  }

  return notificationResult;
}

/**
 * Create owner review notification with email
 */
export async function createOwnerReviewNotification(
  ownerId: string,
  bookingId: string,
  listingTitle: string,
  renterName: string
): Promise<boolean> {
  const notificationResult = await createNotification({
    userId: ownerId,
    type: 'review',
    title: 'Review Request',
    message: `Please review your renter for ${listingTitle}`,
    relatedId: bookingId,
    actionUrl: `/bookings/${bookingId}/reviews`,
    metadata: {
      bookingId,
      listingTitle,
      renterName,
      notificationSubtype: 'request'
    }
  });

  // Send email notification
  try {
    await sendReviewRequestEmailNotification(ownerId, bookingId, listingTitle, renterName, 'owner');
  } catch (error) {
    console.error('Failed to send owner review request email:', error);
  }

  return notificationResult;
}

/**
 * Create review request notifications for both renter and owner with emails
 */
export async function createReviewRequestNotifications(booking: {
  id: string;
  renter_id: string;
  owner_id: string;
  listings?: { title: string };
  profiles?: { full_name: string };
  owner_profile?: { full_name: string };
}): Promise<{ renterNotified: boolean; ownerNotified: boolean }> {
  const listingTitle = booking.listings?.title || 'Your rental';
  const renterName = booking.profiles?.full_name || 'Renter';
  const ownerName = booking.owner_profile?.full_name || 'Owner';

  const [renterNotified, ownerNotified] = await Promise.all([
    createRenterReviewNotification(booking.renter_id, booking.id, listingTitle, ownerName),
    createOwnerReviewNotification(booking.owner_id, booking.id, listingTitle, renterName),
  ]);

  return { renterNotified, ownerNotified };
}

// Create booking status change notification
export async function createBookingStatusNotification(
  userId: string,
  bookingId: string,
  newStatus: string,
  listingTitle: string,
  isOwner: boolean
): Promise<boolean> {
  const statusMessages = {
    confirmed: isOwner ? 'Your listing has been booked!' : 'Your booking has been confirmed!',
    active: isOwner ? 'Your rental has started!' : 'Your rental is now active!',
    completed: isOwner ? 'Rental completed successfully!' : 'Thank you for using our service!',
    cancelled: isOwner ? 'A booking has been cancelled.' : 'Your booking has been cancelled.',
  };

  const message = statusMessages[newStatus as keyof typeof statusMessages] || 
    `Booking status updated to ${newStatus}`;

  return createNotification({
    userId,
    type: 'booking',
    title: 'Booking Update',
    message: `${message} - ${listingTitle}`,
    relatedId: bookingId,
    actionUrl: `/bookings/${bookingId}`,
    metadata: {
      bookingId,
      status: newStatus,
      listingTitle,
      isOwner
    }
  });
}

/**
 * Create review response notification with email
 * Notifies the original reviewer when the reviewee responds
 */
export async function createReviewResponseNotification(
  reviewerId: string,
  reviewId: string,
  responseAuthorName: string
): Promise<boolean> {
  const notificationResult = await createNotification({
    userId: reviewerId,
    type: 'review',
    title: 'Review Response',
    message: `${responseAuthorName} responded to your review`,
    relatedId: reviewId,
    actionUrl: `/reviews/${reviewId}`,
    metadata: {
      reviewId,
      responseAuthorName,
      notificationSubtype: 'response'
    }
  });

  // Send email notification
  try {
    await sendReviewResponseEmailNotification(reviewerId, reviewId, responseAuthorName);
  } catch (error) {
    console.error('Failed to send review response email:', error);
  }

  return notificationResult;
}

// Notification helpers for different scenarios
export const notificationHelpers = {
  // Review-related notifications
  reviewRequest: createReviewRequestNotifications,
  renterReview: createRenterReviewNotification,
  ownerReview: createOwnerReviewNotification,
  reviewResponse: createReviewResponseNotification,
  
  // Booking-related notifications
  bookingStatus: createBookingStatusNotification,
  
  // Generic notification creator
  create: createNotification,
}; 