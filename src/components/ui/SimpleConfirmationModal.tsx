'use client';

import { useState } from 'react';
import { X, CheckCircle, Camera } from 'lucide-react';
import { Button } from './Button';

interface SimpleConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { notes: string; condition: string }) => void;
  type: 'pickup' | 'return';
  bookingTitle: string;
}

export default function SimpleConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  type, 
  bookingTitle 
}: SimpleConfirmationModalProps) {
  const [notes, setNotes] = useState('');
  const [condition, setCondition] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({ notes, condition });
      onClose();
      setNotes('');
      setCondition('');
    } catch (error) {
      console.error('Failed to confirm:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">
              {type === 'pickup' ? 'Confirm Pickup' : 'Confirm Return'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Item: <span className="font-medium">{bookingTitle}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Add any notes about the ${type}...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                onClick={onClose}
                variant="outline"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!condition || isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isSubmitting ? 'Confirming...' : `Confirm ${type === 'pickup' ? 'Pickup' : 'Return'}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
 