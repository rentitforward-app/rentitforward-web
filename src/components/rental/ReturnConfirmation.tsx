'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RotateCcw, 
  Camera, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Star,
  Upload,
  X,
  Package,
  Shield,
  DollarSign,
  Info
} from 'lucide-react';

interface ReturnConfirmationProps {
  bookingId: string;
  listing: {
    id: string;
    title: string;
    depositAmount: number;
    expectedReturnDate: Date;
  };
  onReturn: (data: {
    photos: File[];
    condition: string;
    hasIssues: boolean;
    damageReport?: string;
    rating: number;
    review: string;
  }) => void;
}

export function ReturnConfirmation({ bookingId, listing, onReturn }: ReturnConfirmationProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [condition, setCondition] = useState<string>('excellent');
  const [hasIssues, setHasIssues] = useState(false);
  const [damageReport, setDamageReport] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOverdue = new Date() > listing.expectedReturnDate;
  const hoursOverdue = isOverdue 
    ? Math.floor((new Date().getTime() - listing.expectedReturnDate.getTime()) / (1000 * 60 * 60))
    : 0;

  const conditionOptions = [
    { value: 'excellent', label: 'Excellent', description: 'Perfect condition, no wear or damage' },
    { value: 'good', label: 'Good', description: 'Minor wear consistent with normal use' },
    { value: 'fair', label: 'Fair', description: 'Noticeable wear but still functional' },
    { value: 'poor', label: 'Poor', description: 'Significant wear or damage' },
    { value: 'damaged', label: 'Damaged', description: 'Item requires repair or replacement' },
  ];

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024 // 5MB limit
    );
    
    setPhotos(prev => [...prev, ...validFiles].slice(0, 6)); // Max 6 photos
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleConditionChange = (value: string) => {
    setCondition(value);
    setHasIssues(value === 'fair' || value === 'poor' || value === 'damaged');
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      alert('Please take at least one photo of the item condition');
      return;
    }

    if (hasIssues && !damageReport.trim()) {
      alert('Please provide details about any issues or damage');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReturn({
        photos,
        condition,
        hasIssues,
        damageReport: hasIssues ? damageReport : undefined,
        rating,
        review,
      });
    } catch (error) {
      console.error('Failed to process return:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5" />
            Return Item
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{listing.title}</h3>
              <p className="text-gray-600">Booking ID: {bookingId}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={isOverdue ? "destructive" : "outline"}>
                  {isOverdue ? `${hoursOverdue}h Overdue` : 'On Time'}
                </Badge>
                {listing.depositAmount > 0 && (
                  <Badge className="bg-green-100 text-green-600">
                    ${listing.depositAmount} Deposit
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {isOverdue && (
            <Alert className="mt-4 border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This item is overdue. Late fees may apply. Please return as soon as possible.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Return Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Return Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Take photos showing the item's condition upon return. This documentation 
              helps with deposit processing and ensures transparency.
            </AlertDescription>
          </Alert>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            {photos.length === 0 ? (
              <div className="text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="font-medium mb-2">Document Return Condition</div>
                <div className="text-sm text-gray-600 mb-4">
                  Take clear photos of the item from multiple angles
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="return-photos"
                />
                <label htmlFor="return-photos">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Take Photos
                    </span>
                  </Button>
                </label>
              </div>
            ) : (
              <div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Return photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {photos.length < 6 && (
                    <label htmlFor="return-photos-more" className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                      <div className="text-center">
                        <Camera className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                        <div className="text-xs text-gray-500">Add More</div>
                      </div>
                    </label>
                  )}
                </div>
                
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="return-photos-more"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Condition Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Item Condition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {conditionOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  condition === option.value 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  value={option.value}
                  checked={condition === option.value}
                  onChange={(e) => handleConditionChange(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-600">{option.description}</div>
                </div>
              </label>
            ))}
          </div>

          {hasIssues && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                Damage Report Required
              </h4>
              <textarea
                value={damageReport}
                onChange={(e) => setDamageReport(e.target.value)}
                placeholder="Please describe the damage or issues in detail..."
                className="w-full p-3 border border-orange-300 rounded-lg text-sm"
                rows={4}
                required
              />
              <p className="text-xs text-orange-600 mt-2">
                Detailed damage reports help ensure fair deposit processing.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rating & Review */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            Rate Your Experience
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="font-medium mb-2">Overall Rating</div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`w-8 h-8 rounded transition-colors ${
                    star <= rating 
                      ? 'text-yellow-400' 
                      : 'text-gray-300 hover:text-yellow-200'
                  }`}
                >
                  <Star className={`w-6 h-6 ${star <= rating ? 'fill-current' : ''}`} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">
              Review (Optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Share your experience with this rental..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Deposit Information */}
      {listing.depositAmount > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-green-600 mt-1" />
              <div className="flex-1">
                <h4 className="font-medium">Security Deposit</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Your ${listing.depositAmount} security deposit will be processed based on the item's return condition:
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>Excellent/Good:</strong> Full refund within 24-48 hours</li>
                  <li>• <strong>Fair:</strong> Partial deduction for cleaning/minor repairs</li>
                  <li>• <strong>Poor/Damaged:</strong> Deduction for repair/replacement costs</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Confirmation */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5">
                <input type="checkbox" className="w-5 h-5 text-green-600" required />
              </div>
              <div className="text-sm">
                I confirm that I am returning the item and that the condition assessment 
                and photos accurately represent its current state.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5">
                <input type="checkbox" className="w-5 h-5 text-green-600" required />
              </div>
              <div className="text-sm">
                I understand that deposit processing will be based on the owner's verification 
                of the item condition and any damage assessment.
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={photos.length === 0 || isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>Processing Return...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Return
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              Once confirmed, the owner will verify the return and process your deposit accordingly.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}