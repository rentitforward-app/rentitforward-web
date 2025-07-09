'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Send, MessageCircle, User } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'react-hot-toast';

const messageSchema = z.object({
  message: z.string().min(1, 'Please enter a message').max(500, 'Message is too long'),
});

type MessageForm = z.infer<typeof messageSchema>;

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: string;
    title: string;
    profiles: {
      id: string;
      full_name: string;
      avatar_url: string | null;
    };
  };
  onSuccess?: () => void;
}

export default function MessageModal({ isOpen, onClose, listing, onSuccess }: MessageModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MessageForm>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: `Hi! I'm interested in your listing "${listing.title}". Is it available?`
    }
  });

  const onSubmit = async (data: MessageForm) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listing_id: listing.id,
          other_user_id: listing.profiles.id,
          initial_message: data.message
        }),
      });

      if (response.ok) {
        toast.success('Message sent successfully!');
        reset();
        onClose();
        onSuccess?.();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <MessageCircle className="h-6 w-6 text-[#44D62C]" />
            <h2 className="text-lg font-semibold text-gray-900">Send Message</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Host Info */}
        <div className="p-6 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {listing.profiles.avatar_url ? (
                <Image
                  src={listing.profiles.avatar_url}
                  alt={listing.profiles.full_name}
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{listing.profiles.full_name}</h3>
              <p className="text-sm text-gray-600">Host of "{listing.title}"</p>
            </div>
          </div>
        </div>

        {/* Message Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Message
            </label>
            <textarea
              {...register('message')}
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm resize-none"
              placeholder="Type your message here..."
            />
            {errors.message && (
              <p className="mt-1 text-sm text-red-600">{errors.message.message}</p>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-[#44D62C] text-white py-2 px-4 rounded-md font-medium hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 