'use client';

import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Camera } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import ImageUpload from './ImageUpload';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ConfirmationData) => void;
  type: 'pickup' | 'return';
  booking: {
    id: string;
    listing: {
      title: string;
      images: string[];
    };
    start_date: string;
    end_date: string;
  };
  userRole: 'renter' | 'owner';
  existingData?: {
    images?: string[];
    notes?: string;
    condition?: string;
  };
}

interface ConfirmationData {
  images: string[];
  notes: string;
  condition: string;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  type,
  booking,
  userRole,
  existingData
}: ConfirmationModalProps) {
  const [images, setImages] = useState<string[]>(existingData?.images || []);
  const [notes, setNotes] = useState(existingData?.notes || '');
  const [condition, setCondition] = useState(existingData?.condition || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (images.length === 0) {
      alert('Please upload at least one image for confirmation');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        images,
        notes,
        condition
      });
      onClose();
    } catch (error) {
      console.error('Error submitting confirmation:', error);
      alert('Failed to submit confirmation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = type === 'pickup' 
    ? `Confirm ${userRole === 'renter' ? 'Item Pickup' : 'Item Handover'}`
    : `Confirm ${userRole === 'renter' ? 'Item Return' : 'Item Received'}`;

  const imagePrompt = type === 'pickup'
    ? 'Take photos of the item before pickup to document its condition'
    : 'Take photos of the item after return to document its condition';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {booking.listing.title}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Item Preview */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              {booking.listing.images[0] && (
                <img
                  src={booking.listing.images[0]}
                  alt={booking.listing.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              )}
              <div>
                <h3 className="font-medium text-gray-900">{booking.listing.title}</h3>
                <p className="text-sm text-gray-500">
                  {type === 'pickup' ? 'Pickup' : 'Return'} Date: {' '}
                  {new Date(type === 'pickup' ? booking.start_date : booking.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Camera className="w-4 h-4 inline mr-1" />
              Confirmation Photos *
            </label>
            <p className="text-xs text-gray-500 mb-3">{imagePrompt}</p>
            <ImageUpload
              onImagesUploaded={setImages}
              maxImages={5}
              existingImages={images}
              placeholder="Take photos to confirm condition"
              folder={`${type}-${booking.id}`}
            />
          </div>

          {/* Condition Assessment */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Condition *
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select condition</option>
              <option value="excellent">Excellent - Like new</option>
              <option value="good">Good - Minor wear</option>
              <option value="fair">Fair - Noticeable wear</option>
              <option value="poor">Poor - Significant wear</option>
              <option value="damaged">Damaged - Needs repair</option>
            </select>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Any additional notes about the ${type}...`}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Warning for condition issues */}
          {condition && ['poor', 'damaged'].includes(condition) && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    Condition Issue Detected
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    You've marked the item as {condition}. Please provide detailed notes 
                    and photos to document any issues for proper resolution.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={isSubmitting || images.length === 0 || !condition}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm {type === 'pickup' ? 'Pickup' : 'Return'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
} 