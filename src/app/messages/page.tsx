'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MessageCircle, 
  Search, 
  Send,
  User,
  Clock,
  Check,
  CheckCheck,
  Paperclip,
  MoreVertical
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import Image from 'next/image';
import { formatDistanceToNow, format } from 'date-fns';
import { formatChatDate, isDifferentDay } from '@/lib/utils';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  conversation_id: string;
  is_read: boolean;
  sender: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  listing_id: string;
  booking_id: string | null;
  participants: string[];
  last_message: string;
  last_message_at: string;
  unread_count: number;
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  listing: {
    id: string;
    title: string;
    images: string[];
    price_per_day: number;
  };
}

function MessagesPageContent() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);


  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markAsRead(selectedConversation.id);
      // Store the timestamp when this conversation was last viewed
      const viewedAt = new Date().toISOString();
      localStorage.setItem(`conversation_viewed_${selectedConversation.id}`, viewedAt);
    }
  }, [selectedConversation]);

  // Handle URL parameters for auto-selecting conversations
  useEffect(() => {
    const withUserId = searchParams.get('with');
    const bookingId = searchParams.get('booking');
    
    if (withUserId && conversations.length > 0 && !selectedConversation) {
      // Look for existing conversation with this user
      const existingConversation = conversations.find(conv => 
        conv.other_user.id === withUserId || 
        (conv.booking_id === bookingId && bookingId)
      );
      
      if (existingConversation) {
        setSelectedConversation(existingConversation);
      } else if (bookingId) {
        // If no existing conversation but we have booking context, create a new one
        createConversationFromBooking(withUserId, bookingId);
      }
    }
  }, [conversations, searchParams, selectedConversation]);

  // Check if a user is online
  const isUserOnline = (userId: string): boolean => {
    return onlineUsers.has(userId);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }, [messages]);

  // Real-time subscriptions for live message updates
  useEffect(() => {
    if (!user || !user.id) return;

    console.log('🔔 Setting up real-time subscriptions for user:', user.id);
    console.log('🔔 Current conversations:', conversations.length);

    // Subscribe to ALL messages and filter client-side for better reliability
    const messagesSubscription = supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('🔥 New message received (raw):', payload);
          const newMessage = payload.new as Message;
          
          // Check if this message belongs to a conversation the user is part of
          const relevantConversation = conversations.find(conv => conv.id === newMessage.conversation_id);
          console.log('🔍 Relevant conversation found:', !!relevantConversation, newMessage.conversation_id);
          
          if (!relevantConversation) {
            console.log('❌ Message not for user conversations, ignoring');
            return;
          }
          
          console.log('✅ Processing message for user');
          
          // Add new message to current conversation if it matches
          if (selectedConversation && newMessage.conversation_id === selectedConversation.id) {
            console.log('📱 Adding message to current conversation');
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(msg => msg.id === newMessage.id)) {
                console.log('⚠️ Duplicate message, skipping');
                return prev;
              }
              console.log('✅ Adding new message to chat');
              return [...prev, newMessage];
            });
            
            // Mark as read if we're the receiver and viewing the conversation
            if (newMessage.sender_id !== user.id) {
              console.log('👁️ Marking message as read');
              markAsRead(selectedConversation.id);
            }
          }
          
          // Update conversation list with new message
          console.log('📋 Updating conversation list');
          setConversations(prev => 
            prev.map(conv => {
              if (conv.id === newMessage.conversation_id) {
                // Check if this conversation is currently selected
                const isCurrentlySelected = selectedConversation?.id === conv.id;
                
                // If not currently selected and message is from another user, increment count
                let newUnreadCount = conv.unread_count;
                if (!isCurrentlySelected && newMessage.sender_id !== user.id) {
                  newUnreadCount = conv.unread_count + 1;
                }
                
                console.log('📊 Updated conversation:', conv.id, 'unread:', newUnreadCount);
                
                return {
                  ...conv,
                  last_message: newMessage.content,
                  last_message_at: newMessage.created_at,
                  unread_count: newUnreadCount,
                  updated_at: new Date().toISOString()
                };
              }
              return conv;
            }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          console.log('🔄 Message updated:', payload);
          const updatedMessage = payload.new as Message;
          
          // Check if this message belongs to a conversation the user is part of
          const relevantConversation = conversations.find(conv => conv.id === updatedMessage.conversation_id);
          if (!relevantConversation) return;
          
          // Update message in current conversation if it matches
          if (selectedConversation && updatedMessage.conversation_id === selectedConversation.id) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessage.id ? updatedMessage : msg
              )
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Messages subscription status:', status);
      });

    // Subscribe to ALL conversation updates and filter client-side
    const conversationsSubscription = supabase
      .channel('all-conversations')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('🔄 Conversation updated:', payload);
          const updatedConversation = payload.new;
          
          // Check if user is a participant
          if (!updatedConversation.participants?.includes(user.id)) {
            console.log('❌ Conversation update not for user, ignoring');
            return;
          }
          
          console.log('✅ Processing conversation update for user');
          
          // Update conversation in list
          setConversations(prev => 
            prev.map(conv => 
              conv.id === updatedConversation.id
                ? { ...conv, ...updatedConversation }
                : conv
            )
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          console.log('🆕 New conversation created:', payload);
          const newConversation = payload.new;
          
          // Check if user is a participant
          if (!newConversation.participants?.includes(user.id)) {
            console.log('❌ New conversation not for user, ignoring');
            return;
          }
          
          console.log('✅ New conversation for user, refetching');
          // Refetch conversations to get the full data with user and listing info
          fetchConversations();
        }
      )
      .subscribe((status) => {
        console.log('📡 Conversations subscription status:', status);
      });

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔕 Cleaning up real-time subscriptions');
      messagesSubscription.unsubscribe();
      conversationsSubscription.unsubscribe();
    };
  }, [user, selectedConversation, conversations]); // Added conversations back for filtering

  // Track online users using presence
  useEffect(() => {
    if (!user) return;

    // Set up presence tracking
    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    // Track when users come online
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineUserIds = Object.keys(state);
        setOnlineUsers(new Set(onlineUserIds));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Join the presence channel
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    // Cleanup on unmount
    return () => {
      presenceChannel.unsubscribe();
    };
  }, [user]);

  const createConversationFromBooking = async (otherUserId: string, bookingId: string) => {
    try {
      // First, fetch the booking details to get listing information
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          id,
          listing_id,
          listings!listing_id (
            id,
            title,
            images,
            price_per_day
          )
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        console.error('Failed to fetch booking:', bookingError);
        toast.error('Failed to start conversation. Booking not found.');
        return;
      }

      // Fetch the other user's profile
      const { data: otherUserProfile, error: userError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', otherUserId)
        .single();

      if (userError || !otherUserProfile) {
        console.error('Failed to fetch user profile:', userError);
        toast.error('Failed to start conversation. User not found.');
        return;
      }

      // Create a new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          listing_id: booking.listing_id,
          booking_id: bookingId,
          participants: [user.id, otherUserId],
          last_message: '',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (convError || !newConversation) {
        console.error('Failed to create conversation:', convError);
        toast.error('Failed to start conversation.');
        return;
      }

      // Create the conversation object in the format expected by the UI
      const formattedConversation: Conversation = {
        id: newConversation.id,
        created_at: newConversation.created_at,
        updated_at: newConversation.updated_at,
        listing_id: newConversation.listing_id,
        booking_id: newConversation.booking_id,
        participants: newConversation.participants,
        last_message: '',
        last_message_at: newConversation.last_message_at,
        unread_count: 0,
        other_user: {
          id: otherUserProfile.id,
          full_name: otherUserProfile.full_name,
          avatar_url: otherUserProfile.avatar_url,
        },
        listing: {
          id: (booking.listings as any).id,
          title: (booking.listings as any).title,
          images: (booking.listings as any).images,
          price_per_day: (booking.listings as any).price_per_day,
        },
      };

      // Add to conversations list and select it
      setConversations(prev => [formattedConversation, ...prev]);
      setSelectedConversation(formattedConversation);
      
      toast.success('Conversation started!');
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation.');
    }
  };

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login?redirectTo=/messages');
      return;
    }
    setUser(user);
  };

  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      
      // Debug: Check if user exists
      console.log('Fetching conversations for user:', user?.id);
      
      if (!user?.id) {
        console.error('No user ID found');
        setConversations([]);
        return;
      }

      // First, let's check if the conversations table exists by trying a simple select
      const { data: testData, error: testError } = await supabase
        .from('conversations')
        .select('id')
        .limit(1);

      if (testError) {
        console.error('Table access error:', testError);
        console.error('Error details:', {
          message: testError.message,
          code: testError.code,
          details: testError.details,
          hint: testError.hint
        });
        
        // Show a more specific error message
        if (testError.code === 'PGRST116') {
          toast.error('Conversations table not found - please contact support');
        } else if (testError.code === '42501') {
          toast.error('Access denied to conversations - please check permissions');
        } else {
          toast.error(`Database error: ${testError.message || 'Unknown error'}`);
        }
        
        setConversations([]);
        return;
      }

      console.log('Table accessible, test data:', testData);
      
      // Now try the actual query
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select(`
          id,
          listing_id,
          booking_id,
          participants,
          last_message,
          last_message_at,
          created_at,
          updated_at
        `)
        .contains('participants', [user.id])
        .order('updated_at', { ascending: false });

      if (conversationsError) {
        console.error('Error fetching conversations:', conversationsError);
        console.error('Detailed error:', {
          message: conversationsError.message,
          code: conversationsError.code,
          details: conversationsError.details,
          hint: conversationsError.hint
        });
        toast.error(`Failed to load conversations: ${conversationsError.message}`);
        setConversations([]);
        return;
      }

      console.log('Conversations data:', conversationsData);

      if (!conversationsData || conversationsData.length === 0) {
        console.log('No conversations found for user');
        setConversations([]);
        return;
      }

      // Get additional data for each conversation
      const enrichedConversations = await Promise.all(
        conversationsData.map(async (conv) => {
          try {
            // Get the other participant (not the current user)
            const otherUserId = conv.participants.find((id: string) => id !== user.id);
            
            // Get listing data - using correct field names
            const { data: listingData, error: listingError } = await supabase
              .from('listings')
              .select('id, title, images, price_per_day')
              .eq('id', conv.listing_id)
              .single();

            if (listingError) {
              console.warn('Error fetching listing:', listingError);
            }

            // Get other user data
            const { data: otherUserData, error: userError } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', otherUserId)
              .single();

            if (userError) {
              console.warn('Error fetching user profile:', userError);
            }

            // Get the last viewed timestamp for this conversation
            const lastViewedKey = `conversation_viewed_${conv.id}`;
            const lastViewedTimestamp = localStorage.getItem(lastViewedKey);
            
            let unreadCount = 0;
            
            if (lastViewedTimestamp) {
              // Count messages created after the last viewed timestamp (excluding user's own messages)
              const { count, error: countError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender_id', user.id)
                .gt('created_at', lastViewedTimestamp);

              if (countError) {
                console.warn('Error fetching unread count:', countError);
              } else {
                unreadCount = count || 0;
              }
            } else {
              // If no timestamp exists, count all messages from other users
              const { count, error: countError } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('conversation_id', conv.id)
                .neq('sender_id', user.id);

              if (countError) {
                console.warn('Error fetching unread count:', countError);
              } else {
                unreadCount = count || 0;
              }
            }

            return {
              ...conv,
              unread_count: unreadCount || 0,
              other_user: otherUserData || {
                id: otherUserId || 'unknown',
                full_name: 'Unknown User',
                avatar_url: null
              },
              listing: listingData || {
                id: conv.listing_id,
                title: 'Unknown Listing',
                images: [],
                price_per_day: 0
              }
            };
          } catch (convError) {
            console.error('Error enriching conversation:', convError);
            return {
              ...conv,
              unread_count: 0,
              other_user: {
                id: 'unknown',
                full_name: 'Unknown User',
                avatar_url: null
              },
              listing: {
                id: conv.listing_id,
                title: 'Unknown Listing',
                images: [],
                price_per_day: 0
              }
            };
          }
        })
      );

      console.log('Enriched conversations:', enrichedConversations);
      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Unexpected error in fetchConversations:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error('An unexpected error occurred while loading conversations');
      setConversations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      // Store the current timestamp as the last viewed time for this conversation
      const viewedAt = new Date().toISOString();
      localStorage.setItem(`conversation_viewed_${conversationId}`, viewedAt);

      // Update local state to reset unread count for this conversation
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId
            ? { ...conv, unread_count: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    // Check authentication state
    if (!user || !user.id) {
      console.error('User not authenticated');
      toast.error('You must be logged in to send messages');
      return;
    }

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setIsSending(true);

    // Show typing indicator (optional - can be removed if not needed)
    // This would require adding a typing indicator state and UI

    // Optimistic update - add message to UI immediately
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      conversation_id: selectedConversation.id,
      is_read: false,
      sender: {
        full_name: user.user_metadata?.full_name || user.email || 'You',
        avatar_url: user.user_metadata?.avatar_url || null
      }
    };

    // Add message to UI immediately
    setMessages(prev => [...prev, tempMessage]);

    // Update conversation list immediately (optimistic)
    setConversations(prev => 
      prev.map(conv => 
        conv.id === selectedConversation.id
          ? {
              ...conv,
              last_message: messageContent,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : conv
      ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    );

    try {
      // Debug logging
      console.log('Attempting to send message with data:', {
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: messageContent,
        message_type: 'text',
        is_read: false
      });
      console.log('User object:', user);
      console.log('Selected conversation:', selectedConversation);
      
      // Check if user is in conversation participants
      const isUserInConversation = selectedConversation.participants?.includes(user.id);
      console.log('Is user in conversation participants?', isUserInConversation);
      console.log('Conversation participants:', selectedConversation.participants);
      
      if (!isUserInConversation) {
        console.error('User is not a participant in this conversation');
        toast.error('You are not authorized to send messages in this conversation');
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setNewMessage(messageContent);
        return;
      }

      // Determine the receiver_id (the other participant in the conversation)
      const receiverId = selectedConversation.participants?.find(id => id !== user.id);
      console.log('Determined receiver_id:', receiverId);
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          receiver_id: receiverId, // Include receiver_id for compatibility
          content: messageContent,
          message_type: 'text',
          is_read: false
        })
        .select('id')
        .single();

      if (error) {
        console.error('Supabase error sending message:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        
        // More specific error message based on error code
        let errorMessage = 'Failed to send message';
        if (error.code === 'PGRST116') {
          errorMessage = 'No permission to send message in this conversation';
        } else if (error.code === '42501') {
          errorMessage = 'Insufficient permissions to send message';
        } else if (error.message) {
          errorMessage = `Failed to send message: ${error.message}`;
        }
        
        toast.error(errorMessage);
        
        // Revert optimistic update on error
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        setNewMessage(messageContent); // Restore the message content
        return;
      }

      // Update the temporary message with the real ID
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempMessage.id 
            ? { ...msg, id: data.id }
            : msg
        )
      );

      // Update conversation in background (no loading state)
      await supabase
        .from('conversations')
        .update({
          last_message: messageContent,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedConversation.id);

      // Send message notifications (email, push, in-app)
      try {
        await fetch('/api/messages/notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messageId: data.id,
            conversationId: selectedConversation.id,
            receiverId: receiverId,
          }),
        });
      } catch (notifyError) {
        console.error('Failed to send message notifications:', notifyError);
        // Don't fail the message send if notifications fail
      }

    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // More specific error message
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'An unexpected error occurred while sending the message';
      
      toast.error(`Failed to send message: ${errorMessage}`);
      
      // Revert optimistic update on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      setNewMessage(messageContent); // Restore the message content
    } finally {
      setIsSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.listing.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Messages</h1>
          <p className="text-gray-600">Connect with other members of the community</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-gray-500 mb-4">Start browsing listings to connect with other users</p>
                  <Button onClick={() => router.push('/browse')}>Browse Listings</Button>
                </div>
              ) : (
                <>
                  {/* Search */}
                  <div className="p-4 border-b">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#44D62C] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Conversations */}
                  <div className="flex-1 overflow-y-auto">
                    {filteredConversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                          selectedConversation?.id === conversation.id ? 'bg-[#44D62C]/10 border-r-4 border-r-[#44D62C]' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 relative">
                            {conversation.other_user.avatar_url ? (
                              <Image
                                src={conversation.other_user.avatar_url}
                                alt={conversation.other_user.full_name}
                                width={48}
                                height={48}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                            {/* Online indicator for conversation list */}
                            {isUserOnline(conversation.other_user.id) && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {conversation.other_user.full_name}
                              </p>
                              {conversation.unread_count > 0 && (
                                <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-[#44D62C] rounded-full">
                                  {conversation.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{conversation.listing.title}</p>
                            <p className="text-xs text-gray-500 truncate">{conversation.last_message}</p>
                            <p className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 relative">
                          {selectedConversation.other_user.avatar_url ? (
                            <Image
                              src={selectedConversation.other_user.avatar_url}
                              alt={selectedConversation.other_user.full_name}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                          {/* Online indicator - only show if user is actually online */}
                          {selectedConversation && isUserOnline(selectedConversation.other_user.id) && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {selectedConversation.other_user.full_name}
                          </h3>
                          <p className="text-sm text-gray-600">{selectedConversation.listing.title}</p>
                          {/* Online status - only show if user is actually online */}
                          {selectedConversation && isUserOnline(selectedConversation.other_user.id) ? (
                            <p className="text-xs text-green-600 flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                              Online
                            </p>
                          ) : (
                            <p className="text-xs text-gray-500">
                              Last seen recently
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/listings/${selectedConversation.listing_id}`)}
                      >
                        View Listing
                      </Button>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4" id="messages-container">
                    {messages.map((message, index) => {
                      const showDateSeparator = index === 0 || isDifferentDay(
                        messages[index - 1].created_at,
                        message.created_at
                      );

                      return (
                        <div key={message.id}>
                          {/* Date Separator */}
                          {showDateSeparator && (
                            <div className="flex items-center justify-center my-4">
                              <div className="flex-grow border-t border-gray-300"></div>
                              <div className="px-4 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                                {formatChatDate(message.created_at)}
                              </div>
                              <div className="flex-grow border-t border-gray-300"></div>
                            </div>
                          )}
                          
                          {/* Message */}
                          <div
                            className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.sender_id === user.id
                                  ? 'bg-[#44D62C] text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-xs opacity-75">
                                  {format(new Date(message.created_at), 'HH:mm')}
                                </span>
                                {message.sender_id === user.id && (
                                  <div className="ml-2">
                                    {message.is_read ? (
                                      <CheckCheck className="w-3 h-3 opacity-75" />
                                    ) : (
                                      <Check className="w-3 h-3 opacity-75" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Removed redundant live updates indicator - online status in header already shows real-time connection */}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t">
                    <form onSubmit={sendMessage} className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#44D62C] focus:border-transparent"
                        disabled={isSending}
                      />
                      <Button
                        type="submit"
                        disabled={isSending || !newMessage.trim()}
                        size="sm"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                    <p className="text-gray-500">Choose a conversation from the left to start messaging</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <MessagesPageContent />
    </Suspense>
  );
} 