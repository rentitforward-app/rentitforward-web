import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listing_id, other_user_id, initial_message } = await request.json();

    // Validate required fields
    if (!listing_id || !other_user_id) {
      return NextResponse.json({ error: 'listing_id and other_user_id are required' }, { status: 400 });
    }

    // Prevent users from messaging themselves
    if (user.id === other_user_id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }

    // Check if conversation already exists
    const { data: existingConversation, error: searchError } = await supabase
      .from('conversations')
      .select('id')
      .eq('listing_id', listing_id)
      .contains('participants', [user.id, other_user_id])
      .single();

    if (searchError && searchError.code !== 'PGRST116') {
      console.error('Error searching for existing conversation:', searchError);
    }

    if (existingConversation) {
      // If initial message provided, send it to existing conversation
      if (initial_message && initial_message.trim()) {
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: existingConversation.id,
            sender_id: user.id,
            receiver_id: other_user_id,
            content: initial_message.trim(),
            message_type: 'text',
            is_read: false
          });

        if (messageError) {
          console.error('Error sending message to existing conversation:', messageError);
          return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
        }

        // Create database notification for the receiver
        try {
          const { MessageNotifications } = await import('@/lib/notifications/database');
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          await MessageNotifications.createNewMessageNotification(
            other_user_id,
            senderProfile?.full_name || 'Someone',
            initial_message.trim(),
            existingConversation.id
          );
        } catch (notificationError) {
          console.error('Failed to create message notification:', notificationError);
          // Don't fail the message if notification fails
        }

        // Update conversation's last message
        await supabase
          .from('conversations')
          .update({
            last_message: initial_message.trim(),
            last_message_at: new Date().toISOString()
          })
          .eq('id', existingConversation.id);
      }

      return NextResponse.json({ 
        conversation_id: existingConversation.id,
        message: 'Message sent to existing conversation'
      });
    }

    // Create new conversation
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        listing_id,
        participants: [user.id, other_user_id],
        last_message: initial_message?.trim() || '',
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Send initial message if provided
    if (initial_message && initial_message.trim()) {
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_id: user.id,
          receiver_id: other_user_id,
          content: initial_message.trim(),
          message_type: 'text',
          is_read: false
        });

      if (messageError) {
        console.error('Error sending initial message:', messageError);
        return NextResponse.json({ 
          conversation_id: conversation.id,
          message: 'Conversation created but initial message failed to send',
          error: messageError.message
        }, { status: 201 });
      }

      // Create database notification for the receiver
      try {
        const { MessageNotifications } = await import('@/lib/notifications/database');
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        await MessageNotifications.createNewMessageNotification(
          other_user_id,
          senderProfile?.full_name || 'Someone',
          initial_message.trim(),
          conversation.id
        );
      } catch (notificationError) {
        console.error('Failed to create message notification:', notificationError);
        // Don't fail the message if notification fails
      }
    }

    return NextResponse.json({ 
      conversation_id: conversation.id,
      message: 'Conversation created and message sent successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in conversations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 