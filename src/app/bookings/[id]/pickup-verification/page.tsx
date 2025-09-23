'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  MapPin, 
  Clock, 
  X, 
  AlertCircle, 
  CheckCircle,
  Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';

interface PickupImage {
  id: string;
  url: string;
  uploadedAt: string;
  metadata?: {
    timestamp: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

interface BookingDetails {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  renter_id: string;
  owner_id: string;
  pickup_images: PickupImage[];
  pickup_confirmed_by_renter: boolean;
  pickup_confirmed_by_owner: boolean;
  listings: {
    id: string;
    title: string;
    images: string[];
  };
  renter_profile: {
    id: string;
    full_name: string;
    email: string;
  };
  owner_profile: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function PickupVerificationPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PickupImage[]>([]);

  const supabase = createClient();

  // Get current user
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Get booking details
  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking-details', bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          listings!inner(id, title, images),
          renter_profile:renter_id!inner(id, full_name, email),
          owner_profile:owner_id!inner(id, full_name, email)
        `)
        .eq('id', bookingId)
        .single();

      if (error) throw error;
      return data as BookingDetails;
    },
  });

  // Initialize photos from booking data
  useState(() => {
    if (booking?.pickup_images) {
      setPhotos(booking.pickup_images);
    }
  });

  const isRenter = user?.id === booking?.renter_id;
  const isOwner = user?.id === booking?.owner_id;

  // Get user's current location
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => {
          resolve(null);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  };

  // Handle photo upload
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || !booking || !user) return;

    const file = files[0];
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }

    const tempId = Date.now().toString();
    setUploadingImages(prev => [...prev, tempId]);

    try {
      // Get location
      const location = await getCurrentLocation();
      
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `pickup_${bookingId}_${user.id}_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('booking-images')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booking-images')
        .getPublicUrl(fileName);

      // Create new photo object
      const newPhoto: PickupImage = {
        id: tempId,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
        metadata: {
          timestamp: new Date().toISOString(),
          ...(location ? { location } : {})
        }
      };

      setPhotos(prev => [...prev, newPhoto]);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setUploadingImages(prev => prev.filter(id => id !== tempId));
    }
  };

