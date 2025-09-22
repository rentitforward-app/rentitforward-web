import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unifiedEmailService } from '@/lib/email/unified-email-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId, conversationId, receiverId } = await request.json();

    if (!messageId || !conversationId || !receiverId) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, conversationId, receiverId' },
        { status: 400 }
      );
    }

    // Get message details with conversation and user info
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey (
          id,
          full_name,
          email
        ),
        conversation:conversations!messages_conversation_id_fkey (
          id,
          listing_id,
          booking_id,
          listings!conversations_listing_id_fkey (
            id,
            title
          )
        )
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !messageData) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Get receiver profile
    const { data: receiverProfile, error: receiverError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', receiverId)
      .single();

    if (receiverError || !receiverProfile) {
      return NextResponse.json(
        { error: 'Receiver not found' },
        { status: 404 }
      );
    }

    // Send FCM push notification
    try {
      const { FCMBookingNotifications } = await import('@/lib/fcm/notifications');
      await FCMBookingNotifications.notifyMessageReceived(
        receiverId,
        messageId,
        messageData.conversation.listings.title,
        messageData.sender.full_name
      );
    } catch (fcmError) {
      console.error('Failed to send FCM notification:', fcmError);
      // Don't fail the API if FCM fails
    }

    // Send email notification
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://rentitforward.com.au';
      
      // Create a preview of the message (limit to 100 characters)
      const messagePreview = messageData.content.length > 100 
        ? messageData.content.substring(0, 100) + '...'
        : messageData.content;

      const emailData = {
        sender_name: messageData.sender.full_name,
        recipient_name: receiverProfile.full_name,
        recipient_email: receiverProfile.email,
        listing_title: messageData.conversation.listings.title,
        booking_id: messageData.conversation.booking_id || conversationId,
        message_preview: messagePreview,
        base_url: baseUrl,
      };

      await unifiedEmailService.sendMessageNotificationEmail(emailData);
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the API if email fails
    }

    // Create in-app notification
    try {
      await supabase
        .from('app_notifications')
        .insert({
          user_id: receiverId,
          type: 'new_message',
          title: `New message from ${messageData.sender.full_name}`,
          message: `"${messageData.content.substring(0, 50)}${messageData.content.length > 50 ? '...' : ''}"`,
          action_url: `/messages?conversation=${conversationId}`,
          data: {
            message_id: messageId,
            conversation_id: conversationId,
            sender_id: messageData.sender_id,
            sender_name: messageData.sender.full_name,
            listing_title: messageData.conversation.listings.title,
          },
          priority: 6, // Medium-high priority for messages
        });
    } catch (notificationError) {
      console.error('Failed to create in-app notification:', notificationError);
      // Don't fail the API if notification creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Message notifications sent successfully'
    });

  } catch (error) {
    console.error('Error sending message notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
