'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
import { isUserAdmin } from '@/lib/admin';

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
  useEffect(() => {
    if (booking?.pickup_images) {
      setPhotos(booking.pickup_images);
    }
  }, [booking]);

  const isRenter = user?.id === booking?.renter_id;
  const isOwner = user?.id === booking?.owner_id;
  const isAdmin = isUserAdmin(user);

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
        .from('booking-confirmations')
        .upload(fileName, file);

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booking-confirmations')
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
        .from('booking-confirmations')
        .remove([fileName]);

      // Remove from local state
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (error) {
      console.error('Error removing photo:', error);
    }
  };

  // Submit verification
  const handleSubmitVerification = async () => {
    if (!booking || !user) {
      alert('Missing booking or user information.');
      return;
    }

    // Only require photos for renter, owner can confirm without taking photos
    if (isRenter && photos.length < 3) {
      alert('Please take at least 3 verification photos to continue.');
      return;
    }

    if (photos.length > 8) {
      alert('Please limit to 8 photos maximum.');
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

  if (!isRenter && !isOwner && !isAdmin) {
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
  // Admin override: allow photo modification for testing
  const canModifyPhotos = isRenter || isAdmin;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center">
          <Link href={`/bookings/${bookingId}`} className="mr-4">
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Pickup Verification</h1>
        </div>

        <div className="p-6 space-y-6">
          {/* Booking Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{booking.listings.title}</h2>
            <p className="text-sm text-gray-600">
              {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
            </p>
          </div>

          {/* Instructions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-green-600 p-6">
            <div className="flex items-center mb-4">
              <Camera className="w-6 h-6 text-green-600 mr-3" />
              <h3 className="text-base font-semibold text-green-600">Verification Instructions</h3>
            </div>
            <div className="text-sm text-gray-600 leading-relaxed space-y-1">
              <p>1. Take 3-8 clear photos of the item</p>
              <p>2. Include close-ups of any existing damage or wear</p>
              <p>3. Match the angles from the listing photos when possible</p>
              <p>4. Photos are automatically timestamped and location-tagged</p>
              <p>5. Both parties must complete verification to confirm pickup</p>
            </div>
          </div>

          {/* Reference Photos Section */}
          {booking.listings.images && booking.listings.images.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Reference Photos (From Listing)</h3>
              <div className="flex space-x-3 overflow-x-auto pb-2">
                {booking.listings.images.map((imageUrl, index) => (
                  <div key={index} className="flex-shrink-0">
                    <Image
                      src={imageUrl}
                      alt={`Listing photo ${index + 1}`}
                      width={120}
                      height={120}
                      className="rounded-lg object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Photo Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-semibold text-gray-900">Verification Photos ({photos.length}/8)</h3>
              {/* Only show add button for renter */}
              {canModifyPhotos && (
                <>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImages.length > 0 || photos.length >= 8}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm font-semibold"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo
                  </Button>
                </>
              )}
              {/* Show info for owner */}
              {isOwner && (
                <div className="bg-gray-100 px-3 py-2 rounded-lg">
                  <p className="text-sm text-gray-600 italic">Photos taken by renter during pickup</p>
                </div>
              )}
            </div>
            {/* Photos Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {photos.map((photo, index) => (
                  <div key={`pickup-photo-${photo.id}-${index}`} className="relative">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={photo.url}
                        alt="Pickup verification photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                    
                    {/* Remove button (only for renter) */}
                    {canModifyPhotos && (
                      <button
                        onClick={() => removePhoto(photo.id, photo.url)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    
                    {/* Photo info */}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {photo.metadata ? new Date(photo.metadata.timestamp).toLocaleTimeString() : new Date(photo.uploadedAt).toLocaleTimeString()}
                      </span>
                      {photo.metadata?.location && (
                        <MapPin className="w-3 h-3 text-green-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Uploading indicators */}
            {uploadingImages.map((id) => (
              <div key={id} className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg mb-4">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-blue-700">Uploading photo...</span>
              </div>
            ))}

            {/* Empty state */}
            {photos.length === 0 && uploadingImages.length === 0 && (
              <div className="text-center py-12">
                <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No photos taken yet</p>
                <p className="text-gray-400 text-sm mt-1">Take at least 3 verification photos</p>
              </div>
            )}
          </div>

          {/* Submit Button Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <Button 
              onClick={handleSubmitVerification}
              disabled={isSubmitting || (isRenter && photos.length < 3)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {isRenter ? `Confirm Pickup (${photos.length}/8 photos)` : 'Confirm Pickup'}
                </>
              )}
            </Button>
            
            <p className="text-sm text-gray-600 mt-3 text-center">
              This will confirm that you have verified the item condition at pickup.
              {isRenter && photos.length < 3 && ' You need at least 3 photos to continue.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
