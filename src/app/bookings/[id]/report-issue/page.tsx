'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { 
  AlertTriangle, 
  Camera, 
  Upload, 
  X, 
  FileText, 
  User, 
  Calendar,
  MapPin,
  DollarSign,
  ArrowLeft,
  Send,
  CheckCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: string;
  listing: {
    id: string;
    title: string;
    images: string[];
    daily_rate: number;
    category: string;
  };
  renter?: {
    id: string;
    full_name: string;
    email: string;
  };
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
  pickup_location?: string;
}

interface IssueReport {
  issue_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  photos: File[];
  occurred_at: string;
  location: string;
  financial_impact: boolean;
  estimated_cost: number;
  resolution_requested: string;
  contact_preference: 'email' | 'phone' | 'message';
}

const ISSUE_TYPES = [
  { value: 'damage', label: 'Item Damage', description: 'Physical damage to the rented item' },
  { value: 'missing_parts', label: 'Missing Parts/Accessories', description: 'Parts or accessories are missing' },
  { value: 'malfunction', label: 'Item Malfunction', description: 'Item not working as expected' },
  { value: 'cleanliness', label: 'Cleanliness Issues', description: 'Item was not clean or hygienic' },
  { value: 'late_pickup', label: 'Late Pickup/Return', description: 'Issues with pickup or return timing' },
  { value: 'communication', label: 'Communication Issues', description: 'Problems with host/renter communication' },
  { value: 'safety', label: 'Safety Concerns', description: 'Safety issues with the item or location' },
  { value: 'fraud', label: 'Fraud/Misrepresentation', description: 'Item not as described or fraudulent activity' },
  { value: 'other', label: 'Other', description: 'Other issues not covered above' }
];

const SEVERITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50', description: 'Minor inconvenience' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50', description: 'Moderate impact' },
  { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50', description: 'Significant impact' },
  { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-50', description: 'Urgent attention required' }
];

export default function ReportIssuePage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [report, setReport] = useState<IssueReport>({
    issue_type: '',
    severity: 'medium',
    title: '',
    description: '',
    photos: [],
    occurred_at: new Date().toISOString().slice(0, 16),
    location: '',
    financial_impact: false,
    estimated_cost: 0,
    resolution_requested: '',
    contact_preference: 'email'
  });

  const supabase = createClient();

  useEffect(() => {
    loadBookingData();
  }, [bookingId]);

  const loadBookingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Fetch real booking data
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          listing:listings(*),
          renter:profiles!bookings_renter_id_fkey(*),
          owner:profiles!bookings_owner_id_fkey(*)
        `)
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        console.error('Error fetching booking:', bookingError);
        toast.error('Failed to load booking details');
        return;
      }

      if (!bookingData) {
        toast.error('Booking not found');
        return;
      }

      // Check if user is part of this booking
      const isUserOwner = user.id === bookingData.owner?.id;
      const isUserRenter = user.id === bookingData.renter?.id;
      
      if (!isUserOwner && !isUserRenter) {
        toast.error('You are not authorized to report issues for this booking');
        router.push('/bookings');
        return;
      }

      // Transform the data to match our interface
      const transformedBooking: Booking = {
        id: bookingData.id,
        start_date: bookingData.start_date,
        end_date: bookingData.end_date,
        total_amount: bookingData.total_amount,
        status: bookingData.status,
        listing: {
          id: bookingData.listing.id,
          title: bookingData.listing.title,
          images: bookingData.listing.images || [],
          daily_rate: bookingData.listing.price_per_day,
          category: bookingData.listing.category
        },
        renter: bookingData.renter ? {
          id: bookingData.renter.id,
          full_name: bookingData.renter.full_name,
          email: bookingData.renter.email
        } : undefined,
        owner: bookingData.owner ? {
          id: bookingData.owner.id,
          full_name: bookingData.owner.full_name,
          email: bookingData.owner.email
        } : undefined,
        pickup_location: bookingData.pickup_location
      };

      setBooking(transformedBooking);
      setIsOwner(isUserOwner);
      setReport(prev => ({
        ...prev,
        location: transformedBooking.pickup_location || ''
      }));

    } catch (error) {
      console.error('Error loading booking:', error);
      toast.error('Failed to load booking details');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid image file`);
        return false;
      }
      if (!isValidSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB`);
        return false;
      }
      return true;
    });

    if (report.photos.length + validFiles.length > 10) {
      toast.error('Maximum 10 photos allowed');
      return;
    }

    setReport(prev => ({
      ...prev,
      photos: [...prev.photos, ...validFiles]
    }));
  };

  const removePhoto = (index: number) => {
    setReport(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!report.issue_type || !report.title || !report.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('booking_id', bookingId);
      formData.append('reporter_id', user.id);
      formData.append('reporter_role', isOwner ? 'owner' : 'renter');
      formData.append('issue_type', report.issue_type);
      formData.append('severity', report.severity);
      formData.append('title', report.title);
      formData.append('description', report.description);
      formData.append('occurred_at', report.occurred_at);
      formData.append('location', report.location);
      formData.append('financial_impact', report.financial_impact.toString());
      formData.append('estimated_cost', report.estimated_cost.toString());
      formData.append('resolution_requested', report.resolution_requested);
      formData.append('contact_preference', report.contact_preference);

      // Add photos
      report.photos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });

      const response = await fetch('/api/bookings/report-issue', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const result = await response.json();
      
      toast.success('Issue report submitted successfully');
      setSubmitted(true);
      
      // Optionally redirect after a delay
      setTimeout(() => {
        router.push(`/bookings/${bookingId}`);
      }, 3000);

    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="p-8 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h2>
            <p className="text-gray-600 mb-4">The booking you're trying to report an issue for could not be found.</p>
            <Button onClick={() => router.push('/bookings')}>
              Back to Bookings
            </Button>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (submitted) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Report Submitted Successfully</h2>
            <p className="text-gray-600 mb-6">
              Your issue report has been submitted and our admin team will review it shortly. 
              You'll receive updates via your preferred contact method.
            </p>
            <div className="space-y-3">
              <Button onClick={() => router.push(`/bookings/${bookingId}`)}>
                Back to Booking Details
              </Button>
              <Button variant="outline" onClick={() => router.push('/bookings')}>
                View All Bookings
              </Button>
            </div>
          </Card>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/bookings/${bookingId}`)}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Booking
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report an Issue</h1>
            <p className="text-gray-600">Report problems with your rental experience</p>
          </div>
        </div>

        {/* Booking Summary */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h3>
          <div className="flex items-start space-x-4">
            <div className="w-20 h-20 flex-shrink-0">
              <Image
                src={booking.listing.images[0]}
                alt={booking.listing.title}
                width={80}
                height={80}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{booking.listing.title}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  <span>${booking.total_amount}</span>
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  <span>{isOwner ? booking.renter?.full_name : booking.owner?.full_name}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="truncate">{booking.pickup_location}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Report Form */}
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Issue Type */}
            <div>
              <label htmlFor="issue_type" className="block text-sm font-medium text-gray-700 mb-2">
                Issue Type <span className="text-red-500">*</span>
              </label>
              <select
                id="issue_type"
                value={report.issue_type}
                onChange={(e) => setReport(prev => ({ ...prev, issue_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">Select an issue type...</option>
                {ISSUE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
                Severity Level <span className="text-red-500">*</span>
              </label>
              <select
                id="severity"
                value={report.severity}
                onChange={(e) => setReport(prev => ({ ...prev, severity: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                {SEVERITY_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label} - {level.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={report.title}
                onChange={(e) => setReport(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Brief summary of the issue"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={report.description}
                onChange={(e) => setReport(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Please provide a detailed description of the issue, including what happened, when it occurred, and any relevant circumstances..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* When did this occur */}
            <div>
              <label htmlFor="occurred_at" className="block text-sm font-medium text-gray-700 mb-2">
                When did this occur?
              </label>
              <input
                type="datetime-local"
                id="occurred_at"
                value={report.occurred_at}
                onChange={(e) => setReport(prev => ({ ...prev, occurred_at: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location where issue occurred
              </label>
              <input
                type="text"
                id="location"
                value={report.location}
                onChange={(e) => setReport(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Address or description of where the issue occurred"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Photos (Optional but recommended)
              </label>
              <p className="text-sm text-gray-500 mb-3">
                Upload photos of any damage, issues, or relevant evidence. Maximum 10 photos, 10MB each.
              </p>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Camera className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Upload photos
                      </span>
                      <input
                        id="photo-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      PNG, JPG, GIF up to 10MB each
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo Preview */}
              {report.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {report.photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Impact */}
            <div>
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  id="financial_impact"
                  checked={report.financial_impact}
                  onChange={(e) => setReport(prev => ({ ...prev, financial_impact: e.target.checked }))}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <label htmlFor="financial_impact" className="ml-2 text-sm font-medium text-gray-700">
                  This issue has financial impact (damage, replacement costs, etc.)
                </label>
              </div>
              
              {report.financial_impact && (
                <div className="ml-6">
                  <label htmlFor="estimated_cost" className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Cost (AUD)
                  </label>
                  <input
                    type="number"
                    id="estimated_cost"
                    value={report.estimated_cost}
                    onChange={(e) => setReport(prev => ({ ...prev, estimated_cost: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>

            {/* Resolution Requested */}
            <div>
              <label htmlFor="resolution_requested" className="block text-sm font-medium text-gray-700 mb-2">
                What resolution are you seeking?
              </label>
              <textarea
                id="resolution_requested"
                value={report.resolution_requested}
                onChange={(e) => setReport(prev => ({ ...prev, resolution_requested: e.target.value }))}
                placeholder="Describe what outcome you're hoping for (refund, replacement, repair, etc.)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Contact Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                How would you prefer to be contacted about this issue?
              </label>
              <div className="space-y-2">
                {[
                  { value: 'email', label: 'Email', description: 'We\'ll send updates to your registered email' },
                  { value: 'phone', label: 'Phone', description: 'We\'ll call you for urgent matters' },
                  { value: 'message', label: 'In-app Messages', description: 'We\'ll contact you through the platform messaging system' }
                ].map((option) => (
                  <label key={option.value} className="flex items-start">
                    <input
                      type="radio"
                      name="contact_preference"
                      value={option.value}
                      checked={report.contact_preference === option.value}
                      onChange={(e) => setReport(prev => ({ ...prev, contact_preference: e.target.value as any }))}
                      className="mt-1 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/bookings/${bookingId}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
