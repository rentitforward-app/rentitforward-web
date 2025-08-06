'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/pricing-constants';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  User, 
  CheckCircle, 
  XCircle, 
  MessageSquare,
  Shield,
  CreditCard,
  Star,
  AlertTriangle 
} from 'lucide-react';

export interface BookingRequest {
  id: string;
  renter_id: string;
  listing_id: string;
  start_date: string;
  end_date: string;
  duration: number;
  daily_rate: number;
  rental_fee: number;
  service_fee: number;
  insurance_fee: number;
  security_deposit: number;
  total_amount: number;
  points_used: number;
  credit_applied: number;
  include_insurance: boolean;
  status: string;
  notes?: string;
  approval_deadline: string;
  created_at: string;
  
  // Related data
  listings: {
    id: string;
    title: string;
    images: string[];
  };
  profiles: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
    rating?: number;
    verified: boolean;
  };
}

interface OwnerBookingRequestCardProps {
  booking: BookingRequest;
  onApprove: (bookingId: string, notes?: string) => Promise<void>;
  onReject: (bookingId: string, reason: string, notes?: string) => Promise<void>;
  isLoading?: boolean;
}

export function OwnerBookingRequestCard({ 
  booking, 
  onApprove, 
  onReject, 
  isLoading = false 
}: OwnerBookingRequestCardProps) {
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [autoApprove, setAutoApprove] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const deadline = new Date(booking.approval_deadline);
  const isExpired = new Date() > deadline;
  const timeRemaining = formatDistanceToNow(deadline, { addSuffix: true });

  const ownerPayout = booking.rental_fee * 0.8; // After 20% commission
  const platformCommission = booking.rental_fee * 0.2;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(booking.id, approvalNotes || undefined);
      setShowApprovalForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setIsSubmitting(true);
    try {
      await onReject(booking.id, rejectionReason, rejectionNotes || undefined);
      setShowRejectionForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`w-full ${isExpired ? 'border-red-200 bg-red-50' : 'border-green-200'}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold">
              {booking.listings.title}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant={booking.status === 'pending' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {booking.status.replace('_', ' ')}
              </Badge>
              {isExpired && (
                <Badge variant="destructive">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Expired
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(ownerPayout)}
            </div>
            <div className="text-sm text-gray-500">Your payout</div>
            <div className="text-xs text-gray-400">
              (after 20% commission)
            </div>
          </div>
        </div>

        {/* Urgency indicator */}
        <Alert className={`mt-3 ${isExpired ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {isExpired 
              ? `Request expired ${timeRemaining}`
              : `Respond ${timeRemaining} to avoid expiration`
            }
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Renter Information */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
              {booking.profiles.avatar_url ? (
                <img 
                  src={booking.profiles.avatar_url} 
                  alt={booking.profiles.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div>
              <div className="font-medium">{booking.profiles.name}</div>
              <div className="text-sm text-gray-500">{booking.profiles.email}</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {booking.profiles.verified && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
            {booking.profiles.rating && (
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-sm">{booking.profiles.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Booking Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Check-in:</span>
              <span>{format(new Date(booking.start_date), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Check-out:</span>
              <span>{format(new Date(booking.end_date), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Duration:</span>
              <span>{booking.duration} day{booking.duration !== 1 ? 's' : ''}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Daily rate:</span>
              <span>{formatPrice(booking.daily_rate)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Insurance:</span>
              <span>{booking.include_insurance ? formatPrice(booking.insurance_fee) : 'None'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="font-medium">Total paid:</span>
              <span className="font-semibold">{formatPrice(booking.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Special Notes */}
        {booking.notes && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-800">Renter's note:</div>
                <div className="text-sm text-blue-700">{booking.notes}</div>
              </div>
            </div>
          </div>
        )}

        {/* Points/Credits Used */}
        {booking.points_used > 0 && (
          <div className="flex items-center justify-between text-sm text-green-600">
            <span>Points credit applied:</span>
            <span className="font-medium">-{formatPrice(booking.credit_applied)} ({booking.points_used} points)</span>
          </div>
        )}

        <Separator />

        {/* Pricing Breakdown */}
        <div className="space-y-2">
          <h4 className="font-medium">Your earnings breakdown:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Rental fee ({booking.duration} days × {formatPrice(booking.daily_rate)}):</span>
              <span>{formatPrice(booking.rental_fee)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Platform commission (20%):</span>
              <span>-{formatPrice(platformCommission)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold text-green-600">
              <span>Your payout:</span>
              <span>{formatPrice(ownerPayout)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {!isExpired && booking.status === 'pending_payment' && (
          <div className="flex gap-3 pt-4">
            {!showApprovalForm && !showRejectionForm && (
              <>
                <Button 
                  onClick={() => setShowApprovalForm(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Booking
                </Button>
                <Button 
                  onClick={() => setShowRejectionForm(true)}
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                  disabled={isLoading}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </>
            )}
          </div>
        )}

        {/* Approval Form */}
        {showApprovalForm && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-green-600">Approve this booking</h4>
            
            <div className="space-y-2">
              <Label htmlFor="approval-notes">Optional notes for the renter:</Label>
              <textarea
                id="approval-notes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="e.g., Please arrive between 2-4 PM for pickup..."
                className="w-full p-2 border rounded-lg text-sm"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="auto-approve"
                checked={autoApprove}
                onCheckedChange={setAutoApprove}
              />
              <Label htmlFor="auto-approve" className="text-sm">
                Auto-approve future bookings from this renter
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Approval'}
              </Button>
              <Button
                onClick={() => setShowApprovalForm(false)}
                variant="outline"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Rejection Form */}
        {showRejectionForm && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium text-red-600">Decline this booking</h4>
            
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Reason for declining (required):</Label>
              <select
                id="rejection-reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
                required
              >
                <option value="">Select a reason...</option>
                <option value="dates_unavailable">Dates no longer available</option>
                <option value="maintenance_needed">Item needs maintenance</option>
                <option value="personal_use">Need item for personal use</option>
                <option value="renter_concerns">Concerns about renter</option>
                <option value="pricing_issue">Pricing/payment concerns</option>
                <option value="other">Other reason</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rejection-notes">Additional notes (optional):</Label>
              <textarea
                id="rejection-notes"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Provide more details about why you're declining..."
                className="w-full p-2 border rounded-lg text-sm"
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason}
                variant="destructive"
              >
                {isSubmitting ? 'Processing...' : 'Confirm Decline'}
              </Button>
              <Button
                onClick={() => setShowRejectionForm(false)}
                variant="outline"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}