  // Remove photo
  const removePhoto = async (photoId: string, url: string) => {
    try {
      // Extract filename from URL
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      // Delete from storage
      await supabase.storage
        .from('booking-images')
        .remove([fileName]);

      // Remove from local state
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (error) {
      console.error('Error removing photo:', error);
    }
  };

  // Submit verification
  const handleSubmitVerification = async () => {
    if (!booking || !user || photos.length === 0) {
      alert('Please take at least one photo before confirming pickup.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare photos data for database
      const updatedPickupImages = photos.map(photo => ({
        id: photo.id,
        url: photo.url,
        uploadedAt: photo.uploadedAt,
        metadata: photo.metadata
      }));

      // Update booking with pickup verification data
      const updateData: any = {
        pickup_images: updatedPickupImages,
        updated_at: new Date().toISOString(),
      };

      if (isRenter) {
        updateData.pickup_confirmed_by_renter = true;
        updateData.pickup_confirmed_at = new Date().toISOString();
      } else if (isOwner) {
        updateData.pickup_confirmed_by_owner = true;
        updateData.pickup_confirmed_at = new Date().toISOString();
      }

      // Check if both parties have now confirmed pickup
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('pickup_confirmed_by_renter, pickup_confirmed_by_owner')
        .eq('id', bookingId)
        .single();

      const renterConfirmed = isRenter ? true : (currentBooking?.pickup_confirmed_by_renter || false);
      const ownerConfirmed = isOwner ? true : (currentBooking?.pickup_confirmed_by_owner || false);
      const bothConfirmed = renterConfirmed && ownerConfirmed;
      
      // If both parties have confirmed, update status to 'in_progress'
      if (bothConfirmed) {
        updateData.status = 'in_progress';
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (updateError) {
        console.error('Error updating booking with pickup verification:', updateError);
        alert('Failed to save pickup verification. Please try again.');
        return;
      }

      // Handle email notifications
      if (bothConfirmed) {
        // Both parties confirmed - send completion emails to both
        try {
          // Import email service
          const { emailService } = await import('@/lib/email-service');
          
          // Send pickup confirmation email to renter
          await emailService.sendEmail({
            to: booking.renter_profile.email,
            subject: '🚀 Pickup Confirmed - Rental Started!',
            html: `
              <h2>Your rental has started!</h2>
              <p>Hi ${booking.renter_profile.full_name},</p>
              <p>Great news! The pickup for "${booking.listings.title}" has been confirmed by both parties.</p>
              <p><strong>Rental Details:</strong></p>
              <ul>
                <li>Item: ${booking.listings.title}</li>
                <li>Rental Period: ${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}</li>
                <li>Status: Active</li>
              </ul>
              <p>Enjoy your rental! Remember to return the item by ${new Date(booking.end_date).toLocaleDateString()}.</p>
              <p>Thank you for using Rent It Forward!</p>
            `,
            text: `Your rental of "${booking.listings.title}" has started! The pickup has been confirmed by both parties. Please return by ${new Date(booking.end_date).toLocaleDateString()}.`
          });

          // Send pickup confirmation email to owner
          await emailService.sendEmail({
            to: booking.owner_profile.email,
            subject: '✅ Item Pickup Confirmed',
            html: `
              <h2>Your item has been picked up!</h2>
              <p>Hi ${booking.owner_profile.full_name},</p>
              <p>Your item "${booking.listings.title}" has been successfully picked up by ${booking.renter_profile.full_name}.</p>
              <p><strong>Rental Details:</strong></p>
              <ul>
                <li>Item: ${booking.listings.title}</li>
                <li>Renter: ${booking.renter_profile.full_name}</li>
                <li>Rental Period: ${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}</li>
                <li>Status: Active</li>
              </ul>
              <p>The rental is now active. You'll be notified when the item is returned.</p>
              <p>Thank you for using Rent It Forward!</p>
            `,
            text: `Your item "${booking.listings.title}" has been picked up by ${booking.renter_profile.full_name}. The rental is now active.`
          });
        } catch (emailError) {
          console.log('❌ Email notifications failed but pickup verification saved:', emailError);
        }
      } else {
        // Only one party confirmed - send notification to other party
        try {
          const otherPartyEmail = isRenter ? booking.owner_profile.email : booking.renter_profile.email;
          const otherPartyName = isRenter ? booking.owner_profile.full_name : booking.renter_profile.full_name;
          const currentUserName = isRenter ? booking.renter_profile.full_name : booking.owner_profile.full_name;
          
          const { emailService } = await import('@/lib/email-service');
          await emailService.sendEmail({
            to: otherPartyEmail,
            subject: '📦 Pickup Verification Required',
            html: `
              <h2>Please verify pickup</h2>
              <p>Hi ${otherPartyName},</p>
              <p>${currentUserName} has confirmed pickup for "${booking.listings.title}". Please verify the pickup to start the rental period.</p>
              <p><a href="${process.env.NEXT_PUBLIC_WEB_URL}/bookings/${bookingId}/pickup-verification">Verify Pickup Now</a></p>
            `,
            text: `${currentUserName} has confirmed pickup for "${booking.listings.title}". Please verify the pickup at: ${process.env.NEXT_PUBLIC_WEB_URL}/bookings/${bookingId}/pickup-verification`
          });
        } catch (notificationError) {
          console.log('Notification failed but pickup verification saved:', notificationError);
        }
      }

      // Invalidate queries to refresh booking details
      queryClient.invalidateQueries({ queryKey: ['booking-details', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      
      // Navigate back to booking details
      router.push(`/bookings/${bookingId}`);
      
    } catch (error) {
      console.error('Error submitting verification:', error);
      alert('Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !booking || !user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isRenter && !isOwner) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <AlertCircle className="w-8 h-8 text-red-500 mr-3" />
              <p className="text-lg">Access denied. You don't have permission to verify this pickup.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only allow renter to take/delete photos, owner can only view and confirm
  const canModifyPhotos = isRenter;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/bookings/${bookingId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Pickup Verification</h1>
          <p className="text-gray-600">{booking.listings.title}</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex gap-2">
        <Badge variant={booking.pickup_confirmed_by_renter ? "default" : "secondary"}>
          {booking.pickup_confirmed_by_renter ? "Renter Confirmed" : "Awaiting Renter"}
        </Badge>
        <Badge variant={booking.pickup_confirmed_by_owner ? "default" : "secondary"}>
          {booking.pickup_confirmed_by_owner ? "Owner Confirmed" : "Awaiting Owner"}
        </Badge>
      </div>

      {/* Pickup Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Pickup Photos
          </CardTitle>
          <p className="text-sm text-gray-600">
            {canModifyPhotos 
              ? "Take photos to document the item condition at pickup" 
              : "Review the pickup photos taken by the renter"
            }
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Photo Upload (only for renter) */}
          {canModifyPhotos && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handlePhotoUpload(e.target.files)}
                accept="image/*"
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImages.length > 0}
                variant="outline"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadingImages.length > 0 ? 'Uploading...' : 'Add Photo'}
              </Button>
            </div>
          )}

          {/* Photos Grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={photo.url}
                      alt="Pickup photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                  
                  {/* Remove button (only for renter) */}
                  {canModifyPhotos && (
                    <button
                      onClick={() => removePhoto(photo.id, photo.url)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                  
                  {/* Photo metadata */}
                  {photo.metadata && (
                    <div className="mt-2 text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(photo.metadata.timestamp).toLocaleString()}
                      </div>
                      {photo.metadata.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Location recorded
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Uploading indicators */}
          {uploadingImages.map((id) => (
            <div key={id} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm text-blue-700">Uploading photo...</span>
            </div>
          ))}

          {photos.length === 0 && uploadingImages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No pickup photos yet</p>
              {canModifyPhotos && (
                <p className="text-sm">Add photos to document the pickup</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Permission info for owner */}
      {isOwner && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-blue-800">
                  <strong>Owner Note:</strong> Only the renter can add or remove photos. You can review the photos and confirm pickup once you've verified the item condition.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={handleSubmitVerification}
            disabled={isSubmitting || photos.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Confirming...' : 'Confirm Pickup'}
          </Button>
          
          {photos.length === 0 && (
            <p className="text-sm text-red-600 mt-2 text-center">
              Please add at least one photo before confirming pickup
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
