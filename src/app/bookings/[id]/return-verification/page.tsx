'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  MapPin, 
  Clock, 
  X, 
  AlertCircle, 
  CheckCircle,
  AlertTriangle,
  Package,
  Flag,
  Compare
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';

interface ReturnImage {
  id: string;
  url: string;
  uploadedAt: string;
  uploaded_by?: string; // User ID who uploaded this photo
  metadata?: {
    timestamp: string;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
}

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
  return_images: ReturnImage[];
  return_confirmed_by_renter: boolean;
  return_confirmed_by_owner: boolean;
  damage_report?: string;
  damage_reported_by?: string;
  damage_reported_at?: string;
  owner_notes?: string;
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

export default function ReturnVerificationPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ReturnImage[]>([]);
  const [showDamageReport, setShowDamageReport] = useState(false);
  const [damageReport, setDamageReport] = useState('');
  const [ownerNotes, setOwnerNotes] = useState('');

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

  // Initialize photos and damage report from booking data
  useEffect(() => {
    if (booking?.return_images) {
      setPhotos(booking.return_images);
    }
    if (booking?.damage_report) {
      setDamageReport(booking.damage_report);
      setShowDamageReport(true);
    }
    if (booking?.owner_notes) {
      setOwnerNotes(booking.owner_notes);
    }
  }, [booking]);

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
      const fileName = `return_${bookingId}_${user.id}_${Date.now()}.${fileExt}`;

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
      const newPhoto: ReturnImage = {
        id: tempId,
        url: publicUrl,
        uploadedAt: new Date().toISOString(),
        uploaded_by: user.id, // Track who uploaded this photo
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

  // Remove photo (only allow removal of own photos)
  const removePhoto = async (photoId: string, url: string) => {
    if (!user) return;
    
    try {
      // Find the photo to check ownership
      const photoToRemove = photos.find(p => p.id === photoId);
      if (!photoToRemove) return;
      
      // Only allow deletion of photos uploaded by current user
      // For backward compatibility: if uploaded_by is missing, assume it belongs to renter
      const photoOwner = photoToRemove.uploaded_by || booking?.renter_id;
      
      if (photoOwner !== user.id) {
        const ownerName = photoOwner === booking?.renter_id ? 'renter' : 'owner';
        alert(`You can only delete photos you uploaded. This photo was uploaded by the ${ownerName}.`);
        return;
      }
      
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
    if (!booking || !user || photos.length === 0) {
      alert('Please take at least one photo before confirming return.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare photos data for database
      const updatedReturnImages = photos.map(photo => ({
        id: photo.id,
        url: photo.url,
        uploadedAt: photo.uploadedAt,
        metadata: photo.metadata
      }));

      // Update booking with return verification data
      const updateData: any = {
        return_images: updatedReturnImages,
        updated_at: new Date().toISOString(),
      };

      if (isRenter) {
        updateData.return_confirmed_by_renter = true;
        updateData.return_confirmed_at = new Date().toISOString();
      } else if (isOwner) {
        updateData.return_confirmed_by_owner = true;
        updateData.return_confirmed_at = new Date().toISOString();
      }

      // Add damage report if provided (only renter can create/edit damage report)
      if (isRenter && damageReport.trim()) {
        updateData.damage_report = damageReport.trim();
        updateData.damage_reported_by = user.id;
        updateData.damage_reported_at = new Date().toISOString();
      }
      
      // Add owner notes if provided (only owner can add notes)
      if (isOwner && ownerNotes.trim()) {
        updateData.owner_notes = ownerNotes.trim();
      }

      // Check if both parties have now confirmed return
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('return_confirmed_by_renter, return_confirmed_by_owner')
        .eq('id', bookingId)
        .single();

      const renterConfirmed = isRenter ? true : (currentBooking?.return_confirmed_by_renter || false);
      const ownerConfirmed = isOwner ? true : (currentBooking?.return_confirmed_by_owner || false);
      const bothConfirmed = renterConfirmed && ownerConfirmed;
      
      // If both parties have confirmed, update status to 'completed'
      if (bothConfirmed) {
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (updateError) {
        console.error('Error updating booking with return verification:', updateError);
        alert('Failed to save return verification. Please try again.');
        return;
      }

      // Handle email notifications and admin notifications
      if (bothConfirmed) {
        // Both parties confirmed - send completion emails to both
        try {
          const { emailService } = await import('@/lib/email-service');
          
          // Send completion email to renter
          await emailService.sendEmail({
            to: booking.renter_profile.email,
            subject: '🎉 Rental Completed Successfully!',
            html: `
              <h2>Your rental has been completed!</h2>
              <p>Hi ${booking.renter_profile.full_name},</p>
              <p>Great news! Your rental of "${booking.listings.title}" has been successfully completed.</p>
              <p><strong>Rental Details:</strong></p>
              <ul>
                <li>Item: ${booking.listings.title}</li>
                <li>Rental Period: ${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}</li>
                <li>Status: Completed</li>
              </ul>
              ${damageReport ? '<p><strong>Note:</strong> A damage report was submitted and is under review.</p>' : '<p>The item was returned in good condition. Your deposit will be refunded shortly.</p>'}
              <p>Thank you for using Rent It Forward!</p>
            `,
            text: `Your rental of "${booking.listings.title}" has been completed successfully. ${damageReport ? 'A damage report is under review.' : 'Your deposit will be refunded shortly.'}`
          });

          // Send completion email to owner
          await emailService.sendEmail({
            to: booking.owner_profile.email,
            subject: '📦 Your Item Has Been Returned',
            html: `
              <h2>Rental completed successfully!</h2>
              <p>Hi ${booking.owner_profile.full_name},</p>
              <p>Your item "${booking.listings.title}" has been successfully returned by ${booking.renter_profile.full_name}.</p>
              <p><strong>Rental Details:</strong></p>
              <ul>
                <li>Item: ${booking.listings.title}</li>
                <li>Renter: ${booking.renter_profile.full_name}</li>
                <li>Rental Period: ${new Date(booking.start_date).toLocaleDateString()} - ${new Date(booking.end_date).toLocaleDateString()}</li>
                <li>Status: Completed</li>
              </ul>
              ${damageReport ? '<p><strong>Note:</strong> A damage report was submitted and requires your review.</p>' : '<p>The item was returned in good condition.</p>'}
              <p>Your rental payment will be processed shortly.</p>
              <p>Thank you for using Rent It Forward!</p>
            `,
            text: `Your item "${booking.listings.title}" has been successfully returned. ${damageReport ? 'A damage report requires review.' : 'The rental completed without issues.'}`
          });

          // Send admin notifications for payment release
          const currentUserName = isRenter ? booking.renter_profile.full_name : booking.owner_profile.full_name;
          
          if (damageReport) {
            // Admin notification for damage report requiring review
            await supabase
              .from('app_notifications')
              .insert({
                user_id: 'admin',
                type: 'damage_report_submitted',
                title: 'Damage Report Requires Review',
                message: `Damage reported for "${booking.listings.title}" rental (${bookingId}). Review required before payment release.`,
                action_url: `/admin/bookings/${bookingId}`,
                data: {
                  booking_id: bookingId,
                  listing_title: booking.listings.title,
                  reporter_name: currentUserName,
                  damage_description: damageReport,
                  requires_manual_review: true,
                },
                priority: 9,
              });
          } else {
            // Admin notification for successful completion - ready for automatic payment release
            await supabase
              .from('app_notifications')
              .insert({
                user_id: 'admin',
                type: 'rental_completed_successfully',
                title: 'Rental Completed - Payment Release',
                message: `"${booking.listings.title}" rental completed successfully without issues. Ready for payment release to owner.`,
                action_url: `/admin/bookings/${bookingId}`,
                data: {
                  booking_id: bookingId,
                  listing_title: booking.listings.title,
                  owner_id: booking.owner_id,
                  renter_id: booking.renter_id,
                  requires_manual_review: false,
                  ready_for_payment_release: true,
                },
                priority: 7,
              });
          }
          
          console.log('✅ Completion emails and admin notifications sent');
        } catch (emailError) {
          console.log('❌ Email/admin notifications failed but return verification saved:', emailError);
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
            subject: '📦 Return Verification Required',
            html: `
              <h2>Please verify return</h2>
              <p>Hi ${otherPartyName},</p>
              <p>${currentUserName} has confirmed return for "${booking.listings.title}". Please verify the return to complete the rental.</p>
              <p><a href="${process.env.NEXT_PUBLIC_WEB_URL}/bookings/${bookingId}/return-verification">Verify Return Now</a></p>
            `,
            text: `${currentUserName} has confirmed return for "${booking.listings.title}". Please verify the return at: ${process.env.NEXT_PUBLIC_WEB_URL}/bookings/${bookingId}/return-verification`
          });
        } catch (notificationError) {
          console.log('Notification failed but return verification saved:', notificationError);
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
      <div className="max-w-4xl mx-auto p-6">
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
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <AlertCircle className="w-8 h-8 text-red-500 mr-3" />
              <p className="text-lg">Access denied. You don't have permission to verify this return.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/bookings/${bookingId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Return Verification</h1>
          <p className="text-gray-600">{booking.listings.title}</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex gap-2">
        <Badge variant={booking.return_confirmed_by_renter ? "default" : "secondary"}>
          {booking.return_confirmed_by_renter ? "Renter Confirmed" : "Awaiting Renter"}
        </Badge>
        <Badge variant={booking.return_confirmed_by_owner ? "default" : "secondary"}>
          {booking.return_confirmed_by_owner ? "Owner Confirmed" : "Awaiting Owner"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pickup Photos (Reference) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Pickup Photos (Reference)
            </CardTitle>
            <p className="text-sm text-gray-600">
              Original condition at pickup
            </p>
          </CardHeader>
          <CardContent>
            {booking.pickup_images && booking.pickup_images.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {booking.pickup_images.map((photo) => (
                  <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={photo.url}
                      alt="Pickup photo"
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pickup photos available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Return Photos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Return Photos
            </CardTitle>
            <p className="text-sm text-gray-600">
              Document the item condition at return
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Photo Upload */}
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

            {/* Photos Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={photo.url}
                        alt="Return photo"
                        fill
                        className="object-cover"
                      />
                    </div>
                    
                    {/* Remove button - only show for photos uploaded by current user */}
                    {(() => {
                      // For backward compatibility: if uploaded_by is missing, assume it belongs to renter
                      const photoOwner = photo.uploaded_by || booking?.renter_id;
                      return photoOwner === user?.id;
                    })() && (
                      <button
                        onClick={() => removePhoto(photo.id, photo.url)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    
                    {/* Owner indicator */}
                    <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                      {(() => {
                        // For backward compatibility: if uploaded_by is missing, assume it belongs to renter
                        const photoOwner = photo.uploaded_by || booking?.renter_id;
                        return photoOwner === booking?.renter_id ? 'Renter' : 'Owner';
                      })()}
                    </div>
                    
                    {/* Photo metadata */}
                    {photo.metadata && (
                      <div className="mt-1 text-xs text-gray-500 space-y-1">
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
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No return photos yet</p>
                <p className="text-xs">Add photos to document the return</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Damage Report Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Damage Report
          </CardTitle>
          <p className="text-sm text-gray-600">
            {isRenter ? 'Report any damage or issues with the item (optional)' : 'Review damage report and add your notes (optional)'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Damage Report (if any) */}
          {booking?.damage_report && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-800">Damage Report by Renter</span>
              </div>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800 whitespace-pre-wrap">{booking.damage_report}</p>
                {booking.damage_reported_at && (
                  <p className="text-xs text-orange-600 mt-2">
                    Reported on {new Date(booking.damage_reported_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Renter: Create new damage report */}
          {isRenter && (
            <div className="flex items-center gap-2">
              <Button
                variant={showDamageReport ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDamageReport(!showDamageReport)}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {showDamageReport ? 'Hide' : booking?.damage_report ? 'Edit' : 'Report'} Damage
              </Button>
              {showDamageReport && (
                <span className="text-sm text-orange-600">
                  Please describe any damage or issues found
                </span>
              )}
            </div>
          )}

          {/* Renter: Damage report form */}
          {isRenter && showDamageReport && (
            <div className="space-y-3">
              <Textarea
                value={damageReport}
                onChange={(e) => setDamageReport(e.target.value)}
                placeholder="Describe any damage, issues, or missing items found during return inspection..."
                rows={4}
                className="w-full"
              />
              
              {damageReport.length > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-orange-800">
                      <p className="font-medium">Damage Report Will Be Submitted</p>
                      <p>This report will be reviewed by our team before processing the final payment.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Owner: Add notes to damage report */}
          {isOwner && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDamageReport(!showDamageReport)}
                >
                  <Package className="w-4 h-4 mr-2" />
                  {showDamageReport ? 'Hide' : 'Add'} Owner Notes
                </Button>
              </div>

              {showDamageReport && (
                <div className="space-y-3">
                  <Textarea
                    value={ownerNotes}
                    onChange={(e) => setOwnerNotes(e.target.value)}
                    placeholder="Add your notes about the item condition, damage assessment, or any other observations..."
                    rows={4}
                    className="w-full"
                  />
                  
                  {ownerNotes.length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Package className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-800">
                          <p className="font-medium">Owner Notes Will Be Saved</p>
                          <p>Your notes will be added to the return verification record.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Show existing owner notes */}
          {booking?.owner_notes && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Owner Notes</span>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{booking.owner_notes}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            onClick={handleSubmitVerification}
            disabled={isSubmitting || photos.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Confirming...' : 'Confirm Return'}
          </Button>
          
          {photos.length === 0 && (
            <p className="text-sm text-red-600 mt-2 text-center">
              Please add at least one photo before confirming return
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
