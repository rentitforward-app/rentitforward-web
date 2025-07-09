'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { 
  Clock, 
  Calendar, 
  MapPin, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Zap, 
  CheckSquare, 
  Timer, 
  List, 
  Search, 
  Download, 
  Package, 
  Plus, 
  Mail, 
  MessageCircle, 
  Eye,
  Camera,
  RefreshCw,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import SimpleConfirmationModal from '@/components/ui/SimpleConfirmationModal';

// Owner Receipt Confirmation Modal Component
interface OwnerReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { notes: string; condition: string; hasIssues: boolean }) => void;
  bookingTitle: string;
}

function OwnerReceiptModal({ isOpen, onClose, onConfirm, bookingTitle }: OwnerReceiptModalProps) {
  const [notes, setNotes] = useState('');
  const [condition, setCondition] = useState('');
  const [hasIssues, setHasIssues] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({ notes, condition, hasIssues });
      onClose();
      setNotes('');
      setCondition('');
      setHasIssues(false);
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Confirm Item Receipt</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">
                Item: <span className="font-medium">{bookingTitle}</span>
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Confirm that you have received the item back from the renter.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Condition Upon Return
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select condition</option>
                <option value="excellent">Excellent - Like new</option>
                <option value="good">Good - Minor wear</option>
                <option value="fair">Fair - Noticeable wear</option>
                <option value="poor">Poor - Significant wear</option>
                <option value="damaged">Damaged - Repair needed</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasIssues"
                checked={hasIssues}
                onChange={(e) => setHasIssues(e.target.checked)}
                className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="hasIssues" className="text-sm text-gray-700">
                Report issues or damage (will require follow-up)
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes {hasIssues && <span className="text-red-500">(Required if reporting issues)</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={hasIssues ? "Describe the issues or damage in detail..." : "Add any notes about the return..."}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={3}
                required={hasIssues}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button onClick={onClose} variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!condition || (hasIssues && !notes.trim()) || isSubmitting}
                className={hasIssues ? "bg-orange-600 hover:bg-orange-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
              >
                {isSubmitting ? 'Confirming...' : hasIssues ? 'Report & Complete' : 'Confirm Receipt'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Booking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'pending' | 'payment_required' | 'confirmed' | 'in_progress' | 'return_pending' | 'completed' | 'cancelled';
  created_at: string;
  pickup_instructions?: string;
  return_instructions?: string;
  pickup_location?: string;
  return_location?: string;
  insurance_selected: boolean;
  deposit_amount?: number;
  deposit_status?: 'held' | 'released' | 'returned';
  condition_before?: string;
  condition_after?: string;
  photos_before?: string[];
  photos_after?: string[];
  damage_report?: string;
  // Add field to indicate user's role in this booking
  userRole?: 'renter' | 'owner';
  // Pickup confirmation fields
  pickup_confirmed_by_renter?: boolean;
  pickup_confirmed_by_owner?: boolean;
  pickup_confirmed_at?: string;
  pickup_images?: string[];
  pickup_notes?: string;
  // Return confirmation fields
  return_confirmed_by_renter?: boolean;
  return_confirmed_by_owner?: boolean;
  return_confirmed_at?: string;
  return_images?: string[];
  return_notes?: string;
  extension_requests?: Array<{
    id: string;
    new_end_date: string;
    additional_cost: number;
    status: 'pending' | 'approved' | 'denied';
    requested_at: string;
  }>;
  issues_reported?: Array<{
    id: string;
    issue: string;
    reported_at: string;
    resolved: boolean;
  }>;
  reviews?: {
    renter_review?: {
      rating: number;
      comment: string;
      created_at: string;
    };
    owner_review?: {
      rating: number;
      comment: string;
      created_at: string;
    };
  };
  listing: {
    id: string;
    title: string;
    images: string[];
    daily_rate: number;
    category: string;
    owner_id: string;
  };
  owner: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
    phone?: string;
  };
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'active' | 'past' | 'all'>('upcoming');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'pickup' | 'return';
    booking: Booking | null;
  }>({ isOpen: false, type: 'pickup', booking: null });

  const [ownerReceiptModal, setOwnerReceiptModal] = useState<{
    isOpen: boolean;
    booking: Booking | null;
  }>({ isOpen: false, booking: null });
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadBookings();
  }, [activeTab]);

  useEffect(() => {
    filterBookings();
  }, [bookings, statusFilter, roleFilter, searchTerm]);

  // Add periodic refresh to catch status changes from other users
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading) {
        loadBookings();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [isLoading]);

  const loadBookings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No user found, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('User found:', user.id);
      setUser(user);

      // Fetch bookings where user is either renter or owner
      const [renterBookingsResult, ownerBookingsResult] = await Promise.all([
        // Bookings where user is the renter
        supabase
          .from('bookings')
          .select(`
            *,
            listings!item_id (
              id,
              title,
              images,
              price_per_day,
              category,
              owner_id,
              profiles!owner_id (
                id,
                full_name,
                email,
                phone_number,
                avatar_url
              )
            )
          `)
          .eq('renter_id', user.id)
          .order('created_at', { ascending: false }),
        
        // Bookings where user is the owner (receiving booking requests)
        supabase
          .from('bookings')
          .select(`
            *,
            listings!item_id (
              id,
              title,
              images,
              price_per_day,
              category,
              owner_id
            ),
            renter:renter_id (
              id,
              full_name,
              email,
              phone_number,
              avatar_url
            )
          `)
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      const renterBookingsData = renterBookingsResult.data || [];
      const ownerBookingsData = ownerBookingsResult.data || [];
      
      if (renterBookingsResult.error || ownerBookingsResult.error) {
        console.error('Error fetching bookings:', renterBookingsResult.error || ownerBookingsResult.error);
        console.error('Failed to load bookings');
        return;
      }

      // Combine both arrays
      const allBookingsData = [...renterBookingsData, ...ownerBookingsData];

      console.log('Total bookings found:', allBookingsData?.length || 0);

      // If no bookings found for this user, let's check if this user exists in our test data
      if (!allBookingsData || allBookingsData.length === 0) {
        console.log('No bookings found for user:', user.id);
        console.log('Available renter IDs in database:', ['79a051b4-4cf3-4d35-99fc-e96b115fbce2', '8e465884-dfaa-49e5-ba5e-3da91ea470dc']);
        
        // For now, show a message to the user
        setBookings([]);
        setIsLoading(false);
        return;
      }

      // Transform the data to match our interface
      const transformedBookings: Booking[] = (allBookingsData || []).map(booking => {
        // Check if this is a booking where user is the owner (has renter data) or renter (has owner data)
        const isOwnerBooking = booking.owner_id === user.id;


        
        return {
          id: booking.id,
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_amount: booking.total_amount,
          status: booking.status,
          created_at: booking.created_at,
          insurance_selected: (booking.insurance_fee || 0) > 0,
          deposit_amount: booking.deposit_amount,
          deposit_status: booking.deposit_status,
          pickup_location: booking.pickup_location || 'TBD',
          return_location: booking.return_location || 'TBD',
          pickup_instructions: booking.pickup_instructions,
          return_instructions: booking.return_instructions,
          userRole: isOwnerBooking ? 'owner' : 'renter',
          condition_before: booking.condition_before,
          condition_after: booking.condition_after,
          photos_before: booking.photos_before,
          photos_after: booking.photos_after,
          damage_report: booking.damage_report,
          // Pickup confirmation fields
          pickup_confirmed_by_renter: booking.pickup_confirmed_by_renter,
          pickup_confirmed_by_owner: booking.pickup_confirmed_by_owner,
          pickup_confirmed_at: booking.pickup_confirmed_at,
          pickup_images: booking.pickup_images || [],
          pickup_notes: booking.pickup_notes,
          // Return confirmation fields
          return_confirmed_by_renter: booking.return_confirmed_by_renter,
          return_confirmed_by_owner: booking.return_confirmed_by_owner,
          return_confirmed_at: booking.return_confirmed_at,
          return_images: booking.return_images || [],
          return_notes: booking.return_notes,
          listing: {
            id: booking.listings.id,
            title: booking.listings.title,
            images: booking.listings.images || ['/placeholder-image.jpg'],
            daily_rate: booking.listings.price_per_day,
            category: booking.listings.category || 'General',
            owner_id: booking.listings.owner_id
          },
          // For owner bookings, show renter info; for renter bookings, show owner info
          owner: isOwnerBooking ? {
            id: booking.renter?.id || 'unknown',
            full_name: booking.renter?.full_name || 'Unknown User',
            email: booking.renter?.email || '',
            phone: booking.renter?.phone_number || '',
            avatar_url: booking.renter?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.renter?.id || 'default'}`
          } : {
            id: booking.listings.profiles?.id || 'unknown',
            full_name: booking.listings.profiles?.full_name || 'Unknown User',
            email: booking.listings.profiles?.email || '',
            phone: booking.listings.profiles?.phone_number || '',
            avatar_url: booking.listings.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.listings.profiles?.id || 'default'}`
          }
        };
      });

      setBookings(transformedBookings);
      setIsLoading(false);

    } catch (error) {
      console.error('Error loading bookings:', error);
      console.error('Failed to load bookings');
      setIsLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Filter by tab (timeline)
    const now = new Date();
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(booking => 
        isAfter(new Date(booking.start_date), now) && 
        (booking.status === 'confirmed' || booking.status === 'pending' || booking.status === 'payment_required')
      );
    } else if (activeTab === 'active') {
      filtered = filtered.filter(booking => 
        (booking.status === 'in_progress' || booking.status === 'return_pending') && 
        isAfter(new Date(booking.end_date), now) // Only check that rental hasn't ended yet
      );
    } else if (activeTab === 'past') {
      filtered = filtered.filter(booking => 
        isBefore(new Date(booking.end_date), now) &&
        (booking.status === 'completed' || booking.status === 'cancelled')
      );
    } else if (activeTab === 'all') {
      // Don't filter by date for "all" tab, show all bookings
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Filter by user role
    if (roleFilter !== 'all') {
      filtered = filtered.filter(booking => booking.userRole === roleFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.owner.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId ? { ...booking, status: newStatus as any } : booking
      ));
      
      toast.success(`Booking ${newStatus === 'confirmed' ? 'accepted' : 'declined'} successfully!`);
      
      // Refresh data to ensure consistency
      await loadBookings();
      
    } catch (error) {
      console.error('Failed to update booking status:', error);
      toast.error(`Failed to ${newStatus === 'confirmed' ? 'accept' : 'decline'} booking. Please try again.`);
    }
  };

  const handlePickupConfirmation = async (data: { notes: string; condition: string }) => {
    if (!confirmationModal.booking) return;

    try {
      const updateData = {
        pickup_confirmed_by_renter: true,
        pickup_confirmed_at: new Date().toISOString(),
        pickup_notes: data.notes,
        condition_before: data.condition,
        status: 'in_progress' as const // Change status to in_progress when pickup is confirmed
      };

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', confirmationModal.booking.id);

      if (error) throw error;

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === confirmationModal.booking!.id 
          ? { ...booking, ...updateData } 
          : booking
      ));

      toast.success('Pickup confirmed! Booking is now active.');
      console.log('Pickup confirmed successfully');
    } catch (error) {
      console.error('Failed to confirm pickup:', error);
      throw error;
    }
  };

  const handleOwnerReceiptConfirmation = async (data: { notes: string; condition: string; hasIssues: boolean }) => {
    if (!confirmationModal.booking) return;

    try {
      const updateData = {
        return_confirmed_by_owner: true,
        owner_receipt_confirmed_at: new Date().toISOString(),
        owner_receipt_notes: data.notes,
        final_condition: data.condition,
        has_issues: data.hasIssues,
        status: 'completed' as const // Mark as completed after owner confirms receipt
      };

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', confirmationModal.booking.id);

      if (error) throw error;

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === confirmationModal.booking!.id 
          ? { ...booking, ...updateData } 
          : booking
      ));

      console.log('Owner receipt confirmed successfully');
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
      throw error;
    }
  };

  const handleReturnConfirmation = async (data: { notes: string; condition: string }) => {
    if (!confirmationModal.booking) return;

    try {
      const updateData = {
        return_confirmed_by_renter: true,
        return_confirmed_at: new Date().toISOString(),
        return_notes: data.notes,
        condition_after: data.condition,
        status: 'return_pending' as const // Change status to return_pending, awaiting owner confirmation
      };

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', confirmationModal.booking.id);

      if (error) throw error;

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === confirmationModal.booking!.id 
          ? { ...booking, ...updateData } 
          : booking
      ));

      toast.success('Return confirmed! Booking is now completed.');
      console.log('Return confirmed successfully');
    } catch (error) {
      console.error('Failed to confirm return:', error);
      throw error;
    }
  };

  const openConfirmationModal = (type: 'pickup' | 'return', booking: Booking) => {
    setConfirmationModal({ isOpen: true, type, booking });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ isOpen: false, type: 'pickup', booking: null });
  };

  const openOwnerReceiptModal = (booking: Booking) => {
    setOwnerReceiptModal({ isOpen: true, booking });
  };

  const closeOwnerReceiptModal = () => {
    setOwnerReceiptModal({ isOpen: false, booking: null });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'payment_required': return 'text-purple-600 bg-purple-100';
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'return_pending': return 'text-orange-600 bg-orange-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'payment_required': return <DollarSign className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Zap className="w-4 h-4" />;
      case 'return_pending': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckSquare className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(price);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <AuthenticatedLayout>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-600">Track items you're renting and booking requests for your items</p>
          </div>
          
          <Button
            onClick={() => router.push('/browse')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Find Items to Rent
          </Button>
        </div>

        {/* Timeline Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'upcoming'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Timer className="h-4 w-4 mr-2 inline" />
              Upcoming
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'active'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Zap className="h-4 w-4 mr-2 inline" />
              Active
            </button>
            <button
              onClick={() => setActiveTab('past')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'past'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckSquare className="h-4 w-4 mr-2 inline" />
              Past
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="h-4 w-4 mr-2 inline" />
              All
            </button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="payment_required">Payment Required</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">Active</option>
                <option value="return_pending">Return Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">All Bookings</option>
                <option value="renter">I'm Renting</option>
                <option value="owner">My Items</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={loadBookings}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </Card>

        {/* Bookings List */}
        {filteredBookings.length > 0 ? (
          <div className="space-y-4">
            {filteredBookings.map((booking) => (
              <Card key={booking.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex space-x-4 flex-1">
                    {/* Item Image */}
                    <div className="w-20 h-20 flex-shrink-0">
                      <Image
                        src={booking.listing.images[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5Mzk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K'}
                        alt={booking.listing.title}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {booking.listing.title}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {booking.userRole === 'owner' 
                              ? `Booking request from: ${booking.owner.full_name}`
                              : `Rented from: ${booking.owner.full_name}`
                            }
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Role Badge */}
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            booking.userRole === 'owner' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {booking.userRole === 'owner' ? '🏠 My Item' : '📦 I\'m Renting'}
                          </span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {getStatusIcon(booking.status)}
                            <span className="ml-1">{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Dates and Duration */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <div>
                            <p className="font-medium">Start Date</p>
                            <p>{format(new Date(booking.start_date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <div>
                            <p className="font-medium">End Date</p>
                            <p>{format(new Date(booking.end_date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          <div>
                            <p className="font-medium">Total Amount</p>
                            <p className="text-lg font-semibold text-green-600">
                              {formatPrice(booking.total_amount)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {booking.insurance_selected && (
                            <span className="text-blue-600">Insurance included</span>
                          )}
                          {booking.deposit_amount && (
                            <span>Deposit: {formatPrice(booking.deposit_amount)}</span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Owner actions for pending booking requests */}
                          {booking.userRole === 'owner' && booking.status === 'pending' && (
                            <>
                              <Button
                                onClick={() => updateBookingStatus(booking.id, 'payment_required')}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Decline
                              </Button>
                            </>
                          )}

                          {/* Renter actions */}
                          {booking.userRole === 'renter' && (
                            <>
                              {/* Payment Required Button */}
                              {booking.status === 'payment_required' && (
                                <Button
                                  onClick={() => router.push(`/bookings/${booking.id}/payment`)}
                                  size="sm"
                                  className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  <DollarSign className="w-4 h-4 mr-1" />
                                  Pay Now
                                </Button>
                              )}

                              {/* Pickup Confirmation Button */}
                              {booking.status === 'confirmed' && !booking.pickup_confirmed_by_renter && (
                                <Button
                                  onClick={() => openConfirmationModal('pickup', booking)}
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <Camera className="w-4 h-4 mr-1" />
                                  Confirm Pickup
                                </Button>
                              )}

                              {/* Return Confirmation Button */}
                              {booking.status === 'in_progress' && booking.pickup_confirmed_by_renter && !booking.return_confirmed_by_renter && (
                                <Button
                                  onClick={() => openConfirmationModal('return', booking)}
                                  size="sm"
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Camera className="w-4 h-4 mr-1" />
                                  Confirm Return
                                </Button>
                              )}

                              {/* Status indicators for confirmations */}
                              {booking.pickup_confirmed_by_renter && (
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  ✓ Pickup Confirmed
                                </span>
                              )}
                              {booking.return_confirmed_by_renter && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  ✓ Return Confirmed
                                </span>
                              )}
                            </>
                          )}

                          {/* Owner actions for active bookings */}
                          {booking.userRole === 'owner' && (
                            <>
                              {/* Status indicators for owner */}
                              {booking.status === 'in_progress' && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    🏃 Active Rental
                                  </span>
                                  {booking.pickup_confirmed_by_renter && (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                      ✓ Picked Up
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {booking.status === 'return_pending' && (
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                    📥 Item Returned
                                  </span>
                                  <Button
                                    onClick={() => openOwnerReceiptModal(booking)}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Confirm Receipt
                                  </Button>
                                </div>
                              )}
                              
                              {booking.status === 'confirmed' && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                                  ⏳ Awaiting Pickup
                                </span>
                              )}
                              
                              {booking.status === 'payment_required' && (
                                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                                  💳 Payment Pending
                                </span>
                              )}
                            </>
                          )}

                          {/* Common actions for both roles */}
                          <Button
                            onClick={() => window.open(`mailto:${booking.owner.email}`)}
                            variant="outline"
                            size="sm"
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Email
                          </Button>
                          <Button
                            onClick={() => router.push(`/messages?user=${booking.owner.id}`)}
                            variant="outline"
                            size="sm"
                          >
                            <MessageCircle className="w-4 h-4 mr-1" />
                            Message
                          </Button>
                          <Button
                            onClick={() => setSelectedBooking(booking)}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-500 mb-6">
              No bookings match your current filters. Try adjusting the filters above or start exploring!
            </p>
            {user && (
              <p className="text-xs text-gray-400 mb-4">
                Debug: User ID: {user.id}
              </p>
            )}
            <div className="flex items-center justify-center space-x-4">
              <Button onClick={() => router.push('/browse')}>
                Browse Items to Rent
              </Button>
              <Button 
                onClick={() => router.push('/listings/create')}
                variant="outline"
              >
                List an Item
              </Button>
            </div>
          </Card>
        )}

        {/* Confirmation Modal */}
        <SimpleConfirmationModal
          isOpen={confirmationModal.isOpen}
          onClose={closeConfirmationModal}
          onConfirm={confirmationModal.type === 'pickup' ? handlePickupConfirmation : handleReturnConfirmation}
          type={confirmationModal.type}
          bookingTitle={confirmationModal.booking?.listing.title || ''}
        />

        {/* Owner Receipt Confirmation Modal */}
        {ownerReceiptModal.isOpen && ownerReceiptModal.booking && (
          <OwnerReceiptModal
            isOpen={ownerReceiptModal.isOpen}
            onClose={closeOwnerReceiptModal}
            onConfirm={handleOwnerReceiptConfirmation}
            bookingTitle={ownerReceiptModal.booking.listing.title}
          />
        )}

        {/* Booking Details Modal */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">Booking Details</h2>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Item Info */}
                  <div>
                    <h3 className="font-semibold mb-2">Item Information</h3>
                    <div className="flex items-center gap-4">
                      <Image
                        src={selectedBooking.listing.images[0]}
                        alt={selectedBooking.listing.title}
                        width={80}
                        height={80}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-medium">{selectedBooking.listing.title}</p>
                        <p className="text-sm text-gray-600">{selectedBooking.listing.category}</p>
                        <p className="text-sm text-green-600">{formatPrice(selectedBooking.listing.daily_rate)}/day</p>
                      </div>
                    </div>
                  </div>

                  {/* Owner Contact */}
                  <div>
                    <h3 className="font-semibold mb-2">Owner Contact</h3>
                    <div className="space-y-2">
                      <p>{selectedBooking.owner.full_name}</p>
                      <p className="text-sm text-gray-600">{selectedBooking.owner.email}</p>
                      {selectedBooking.owner.phone && (
                        <p className="text-sm text-gray-600">{selectedBooking.owner.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Pickup/Return Locations */}
                  {selectedBooking.pickup_location && (
                    <div>
                      <h3 className="font-semibold mb-2">Pickup & Return</h3>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">Pickup Location</p>
                            <p className="text-sm text-gray-600">{selectedBooking.pickup_location}</p>
                          </div>
                        </div>
                        {selectedBooking.return_location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">Return Location</p>
                              <p className="text-sm text-gray-600">{selectedBooking.return_location}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Condition Notes */}
                  {selectedBooking.condition_before && (
                    <div>
                      <h3 className="font-semibold mb-2">Item Condition</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium">Before Rental</p>
                          <p className="text-sm text-gray-600">{selectedBooking.condition_before}</p>
                        </div>
                        {selectedBooking.condition_after && (
                          <div>
                            <p className="text-sm font-medium">After Return</p>
                            <p className="text-sm text-gray-600">{selectedBooking.condition_after}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
} 