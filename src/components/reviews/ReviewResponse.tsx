'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  useCreateReviewResponse, 
  useUpdateReviewResponse, 
  useDeleteReviewResponse 
} from '@/hooks/use-reviews';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';

interface ReviewResponseProps {
  reviewId: string;
  revieweeId: string;
  existingResponse?: {
    comment: string;
    createdAt: string;
    editedAt?: string;
  } | null;
  className?: string;
}

const responseSchema = z.object({
  comment: z.string().min(10, 'Response must be at least 10 characters').max(500, 'Response must be less than 500 characters'),
});

type ResponseFormData = z.infer<typeof responseSchema>;

export function ReviewResponse({ 
  reviewId, 
  revieweeId, 
  existingResponse, 
  className = '' 
}: ReviewResponseProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const { user } = useAuth();

  const createResponse = useCreateReviewResponse();
  const updateResponse = useUpdateReviewResponse();
  const deleteResponse = useDeleteReviewResponse();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm<ResponseFormData>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      comment: existingResponse?.comment || '',
    },
  });

  // Check if current user can respond (is the reviewee)
  const canRespond = user?.id === revieweeId;

  // Check if response can be edited (within 24 hours)
  const canEdit = existingResponse && (() => {
    const responseCreatedAt = new Date(existingResponse.createdAt);
    const now = new Date();
    const hoursSinceResponse = (now.getTime() - responseCreatedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceResponse <= 24;
  })();

  // Check if response can be deleted (within 1 hour)
  const canDelete = existingResponse && (() => {
    const responseCreatedAt = new Date(existingResponse.createdAt);
    const now = new Date();
    const hoursSinceResponse = (now.getTime() - responseCreatedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceResponse <= 1;
  })();

  const onSubmit = async (data: ResponseFormData) => {
    try {
      if (existingResponse && isEditing) {
        await updateResponse.mutateAsync({
          reviewId,
          comment: data.comment,
        });
        setIsEditing(false);
      } else {
        await createResponse.mutateAsync({
          reviewId,
          comment: data.comment,
        });
        setShowResponseForm(false);
      }
      reset();
    } catch (error) {
      console.error('Error submitting response:', error);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this response?')) {
      return;
    }

    try {
      await deleteResponse.mutateAsync(reviewId);
    } catch (error) {
      console.error('Error deleting response:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setValue('comment', existingResponse?.comment || '');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setValue('comment', existingResponse?.comment || '');
  };

  // Don't show anything if user can't respond
  if (!canRespond) {
    return existingResponse ? (
      <div className={`mt-4 ${className}`}>
        <Card className="bg-gray-50 border-l-4 border-l-blue-500 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Response from listing owner:
              </h4>
              <p className="text-sm text-gray-700">{existingResponse.comment}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {new Date(existingResponse.createdAt).toLocaleDateString()}
            {existingResponse.editedAt && (
              <span className="ml-2">(edited)</span>
            )}
          </div>
        </Card>
      </div>
    ) : null;
  }

  return (
    <div className={`mt-4 ${className}`}>
      {existingResponse && !isEditing ? (
        <Card className="bg-gray-50 border-l-4 border-l-blue-500 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Your response:
              </h4>
              <p className="text-sm text-gray-700">{existingResponse.comment}</p>
            </div>
            <div className="flex space-x-2 ml-4">
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="text-xs"
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-xs text-red-600 hover:text-red-700"
                  disabled={deleteResponse.isPending}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {new Date(existingResponse.createdAt).toLocaleDateString()}
            {existingResponse.editedAt && (
              <span className="ml-2">(edited)</span>
            )}
          </div>
        </Card>
      ) : (showResponseForm || isEditing) ? (
        <Card className="p-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isEditing ? 'Edit your response' : 'Respond to this review'}
              </label>
              <textarea
                {...register('comment')}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Share your perspective on this review..."
              />
              {errors.comment && (
                <p className="mt-1 text-sm text-red-600">{errors.comment.message}</p>
              )}
            </div>

            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                {isEditing ? 'Responses can be edited within 24 hours and deleted within 1 hour.' : 'Your response will be visible to the reviewer and future visitors.'}
              </p>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (isEditing) {
                      handleCancelEdit();
                    } else {
                      setShowResponseForm(false);
                    }
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? 'Submitting...' : isEditing ? 'Update Response' : 'Post Response'}
                </Button>
              </div>
            </div>
          </form>
        </Card>
      ) : (
        <div className="flex justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResponseForm(true)}
            className="text-blue-600 border-blue-600 hover:bg-blue-50"
          >
            Respond to this review
          </Button>
        </div>
      )}
    </div>
  );
} 