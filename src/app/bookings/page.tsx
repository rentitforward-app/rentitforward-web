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
  MessageCircle, 
  Eye,
  Camera,
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
  status: 'pending' | 'payment_required' | 'confirmed' | 'in_progress' | 'return_pending' | 'completed' | 'cancelled' | 'expired';
  created_at: string;
  expires_at?: string;
  pickup_instructions?: string;
  return_instructions?: string;
  pickup_location?: string;
  return_location?: string;
  delivery_method?: 'pickup' | 'delivery';
  delivery_address?: string;
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
  const [paginatedBookings, setPaginatedBookings] = useState<Booking[]>([]);
  const [user, setUser] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'renter' | 'owner'>('renter');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statsCount, setStatsCount] = useState({
    total: 0,
    pending: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
  });
  const itemsPerPage = 12;
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
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, statusFilter, activeTab, dateSort, searchTerm]);

  useEffect(() => {
    paginateBookings();
  }, [filteredBookings, currentPage]);

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
        // Bookings where user is the renter (exclude expired bookings)
        supabase
          .from('bookings')
          .select(`
            *,
            listings!listing_id (
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
          .neq('status', 'expired')
          .order('created_at', { ascending: false }),
        
        // Bookings where user is the owner (receiving booking requests)
        supabase
          .from('bookings')
          .select(`
            *,
            listings!listing_id (
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
          .neq('status', 'expired')
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
      const transformedBookings: any[] = (allBookingsData || [])
        .filter(booking => booking.listings !== null) // Filter out bookings with null listings
        .map(booking => {
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
          delivery_method: booking.delivery_method,
          delivery_address: booking.delivery_address,
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
            id: booking.listings?.id || 'unknown',
            title: booking.listings?.title || 'Unknown Listing',
            images: booking.listings?.images || ['/placeholder-image.jpg'],
            daily_rate: booking.listings?.price_per_day || 0,
            category: booking.listings?.category || 'General',
            owner_id: booking.listings?.owner_id || 'unknown'
          },
          // For owner bookings, show renter info; for renter bookings, show owner info
          owner: isOwnerBooking ? {
            id: booking.renter?.id || 'unknown',
            full_name: booking.renter?.full_name || 'Unknown User',
            email: booking.renter?.email || '',
            phone: booking.renter?.phone_number || '',
            avatar_url: booking.renter?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.renter?.id || 'default'}`
          } : {
            id: booking.listings?.owner_id || 'unknown',
            full_name: booking.listings.profiles?.full_name || 'Unknown User',
            email: booking.listings.profiles?.email || '',
            phone: booking.listings.profiles?.phone_number || '',
            avatar_url: booking.listings.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${booking.listings?.owner_id || 'default'}`
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

    // Filter by active tab (user role)
    filtered = filtered.filter(booking => booking.userRole === activeTab);

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.owner.full_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      
      if (dateSort === 'newest') {
        return dateB - dateA; // Newest first
      } else {
        return dateA - dateB; // Oldest first
      }
    });

    setFilteredBookings(filtered);
    
    // Calculate total pages
    const totalPagesCount = Math.ceil(filtered.length / itemsPerPage);
    setTotalPages(totalPagesCount);
    
    // Reset to first page if current page exceeds total pages
    if (currentPage > totalPagesCount && totalPagesCount > 0) {
      setCurrentPage(1);
    }
    
    // Calculate stats based on the active tab
    const tabBookings = bookings.filter(booking => booking.userRole === activeTab);
    const activeTabStats = {
      total: tabBookings.length,
      pending: tabBookings.filter(b => b.status === 'pending').length,
      active: tabBookings.filter(b => b.status === 'in_progress' || b.status === 'confirmed').length,
      completed: tabBookings.filter(b => b.status === 'completed').length,
      cancelled: tabBookings.filter(b => b.status === 'cancelled').length,
    };
    setStatsCount(activeTabStats);
  };

  const paginateBookings = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredBookings.slice(startIndex, endIndex);
    setPaginatedBookings(paginated);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of bookings list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generatePageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
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

  const cancelBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId ? { ...booking, status: 'cancelled' as any } : booking
      ));
      
      toast.success('Booking cancelled successfully!');
      
      // Refresh data to ensure consistency
      await loadBookings();
      
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to cancel booking. Please try again.');
      }
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
    if (!ownerReceiptModal.booking) return;

    try {
      const updateData = {
        return_confirmed_by_owner: true,
        owner_receipt_confirmed_at: new Date().toISOString(),
        owner_receipt_notes: data.notes,
        final_condition: data.condition,
        has_issues: data.hasIssues,
        status: 'completed' as const // Mark as completed after owner confirms receipt
      };

      // Update booking directly via Supabase (fallback while API endpoint loads)
      const { error } = await supabase
        .from('bookings')
        .update({
          ...updateData,
          completed_at: new Date().toISOString(),
        })
        .eq('id', ownerReceiptModal.booking.id);

      if (error) {
        throw new Error(error.message || 'Failed to complete booking');
      }

      // Create notifications for both renter and owner
      const notifications = [
        {
          user_id: ownerReceiptModal.booking.listing.owner_id,
          type: 'rental_completed',
          title: 'Rental Completed',
          message: 'You have successfully confirmed the return. The booking is now completed and ready for fund release.',
          data: {
            booking_id: ownerReceiptModal.booking.id,
            listing_title: ownerReceiptModal.booking.listing.title,
          },
          created_at: new Date().toISOString(),
        },
        {
          user_id: user?.id, // Renter notification
          type: 'rental_completed',
          title: 'Rental Completed',
          message: `The owner has confirmed the return of "${ownerReceiptModal.booking.listing.title}". Thank you for renting responsibly!`,
          data: {
            booking_id: ownerReceiptModal.booking.id,
            listing_title: ownerReceiptModal.booking.listing.title,
          },
          created_at: new Date().toISOString(),
        },
      ];

      // Insert notifications
      for (const notification of notifications) {
        try {
          await supabase.from('notifications').insert(notification);
        } catch (notificationError) {
          console.error('Error creating notification:', notificationError);
        }
      }

      // Update local state with the completed booking
      setBookings(prev => prev.map(booking => 
        booking.id === ownerReceiptModal.booking!.id 
          ? { ...booking, ...updateData, completed_at: new Date().toISOString() } 
          : booking
      ));

      // Close the modal
      closeOwnerReceiptModal();
      
      // Show success message
      toast.success('Receipt confirmed! Booking completed successfully.');
      console.log('Owner receipt confirmed successfully');
    } catch (error) {
      console.error('Failed to confirm receipt:', error);
      toast.error('Failed to confirm receipt. Please try again.');
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => {
                setActiveTab('renter');
                setCurrentPage(1);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'renter'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              I'm Renting
            </button>
            <button
              onClick={() => {
                setActiveTab('owner');
                setCurrentPage(1);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'owner'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Items
            </button>
          </nav>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{statsCount.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{statsCount.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-bold text-gray-900">{statsCount.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{statsCount.completed}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <CheckSquare className="w-6 h-6 text-gray-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Cancelled</p>
                <p className="text-2xl font-bold text-gray-900">{statsCount.cancelled}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search bookings by item name or owner..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
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
                value={dateSort}
                onChange={(e) => {
                  setDateSort(e.target.value as 'newest' | 'oldest');
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>

          {/* Results Summary */}
          {filteredBookings.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
            </div>
          )}
        </Card>

        {/* Top Pagination */}
        {totalPages > 1 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBookings.length)} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {generatePageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={typeof page !== 'number'}
                      className={`px-3 py-1 text-sm rounded ${
                        typeof page === 'number'
                          ? page === currentPage
                            ? 'bg-green-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                          : 'text-gray-400'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Bookings List */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : paginatedBookings.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No bookings found</h3>
            <p className="text-sm text-gray-500">
              {filteredBookings.length === 0 && bookings.length > 0 
                ? "No bookings match your current filters. Try adjusting the filters above."
                : "You haven't made any bookings yet. Start exploring items to rent!"
              }
            </p>
            {user && bookings.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">
                Debug: User ID: {user.id}
              </p>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 mt-6">
              <Button onClick={() => router.push('/browse')} className="w-full sm:w-auto">
                Browse Items to Rent
              </Button>
              <Button 
                onClick={() => router.push('/listings/create')}
                variant="outline"
                className="w-full sm:w-auto"
              >
                List an Item
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6">
            {paginatedBookings.map((booking) => (
              <Card key={booking.id} className="p-6">
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={booking.listing.images[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5Mzk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K'}
                      alt={booking.listing.title}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <button
                          onClick={() => router.push(`/bookings/${booking.id}`)}
                          className="text-left"
                        >
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">
                            {booking.listing.title}
                          </h3>
                        </button>
                        <p className="text-sm text-gray-500">
                          Booking ID: 
                          <button
                            onClick={() => router.push(`/bookings/${booking.id}`)}
                            className="ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                          >
                            {booking.id}
                          </button>
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-lg font-bold text-green-600">
                          {formatPrice(booking.total_amount)}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {getStatusIcon(booking.status)}
                          <span className="ml-1">{booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace('_', ' ')}</span>
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-3">
                      {booking.userRole === 'owner' 
                        ? `Booking request from: ${booking.owner.full_name}`
                        : `Rented from: ${booking.owner.full_name}`
                      }
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.userRole === 'owner' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {booking.userRole === 'owner' ? '🏠 My Item' : '📦 I\'m Renting'}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                      </span>
                      {booking.insurance_selected && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Insurance included
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 mb-3">
                      <div className="mb-2">
                        <strong>Booked:</strong> {format(new Date(booking.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                      {!!booking.deposit_amount && (
                        <div className="mt-1">
                          <strong>Deposit:</strong> {formatPrice(booking.deposit_amount)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
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

                      {/* Renter cancel option for pending bookings */}
                      {booking.userRole === 'renter' && booking.status === 'pending' && (
                        <Button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this booking request?')) {
                              cancelBooking(booking.id);
                            }
                          }}
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancel Request
                        </Button>
                      )}

                      {/* Renter actions */}
                      {booking.userRole === 'renter' && (
                        <>
                          {/* Payment Required Buttons with Expiration Warning */}
                          {booking.status === 'payment_required' && (
                            <>
                              {/* Expiration Warning if expires_at exists */}
                              {booking.expires_at && new Date(booking.expires_at) > new Date() && (
                                <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                  ⏰ Expires: {format(new Date(booking.expires_at), 'MMM d, h:mm a')}
                                </div>
                              )}
                              <Button
                                onClick={() => router.push(`/bookings/${booking.id}/payment`)}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                <DollarSign className="w-4 h-4 mr-1" />
                                Pay Now
                              </Button>
                              <Button
                                onClick={() => {
                                  if (window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                                    cancelBooking(booking.id);
                                  }
                                }}
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Cancel Booking
                              </Button>
                            </>
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
                        </>
                      )}

                      {/* Owner actions for active bookings */}
                      {booking.userRole === 'owner' && booking.status === 'return_pending' && (
                        <Button
                          onClick={() => openOwnerReceiptModal(booking)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Confirm Receipt
                        </Button>
                      )}

                      {/* Common actions for both roles */}
                      <Button
                        onClick={() => {
                          // The booking.owner field contains the other party's info
                          // (renter info if user is owner, owner info if user is renter)
                          router.push(`/messages?with=${booking.owner.id}&booking=${booking.id}`);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <MessageCircle className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                      <Button
                        onClick={() => router.push(`/bookings/${booking.id}`)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredBookings.length)} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  size="sm"
                >
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {generatePageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && handlePageChange(page)}
                      disabled={typeof page !== 'number'}
                      className={`px-3 py-1 text-sm rounded ${
                        typeof page === 'number'
                          ? page === currentPage
                            ? 'bg-green-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                          : 'text-gray-400'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  size="sm"
                >
                  Next
                </Button>
              </div>
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
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg md:text-xl font-bold">Booking Details</h2>
                  <button
                    onClick={() => setSelectedBooking(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>

                <div className="space-y-4 md:space-y-6">
                  {/* Item Info */}
                  <div>
                    <h3 className="font-semibold mb-2 text-sm md:text-base">Item Information</h3>
                    <div className="flex items-center gap-3 md:gap-4">
                      <Image
                        src={selectedBooking.listing.images[0]}
                        alt={selectedBooking.listing.title}
                        width={80}
                        height={80}
                        className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-medium text-sm md:text-base">{selectedBooking.listing.title}</p>
                        <p className="text-xs md:text-sm text-gray-600">{selectedBooking.listing.category}</p>
                        <p className="text-xs md:text-sm text-green-600">{formatPrice(selectedBooking.listing.daily_rate)}/day</p>
                      </div>
                    </div>
                  </div>

                  {/* Owner Contact */}
                  <div>
                    <h3 className="font-semibold mb-2 text-sm md:text-base">Owner Contact</h3>
                    <div className="space-y-2">
                      <p className="text-sm md:text-base">{selectedBooking.owner.full_name}</p>
                      <p className="text-xs md:text-sm text-gray-600">{selectedBooking.owner.email}</p>
                      {selectedBooking.owner.phone && (
                        <p className="text-xs md:text-sm text-gray-600">{selectedBooking.owner.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery Information */}
                  {(selectedBooking.delivery_method || selectedBooking.pickup_location) && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm md:text-base">Delivery & Return</h3>
                      <div className="space-y-2">
                        {selectedBooking.delivery_method && (
                          <div className="flex items-start gap-2">
                            <Package className="w-3 h-3 md:w-4 md:h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs md:text-sm font-medium">Delivery Method</p>
                              <p className="text-xs md:text-sm text-gray-600">
                                {selectedBooking.delivery_method === 'pickup' ? 'Pickup from owner' : 'Delivery to renter'}
                              </p>
                            </div>
                          </div>
                        )}
                        {selectedBooking.delivery_method === 'delivery' && selectedBooking.delivery_address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs md:text-sm font-medium">Delivery Address</p>
                              <p className="text-xs md:text-sm text-gray-600 break-words">{selectedBooking.delivery_address}</p>
                            </div>
                          </div>
                        )}
                        {selectedBooking.delivery_method === 'pickup' && selectedBooking.pickup_location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs md:text-sm font-medium">Pickup Location</p>
                              <p className="text-xs md:text-sm text-gray-600 break-words">{selectedBooking.pickup_location}</p>
                            </div>
                          </div>
                        )}
                        {selectedBooking.return_location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3 h-3 md:w-4 md:h-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-xs md:text-sm font-medium">Return Location</p>
                              <p className="text-xs md:text-sm text-gray-600 break-words">{selectedBooking.return_location}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Condition Notes */}
                  {selectedBooking.condition_before && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm md:text-base">Item Condition</h3>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs md:text-sm font-medium">Before Rental</p>
                          <p className="text-xs md:text-sm text-gray-600">{selectedBooking.condition_before}</p>
                        </div>
                        {selectedBooking.condition_after && (
                          <div>
                            <p className="text-xs md:text-sm font-medium">After Return</p>
                            <p className="text-xs md:text-sm text-gray-600">{selectedBooking.condition_after}</p>
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