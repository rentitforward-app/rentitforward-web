'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Camera, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  CheckCircle,
  Upload,
  X,
  MessageSquare,
  Package,
  Shield,
  Info
} from 'lucide-react';

interface PickupConfirmationProps {
  bookingId: string;
  listing: {
    id: string;
    title: string;
    images: string[];
    owner: {
      name: string;
      phone: string;
      avatar: string;
    };
    pickupLocation: {
      address: string;
      instructions: string;
    };
  };
  onConfirm: (photos: File[], notes: string) => void;
}

export function PickupConfirmation({ bookingId, listing, onConfirm }: PickupConfirmationProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [notes, setNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

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

  const handleConfirmPickup = async () => {
    if (photos.length === 0) {
      alert('Please take at least one photo of the item condition');
      return;
    }

    setIsConfirming(true);
    try {
      await onConfirm(photos, notes);
    } catch (error) {
      console.error('Failed to confirm pickup:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Pickup Confirmation
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
              <Badge className="mt-2 bg-blue-100 text-blue-600">Ready for Pickup</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pickup Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Pickup Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="font-medium">Address</div>
              <div className="text-gray-600">{listing.pickupLocation.address}</div>
            </div>
            
            <div>
              <div className="font-medium">Instructions</div>
              <div className="text-gray-600 text-sm">
                {listing.pickupLocation.instructions}
              </div>
            </div>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Pickup window: 9:00 AM - 7:00 PM. Please coordinate with the owner for exact timing.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Owner Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <div className="font-medium">{listing.owner.name}</div>
                <div className="text-sm text-gray-600">Owner</div>
              </div>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Phone className="w-4 h-4 mr-2" />
                Call {listing.owner.name}
              </Button>
              
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                For your safety, keep all communication within the platform until pickup is complete.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Photo Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Photo Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Take photos of the item's condition during pickup. This protects both you and the owner 
              and helps resolve any disputes about the item's condition.
            </AlertDescription>
          </Alert>

          {/* Photo Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
            {photos.length === 0 ? (
              <div className="text-center">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="font-medium mb-2">Document Item Condition</div>
                <div className="text-sm text-gray-600 mb-4">
                  Take photos showing the item's current condition. Include any existing wear or damage.
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                />
                <label htmlFor="photo-upload">
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
                        alt={`Pickup photo ${index + 1}`}
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
                    <label htmlFor="photo-upload-more" className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
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
                  id="photo-upload-more"
                />
                
                <div className="text-sm text-gray-600">
                  {photos.length} of 6 photos uploaded
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note any specific conditions, agreements, or concerns..."
              className="w-full p-3 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Confirmation */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5">
                <input type="checkbox" className="w-5 h-5 text-green-600" required />
              </div>
              <div className="text-sm">
                I confirm that I have received the item in the condition documented above, 
                and I understand my responsibility to return it in the same condition.
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 mt-0.5">
                <input type="checkbox" className="w-5 h-5 text-green-600" required />
              </div>
              <div className="text-sm">
                I agree to the rental terms and conditions, including liability for damage 
                beyond normal wear and tear.
              </div>
            </div>

            <Button
              onClick={handleConfirmPickup}
              disabled={photos.length === 0 || isConfirming}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isConfirming ? (
                <>Confirming Pickup...</>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirm Pickup Complete
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 text-center">
              By confirming pickup, your rental period officially begins and payment will be processed.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}