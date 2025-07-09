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
  receiver_id: string;
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

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately for better UX
    setIsSending(true);

    // Optimistic update - add message to UI immediately
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender_id: user.id,
      receiver_id: selectedConversation.participants.find((id: string) => id !== user.id) || '',
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
      // Get the other user ID for receiver_id
      const otherUserId = selectedConversation.participants.find((id: string) => id !== user.id);
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          receiver_id: otherUserId,
          content: messageContent,
          message_type: 'text',
          is_read: false
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        
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

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      
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
                          <div className="flex-shrink-0">
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
                        <div className="flex-shrink-0">
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
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {selectedConversation.other_user.full_name}
                          </h3>
                          <p className="text-sm text-gray-600">{selectedConversation.listing.title}</p>
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
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
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
                    ))}
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