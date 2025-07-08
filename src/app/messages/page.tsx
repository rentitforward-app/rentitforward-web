'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    daily_rate: number;
  };
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();
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
    }
  }, [selectedConversation]);

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
            
            // Get listing data
            const { data: listingData, error: listingError } = await supabase
              .from('listings')
              .select('id, title, images, daily_rate')
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

            // Get unread count for this conversation
            const { count: unreadCount, error: countError } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .eq('is_read', false)
              .neq('sender_id', user.id);

            if (countError) {
              console.warn('Error fetching unread count:', countError);
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
                daily_rate: 0
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
                daily_rate: 0
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
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', user.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          content: newMessage.trim(),
        });

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }

      // Update conversation
      await supabase
        .from('conversations')
        .update({
          last_message: newMessage.trim(),
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedConversation.id);

      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
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
              <div className="p-8 text-center">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
                <p className="text-gray-500 mb-4">Start browsing listings to connect with other users</p>
                <Button onClick={() => router.push('/browse')}>Browse Listings</Button>
              </div>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <Card className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the left to start messaging</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 