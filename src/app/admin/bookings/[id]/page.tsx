'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, DollarSign, User, MapPin, Phone, Mail, AlertTriangle, CheckCircle, XCircle, Edit, Trash2, Ban, Shield } from 'lucide-react';
import { createClient } from '../../../../lib/supabase/client';
import { useAdmin } from '../../../../hooks/use-admin';
import { Card } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { format } from 'date-fns';

interface BookingDetails {
  id: string;
  item_title: string;
  item_description?: string;
  item_category?: string;
  renter_id: string;
  renter_name: string;
  renter_email: string;
  renter_phone?: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  owner_phone?: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  base_amount?: number;
  platform_fee?: number;
  platform_fee_rate?: number;
  owner_amount?: number;
  insurance_amount?: number;
  deposit_amount?: number;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'refunded';
  payment_intent_id?: string;
  stripe_charge_id?: string;
  receipt_number?: string;
  payment_method?: string;
  created_at: string;
  updated_at: string;
  special_requests?: string;
  cancellation_reason?: string;
  refund_amount?: number;
  refund_reason?: string;
  refund_date?: string;
}

export default function AdminBookingDetails() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'payment' | 'communication' | 'history'>('overview');
  
  const supabase = createClient();
  const { isAdmin, loading: adminLoading } = useAdmin();

  useEffect(() => {
    if (adminLoading) return;
    if (!isAdmin) return;
    loadBookingDetails();
  }, [isAdmin, adminLoading, bookingId]);

  const loadBookingDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          listings:listing_id (
            title,
            description,
            category,
            location
          ),
          renter:renter_id (
            full_name,
            email,
            phone_number
          ),
          owner:owner_id (
            full_name,
            email,
            phone_number
          )
        `)
        .eq('id', bookingId)
        .single();

      if (error) {
        console.error('Error loading booking details:', error);
        return;
      }

      const bookingDetails: BookingDetails = {
        id: data.id,
        item_title: data.listings?.title || 'Unknown Item',
        item_description: data.listings?.description,
        item_category: data.listings?.category,
        renter_id: data.renter_id,
        renter_name: data.renter?.full_name || 'Unknown Renter',
        renter_email: data.renter?.email || '',
        renter_phone: data.renter?.phone_number,
        owner_id: data.owner_id,
        owner_name: data.owner?.full_name || 'Unknown Owner',
        owner_email: data.owner?.email || '',
        owner_phone: data.owner?.phone_number,
        start_date: data.start_date,
        end_date: data.end_date,
        total_amount: parseFloat(data.total_amount || '0'),
        base_amount: data.base_amount ? parseFloat(data.base_amount) : undefined,
        platform_fee: data.platform_fee ? parseFloat(data.platform_fee) : undefined,
        platform_fee_rate: data.platform_fee_rate ? parseFloat(data.platform_fee_rate) : undefined,
        owner_amount: data.owner_amount ? parseFloat(data.owner_amount) : undefined,
        insurance_amount: data.insurance_amount ? parseFloat(data.insurance_amount) : undefined,
        deposit_amount: data.deposit_amount ? parseFloat(data.deposit_amount) : undefined,
        status: data.status,
        payment_status: data.payment_status === 'paid' || data.payment_status === 'paid_awaiting_release' ? 'paid' : 
                       data.payment_status === 'refunded' ? 'refunded' : 'pending',
        payment_intent_id: data.payment_intent_id,
        stripe_charge_id: data.stripe_charge_id,
        receipt_number: data.receipt_number,
        payment_method: data.payment_method,
        created_at: data.created_at,
        updated_at: data.updated_at,
        special_requests: data.special_requests,
        cancellation_reason: data.cancellation_reason,
        refund_amount: data.refund_amount ? parseFloat(data.refund_amount) : undefined,
        refund_reason: data.refund_reason,
        refund_date: data.refund_date,
      };

      setBooking(bookingDetails);
    } catch (error) {
      console.error('Error loading booking details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      refunded: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (adminLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin permissions to access this page.</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
          <p className="text-gray-600">The booking you're looking for doesn't exist.</p>
          <Button 
            onClick={() => router.push('/admin/bookings')}
            className="mt-4"
          >
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push('/admin/bookings')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bookings
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-gray-600">ID: {booking.id}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Edit Booking
          </Button>
          <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
            <Trash2 className="w-4 h-4 mr-2" />
            Cancel Booking
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Booking Status</p>
              <div className="mt-2">{getStatusBadge(booking.status)}</div>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Payment Status</p>
              <div className="mt-2">{getPaymentStatusBadge(booking.payment_status)}</div>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {calculateDuration(booking.start_date, booking.end_date)} days
              </p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(booking.total_amount)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-600" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Calendar },
            { id: 'payment', label: 'Payment', icon: DollarSign },
            { id: 'communication', label: 'Communication', icon: User },
            { id: 'history', label: 'History', icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Item</label>
                  <p className="text-gray-900">{booking.item_title}</p>
                  {booking.item_description && (
                    <p className="text-sm text-gray-600 mt-1">{booking.item_description}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="text-gray-900">{booking.item_category || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Dates</label>
                  <p className="text-gray-900">
                    {format(new Date(booking.start_date), 'MMM d, yyyy')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Special Requests</label>
                  <p className="text-gray-900">{booking.special_requests || 'None'}</p>
                </div>
              </div>
            </Card>

            {/* Parties Information */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Parties</h3>
              <div className="space-y-6">
                {/* Renter */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Renter</h4>
                  <div 
                    className="space-y-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => router.push(`/admin/users/${booking.renter_id}`)}
                  >
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900 font-medium">{booking.renter_name}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{booking.renter_email}</span>
                    </div>
                    {booking.renter_phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{booking.renter_phone}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      Click to view user details
                    </div>
                  </div>
                </div>

                {/* Owner */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Owner</h4>
                  <div 
                    className="space-y-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => router.push(`/admin/users/${booking.owner_id}`)}
                  >
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900 font-medium">{booking.owner_name}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-gray-900">{booking.owner_email}</span>
                    </div>
                    {booking.owner_phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-900">{booking.owner_phone}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      Click to view user details
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="space-y-6">
            {/* Payment Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Amount</label>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(booking.total_amount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Status</label>
                    <div className="mt-1">{getPaymentStatusBadge(booking.payment_status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Duration</label>
                    <p className="text-gray-900">{calculateDuration(booking.start_date, booking.end_date)} days</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {booking.refund_amount && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Refund Amount</label>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(booking.refund_amount)}</p>
                    </div>
                  )}
                  {booking.cancellation_reason && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cancellation Reason</label>
                      <p className="text-gray-900">{booking.cancellation_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Payment Breakdown */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Breakdown</h3>
              <div className="space-y-4">
                {/* Base Amount */}
                {booking.base_amount && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Base Rental Amount</span>
                    <span className="font-medium">{formatCurrency(booking.base_amount)}</span>
                  </div>
                )}

                {/* Platform Fee */}
                {booking.platform_fee && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <div>
                      <span className="text-gray-600">Platform Fee</span>
                      {booking.platform_fee_rate && (
                        <span className="text-xs text-gray-500 ml-2">({(booking.platform_fee_rate * 100).toFixed(1)}%)</span>
                      )}
                    </div>
                    <span className="font-medium text-red-600">-{formatCurrency(booking.platform_fee)}</span>
                  </div>
                )}

                {/* Insurance */}
                {booking.insurance_amount && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Insurance</span>
                    <span className="font-medium">{formatCurrency(booking.insurance_amount)}</span>
                  </div>
                )}

                {/* Deposit */}
                {booking.deposit_amount && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Security Deposit</span>
                    <span className="font-medium">{formatCurrency(booking.deposit_amount)}</span>
                  </div>
                )}

                {/* Owner Amount */}
                {booking.owner_amount && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-600">Owner Payout</span>
                    <span className="font-medium text-green-600">{formatCurrency(booking.owner_amount)}</span>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center py-3 border-t-2 border-gray-200">
                  <span className="text-lg font-semibold text-gray-900">Total Paid by Renter</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(booking.total_amount)}</span>
                </div>
              </div>
            </Card>

            {/* Stripe Payment Details */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Processing Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {booking.payment_intent_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Payment Intent ID</label>
                      <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                        {booking.payment_intent_id}
                      </p>
                    </div>
                  )}
                  {booking.stripe_charge_id && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Stripe Charge ID</label>
                      <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                        {booking.stripe_charge_id}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {booking.receipt_number && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Receipt Number</label>
                      <p className="text-sm font-mono text-gray-900 bg-gray-50 p-2 rounded">
                        {booking.receipt_number}
                      </p>
                    </div>
                  )}
                  {booking.payment_method && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Payment Method</label>
                      <p className="text-gray-900">{booking.payment_method}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Refund Information */}
            {booking.refund_amount && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Refund Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Refund Amount</label>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(booking.refund_amount)}</p>
                    </div>
                    {booking.refund_reason && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Refund Reason</label>
                        <p className="text-gray-900">{booking.refund_reason}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    {booking.refund_date && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Refund Date</label>
                        <p className="text-gray-900">{format(new Date(booking.refund_date), 'MMM d, yyyy h:mm a')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'communication' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication</h3>
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No messages yet</h3>
              <p className="text-sm text-gray-500">Communication history will appear here</p>
            </div>
          </Card>
        )}

        {activeTab === 'history' && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking History</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Booking created</p>
                  <p className="text-xs text-gray-500">{format(new Date(booking.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Last updated</p>
                  <p className="text-xs text-gray-500">{format(new Date(booking.updated_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}