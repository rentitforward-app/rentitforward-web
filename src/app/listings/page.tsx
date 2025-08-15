'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Plus, 
  Eye, 
  Edit, 
  Calendar, 
  DollarSign, 
  Package, 
  TrendingUp,
  Users,
  Star,
  MessageCircle,
  Phone,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Pause,
  Play,
  Trash2,
  Settings,
  MoreVertical,
  Search,
  Zap,
  CheckSquare,
  Camera,
  MapPin,
  X
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface Listing {
  id: string;
  title: string;
  description: string;
  daily_rate: number;
  category: string;
  images: string[];
  status: 'active' | 'paused' | 'draft' | 'pending_approval' | 'rejected' | 'rented';
  created_at: string;
  view_count: number;
  total_bookings: number;
  total_earnings: number;
  availability: boolean;
  rating: number;
  review_count: number;
}

interface ItemBooking {
  id: string;
  start_date: string;
  end_date: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'disputed' | 'payment_required' | 'return_pending';
  created_at: string;
  listing_id: string;
  listing_title: string;
  renter: {
    id: string;
    full_name: string;
    avatar_url?: string;
    email: string;
    phone?: string;
  };
}

export default function MyListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [itemBookings, setItemBookings] = useState<ItemBooking[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [paginatedListings, setPaginatedListings] = useState<Listing[]>([]);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'bookings' | 'earnings'>('items');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingListings, setUpdatingListings] = useState<Set<string>>(new Set());
  const [selectedBooking, setSelectedBooking] = useState<ItemBooking | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    type: 'pickup' | 'return';
    booking: ItemBooking | null;
  }>({ isOpen: false, type: 'pickup', booking: null });
  const [ownerReceiptModal, setOwnerReceiptModal] = useState<{
    isOpen: boolean;
    booking: ItemBooking | null;
  }>({ isOpen: false, booking: null });
  const itemsPerPage = 12;
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'items') {
      filterListings();
    }
  }, [listings, statusFilter, categoryFilter, searchTerm, dateSort]);

  useEffect(() => {
    if (activeTab === 'items') {
      paginateListings();
    }
  }, [filteredListings, currentPage]);

  const filterListings = () => {
    let filtered = [...listings];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(listing => listing.status === statusFilter);
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      // Map human-readable category to database value
      const categoryMapping: { [key: string]: string } = {
        'Tools & DIY Equipment': 'tools_diy_equipment',
        'Cameras & Photography Gear': 'cameras_photography_gear',
        'Event & Party Equipment': 'event_party_equipment',
        'Camping & Outdoor Gear': 'camping_outdoor_gear',
        'Tech & Electronics': 'tech_electronics',
        'Vehicles & Transport': 'vehicles_transport',
        'Home & Garden Appliances': 'home_garden_appliances',
        'Sports & Fitness Equipment': 'sports_fitness_equipment',
        'Musical Instruments & Gear': 'musical_instruments_gear',
        'Costumes & Props': 'costumes_props',
        'Maker & Craft Supplies': 'maker_craft_supplies'
      };
      
      const dbCategoryValue = categoryMapping[categoryFilter] || categoryFilter;
      filtered = filtered.filter(listing => listing.category === dbCategoryValue);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.category.toLowerCase().includes(searchTerm.toLowerCase())
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

    setFilteredListings(filtered);
    
    // Calculate total pages
    const totalPagesCount = Math.ceil(filtered.length / itemsPerPage);
    setTotalPages(totalPagesCount);
    
    // Reset to first page if current page exceeds total pages
    if (currentPage > totalPagesCount && totalPagesCount > 0) {
      setCurrentPage(1);
    }
  };

  const paginateListings = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filteredListings.slice(startIndex, endIndex);
    setPaginatedListings(paginated);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
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

  // Booking management functions
  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      // Update local state
      setItemBookings(prev => prev.map(booking => 
        booking.id === bookingId ? { ...booking, status: newStatus as any } : booking
      ));

      toast.success(`Booking ${newStatus === 'payment_required' ? 'accepted' : newStatus}!`);
    } catch (error) {
      console.error('Failed to update booking status:', error);
      toast.error('Failed to update booking status');
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
        status: 'in_progress' as const
      };

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', confirmationModal.booking.id);

      if (error) throw error;

      // Update local state
      setItemBookings(prev => prev.map(booking => 
        booking.id === confirmationModal.booking!.id 
          ? { ...booking, ...updateData } 
          : booking
      ));

      toast.success('Pickup confirmed! Booking is now active.');
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
        status: 'completed' as const
      };

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', ownerReceiptModal.booking.id);

      if (error) throw error;

      // Update local state
      setItemBookings(prev => prev.map(booking => 
        booking.id === ownerReceiptModal.booking!.id 
          ? { ...booking, ...updateData } 
          : booking
      ));

      toast.success('Receipt confirmed! Booking completed.');
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
        status: 'return_pending' as const
      };

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', confirmationModal.booking.id);

      if (error) throw error;

      // Update local state
      setItemBookings(prev => prev.map(booking => 
        booking.id === confirmationModal.booking!.id 
          ? { ...booking, ...updateData } 
          : booking
      ));

      toast.success('Return confirmed! Awaiting owner confirmation.');
    } catch (error) {
      console.error('Failed to confirm return:', error);
      throw error;
    }
  };

  const openConfirmationModal = (type: 'pickup' | 'return', booking: ItemBooking) => {
    setConfirmationModal({ isOpen: true, type, booking });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ isOpen: false, type: 'pickup', booking: null });
  };

  const openOwnerReceiptModal = (booking: ItemBooking) => {
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

  const getListingStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'pending_approval': return 'text-orange-600 bg-orange-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'rented': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getListingStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending_approval':
        return <Clock className="w-4 h-4" />;
      case 'paused':
        return <AlertCircle className="w-4 h-4" />;
      case 'rented':
        return <Users className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      setUser(user);

      // Fetch real listings for the current user
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          price_per_day,
          category,
          images,
          is_active,
          approval_status,
          created_at,
          view_count,
          booking_count,
          available_from,
          available_to,
          rating,
          review_count
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (listingsError) {
        console.error('Error fetching listings:', listingsError);
        return;
      }

      // Fetch bookings for the user's listings to calculate earnings
      const listingIds = listingsData?.map(listing => listing.id) || [];
      
      let bookingsData: Array<{listing_id: string; total_amount: number; status: string}> = [];
      let itemBookingsData: Array<any> = [];
      
      if (listingIds.length > 0) {
        // Fetch bookings for calculating earnings and stats
        const { data: bookingsRaw, error: bookingsError } = await supabase
          .from('bookings')
          .select('listing_id, total_amount, status')
          .in('listing_id', listingIds);

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
        } else {
          bookingsData = bookingsRaw || [];
        }

        // Fetch detailed bookings with renter info for the bookings tab
        const { data: itemBookingsRaw, error: itemBookingsError } = await supabase
          .from('bookings')
          .select(`
            id,
            start_date,
            end_date,
            total_amount,
            status,
            created_at,
            listing_id,
            listings!inner(
              id,
              title
            ),
            profiles!bookings_renter_id_fkey(
              id,
              full_name,
              avatar_url,
              email,
              phone_number
            )
          `)
          .in('listing_id', listingIds)
          .order('created_at', { ascending: false });

        if (itemBookingsError) {
          console.error('Error fetching item bookings:', itemBookingsError);
        } else {
          itemBookingsData = itemBookingsRaw || [];
        }
      }

      // Transform listings data to match the interface
      const transformedListings: Listing[] = (listingsData || []).map(listing => {
        // Calculate stats for this listing
        const listingBookings = bookingsData.filter(booking => booking.listing_id === listing.id);
        const completedBookings = listingBookings.filter(booking => booking.status === 'completed');
        const totalEarnings = completedBookings.reduce((sum, booking) => sum + (booking.total_amount || 0), 0);

        // Check if listing is currently rented (has active booking)
        const currentDate = new Date();
        const activeBookings = itemBookingsData.filter(booking => {
          if (booking.listing_id !== listing.id) return false;
          if (booking.status !== 'in_progress' && booking.status !== 'confirmed') return false;
          
          const startDate = new Date(booking.start_date);
          const endDate = new Date(booking.end_date);
          return currentDate >= startDate && currentDate <= endDate;
        });

        // Determine status based on is_active, approval_status, and current bookings
        let status: 'active' | 'paused' | 'draft' | 'pending_approval' | 'rejected' | 'rented';
        if (listing.approval_status === 'pending') {
          status = 'pending_approval';
        } else if (listing.approval_status === 'rejected') {
          status = 'rejected';
        } else if (activeBookings.length > 0) {
          // Item is currently being rented
          status = 'rented';
        } else if (listing.approval_status === 'approved') {
          if (listing.is_active) {
            status = 'active';
          } else {
            status = 'paused';
          }
        } else {
          // For new listings that haven't been submitted for approval yet
          status = 'draft';
        }

        // Determine availability
        const now = new Date();
        const availableFrom = listing.available_from ? new Date(listing.available_from) : null;
        const availableTo = listing.available_to ? new Date(listing.available_to) : null;
        const availability = (!availableFrom || availableFrom <= now) && (!availableTo || availableTo >= now);

        return {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          daily_rate: Number(listing.price_per_day),
          category: listing.category,
          images: listing.images || [],
          status,
          created_at: listing.created_at,
          view_count: listing.view_count || 0,
          total_bookings: listing.booking_count || 0,
          total_earnings: totalEarnings,
          availability,
          rating: Number(listing.rating) || 0,
          review_count: listing.review_count || 0
        };
      });

      // Transform bookings data to match the interface
      const transformedBookings: ItemBooking[] = (itemBookingsData || []).map(booking => ({
        id: booking.id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_amount: Number(booking.total_amount),
        status: booking.status as any, // Cast to match our enum
        created_at: booking.created_at,
        listing_id: booking.listing_id,
        listing_title: booking.listings?.title || 'Unknown Item',
        renter: {
          id: booking.profiles?.id || '',
          full_name: booking.profiles?.full_name || 'Unknown User',
          avatar_url: booking.profiles?.avatar_url,
          email: booking.profiles?.email || '',
          phone: booking.profiles?.phone_number
        }
      }));

      setListings(transformedListings);
      setItemBookings(transformedBookings);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(price);
  };

  const totalEarnings = listings.reduce((sum, listing) => sum + listing.total_earnings, 0);
  const totalBookings = listings.reduce((sum, listing) => sum + listing.total_bookings, 0);
  
  // Calculate average rating - only include listings that have ratings
  const ratingsWithReviews = listings.filter(listing => listing.review_count > 0);
  const averageRating = ratingsWithReviews.length > 0 
    ? ratingsWithReviews.reduce((sum, listing) => sum + listing.rating, 0) / ratingsWithReviews.length
    : 0;

  const toggleListingStatus = async (listingId: string, currentStatus: string) => {
    // Don't allow status changes for pending approval, rejected, or rented listings
    if (currentStatus === 'pending_approval' || currentStatus === 'rejected' || currentStatus === 'rented') {
      if (currentStatus === 'rented') {
        toast.error('Cannot change status while item is currently being rented');
      } else {
        toast.error('Cannot change status while listing is pending approval or rejected');
      }
      return;
    }

    setUpdatingListings(prev => new Set(prev).add(listingId));
    
    try {
      const newIsActive = currentStatus !== 'active';
      
      const { error } = await supabase
        .from('listings')
        .update({ is_active: newIsActive })
        .eq('id', listingId);

      if (error) {
        console.error('Error updating listing status:', error);
        toast.error('Failed to update listing status');
        return;
      }

      // Update local state
      setListings(prev => prev.map(listing => 
        listing.id === listingId 
          ? { 
              ...listing, 
              status: newIsActive ? 'active' : 'paused' as 'active' | 'paused' | 'draft' | 'pending_approval' | 'rejected' | 'rented'
            }
          : listing
      ));

      toast.success(newIsActive ? 'Listing activated' : 'Listing paused');
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast.error('Failed to update listing status');
    } finally {
      setUpdatingListings(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
    }
  };

  const deleteListing = async (listingId: string, listingTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${listingTitle}"? This action cannot be undone.`)) {
      return;
    }

    setUpdatingListings(prev => new Set(prev).add(listingId));
    
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) {
        console.error('Error deleting listing:', error);
        toast.error('Failed to delete listing');
        return;
      }

      // Update local state
      setListings(prev => prev.filter(listing => listing.id !== listingId));
      toast.success('Listing deleted successfully');
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    } finally {
      setUpdatingListings(prev => {
        const newSet = new Set(prev);
        newSet.delete(listingId);
        return newSet;
      });
    }
  };

  const editListing = (listingId: string) => {
    // For now, redirect to the create page with edit mode
    // In a full implementation, you'd create a dedicated edit page
    router.push(`/listings/create?edit=${listingId}`);
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
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <p className="text-gray-600">Manage your items and track bookings</p>
          </div>
          <Button
            onClick={() => router.push('/listings/create')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add New Item
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'items', label: 'My Items', count: listings.length },
              { key: 'bookings', label: 'Item Bookings', count: itemBookings.length },
              { key: 'earnings', label: 'Earnings' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as any);
                  setCurrentPage(1);
                }}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-1 text-xs bg-gray-100 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(totalEarnings)}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tab Content */}
        {activeTab === 'items' && (
          <>
            {/* Filters and Search */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search listings by title, description, or category..."
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
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="draft">Draft</option>
                    <option value="pending_approval">Pending Approval</option>
                    <option value="rejected">Rejected</option>
                    <option value="rented">Currently Rented</option>
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="Tools & DIY Equipment">Tools & DIY Equipment</option>
                    <option value="Cameras & Photography Gear">Cameras & Photography Gear</option>
                    <option value="Event & Party Equipment">Event & Party Equipment</option>
                    <option value="Camping & Outdoor Gear">Camping & Outdoor Gear</option>
                    <option value="Tech & Electronics">Tech & Electronics</option>
                    <option value="Vehicles & Transport">Vehicles & Transport</option>
                    <option value="Home & Garden Appliances">Home & Garden Appliances</option>
                    <option value="Sports & Fitness Equipment">Sports & Fitness Equipment</option>
                    <option value="Musical Instruments & Gear">Musical Instruments & Gear</option>
                    <option value="Costumes & Props">Costumes & Props</option>
                    <option value="Maker & Craft Supplies">Maker & Craft Supplies</option>
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
              {filteredListings.length > 0 && (
                <div className="mt-4 text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredListings.length)} of {filteredListings.length} listings
                </div>
              )}
            </Card>

            {/* Top Pagination */}
            {totalPages > 1 && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredListings.length)} to {Math.min(currentPage * itemsPerPage, filteredListings.length)} of {filteredListings.length} listings
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

            {/* Listings Grid */}
            {paginatedListings.length === 0 ? (
              <Card className="p-8 text-center">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">No listings found</h3>
                <p className="text-sm text-gray-500 mb-6">
                  {filteredListings.length === 0 && listings.length > 0 
                    ? "No listings match your current filters. Try adjusting the filters above."
                    : "You haven't listed any items yet. Start earning by listing your first item!"
                  }
                </p>
                <Button
                  onClick={() => router.push('/listings/create')}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  List Your First Item
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6">
                {paginatedListings.map((listing) => (
                  <Card key={listing.id} className="p-6">
                    <div className="flex gap-6">
                      {/* Image */}
                      <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={listing.images?.[0] || '/images/placeholder-item.jpg'}
                          alt={listing.title}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                          <div className="flex items-center space-x-3">
                            <span className="text-lg font-bold text-green-600">
                              {formatPrice(listing.daily_rate)}/day
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getListingStatusColor(listing.status)}`}>
                              {getListingStatusIcon(listing.status)}
                              <span className="ml-1">{listing.status === 'pending_approval' ? 'Pending Approval' : 
                                listing.status === 'rented' ? 'Currently Rented' : 
                                listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}</span>
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-gray-600 mb-3 line-clamp-2">{listing.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {listing.category}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {format(new Date(listing.created_at), 'MMM d, yyyy')}
                          </span>
                          {listing.availability && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Available
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm text-gray-500 mb-3">
                          <div>
                            <strong>{listing.view_count}</strong> views
                          </div>
                          <div>
                            <strong>{listing.total_bookings}</strong> bookings
                          </div>
                          <div>
                            <strong>{formatPrice(listing.total_earnings)}</strong> earned
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => router.push(`/listings/${listing.id}`)}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            onClick={() => editListing(listing.id)}
                            variant="outline"
                            size="sm"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => toggleListingStatus(listing.id, listing.status)}
                            disabled={updatingListings.has(listing.id) || listing.status === 'pending_approval' || listing.status === 'rejected' || listing.status === 'rented'}
                            variant="outline"
                            size="sm"
                          >
                            {listing.status === 'pending_approval' ? (
                              <>
                                <Clock className="w-4 h-4 mr-1" />
                                Pending
                              </>
                            ) : listing.status === 'rejected' ? (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                Rejected
                              </>
                            ) : listing.status === 'rented' ? (
                              <>
                                <Users className="w-4 h-4 mr-1" />
                                In Use
                              </>
                            ) : listing.status === 'active' ? (
                              <>
                                <Pause className="w-4 h-4 mr-1" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => deleteListing(listing.id, listing.title)}
                            disabled={updatingListings.has(listing.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:border-red-300"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
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
                    Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filteredListings.length)} to {Math.min(currentPage * itemsPerPage, filteredListings.length)} of {filteredListings.length} listings
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
          </>
        )}

        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {itemBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-500 mb-6">Bookings for your items will appear here.</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {itemBookings.map((booking) => (
                  <Card key={booking.id} className="p-6">
                    <div className="flex gap-6">
                      {/* Image */}
                      <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={listings.find(l => l.id === booking.listing_id)?.images?.[0] || '/images/placeholder-item.jpg'}
                          alt={booking.listing_title}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{booking.listing_title}</h3>
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
                          Booking request from: {booking.renter.full_name}
                        </p>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            🏠 My Item
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {format(new Date(booking.start_date), 'MMM d')} - {format(new Date(booking.end_date), 'MMM d, yyyy')}
                          </span>
                        </div>

                        <div className="text-sm text-gray-500 mb-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <strong>Start:</strong> {format(new Date(booking.start_date), 'MMM d, yyyy')}
                            </div>
                            <div>
                              <strong>End:</strong> {format(new Date(booking.end_date), 'MMM d, yyyy')}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {/* Owner actions for pending booking requests */}
                          {booking.status === 'pending' && (
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

                          {/* Owner actions for return pending bookings */}
                          {booking.status === 'return_pending' && (
                            <Button
                              onClick={() => openOwnerReceiptModal(booking)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Confirm Receipt
                            </Button>
                          )}

                          {/* Common actions */}
                          <Button
                            onClick={() => {
                              // Navigate to chat with the renter (this page shows owner's view of bookings)
                              router.push(`/messages?with=${booking.renter.id}&booking=${booking.id}`);
                            }}
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
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(totalEarnings)}</p>
                    <p className="text-sm text-green-600">+12% from last month</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">This Month</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(450)}</p>
                    <p className="text-sm text-blue-600">3 completed rentals</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Avg per Booking</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {totalBookings > 0 ? formatPrice(totalEarnings / totalBookings) : formatPrice(0)}
                    </p>
                    <p className="text-sm text-purple-600">Across {totalBookings} bookings</p>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Items</h3>
              <div className="space-y-4">
                {listings.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No items to show earnings for yet.</p>
                  </div>
                ) : (
                  listings
                    .sort((a, b) => b.total_earnings - a.total_earnings)
                    .slice(0, 3)
                    .map((listing, index) => (
                      <div key={listing.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{listing.title}</p>
                            <p className="text-sm text-gray-600">{listing.total_bookings} bookings</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatPrice(listing.total_earnings)}</p>
                          <p className="text-sm text-gray-600">{formatPrice(listing.daily_rate)}/day</p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </Card>
          </div>
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
                    <X className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>

                <div className="space-y-4 md:space-y-6">
                  {/* Item Info */}
                  <div>
                    <h3 className="font-semibold mb-2 text-sm md:text-base">Item Information</h3>
                    <div className="flex items-center gap-3 md:gap-4">
                      <Image
                        src={listings.find(l => l.id === selectedBooking.listing_id)?.images?.[0] || '/images/placeholder-item.jpg'}
                        alt={selectedBooking.listing_title}
                        width={80}
                        height={80}
                        className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-lg"
                      />
                      <div>
                        <p className="font-medium text-sm md:text-base">{selectedBooking.listing_title}</p>
                        <p className="text-xs md:text-sm text-gray-600">Category: Item category</p>
                        <p className="text-xs md:text-sm text-green-600">{formatPrice(selectedBooking.total_amount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Renter Contact */}
                  <div>
                    <h3 className="font-semibold mb-2 text-sm md:text-base">Renter Contact</h3>
                    <div className="space-y-2">
                      <p className="text-sm md:text-base">{selectedBooking.renter.full_name}</p>
                      <p className="text-xs md:text-sm text-gray-600">{selectedBooking.renter.email}</p>
                      {selectedBooking.renter.phone && (
                        <p className="text-xs md:text-sm text-gray-600">{selectedBooking.renter.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Booking Dates */}
                  <div>
                    <h3 className="font-semibold mb-2 text-sm md:text-base">Booking Period</h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs md:text-sm font-medium">Start Date</p>
                          <p className="text-xs md:text-sm text-gray-600">{format(new Date(selectedBooking.start_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Calendar className="w-3 h-3 md:w-4 md:h-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs md:text-sm font-medium">End Date</p>
                          <p className="text-xs md:text-sm text-gray-600">{format(new Date(selectedBooking.end_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div>
                    <h3 className="font-semibold mb-2 text-sm md:text-base">Payment Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Amount:</span>
                        <span className="text-sm font-medium">{formatPrice(selectedBooking.total_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(selectedBooking.status)}`}>
                          {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1).replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Simple Confirmation Modal - Inline for now */}
        {confirmationModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">
                Confirm {confirmationModal.type === 'pickup' ? 'Pickup' : 'Return'}
              </h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to confirm the {confirmationModal.type} for this booking?
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (confirmationModal.type === 'pickup') {
                      handlePickupConfirmation({ notes: '', condition: 'Good' });
                    } else {
                      handleReturnConfirmation({ notes: '', condition: 'Good' });
                    }
                    closeConfirmationModal();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Confirm
                </Button>
                <Button onClick={closeConfirmationModal} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Owner Receipt Modal - Inline for now */}
        {ownerReceiptModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Confirm Item Receipt</h3>
              <p className="text-gray-600 mb-4">
                Confirm that you have received the item back from the renter.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    handleOwnerReceiptConfirmation({ 
                      notes: 'Item returned successfully', 
                      condition: 'Good', 
                      hasIssues: false 
                    });
                    closeOwnerReceiptModal();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Confirm Receipt
                </Button>
                <Button onClick={closeOwnerReceiptModal} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
} 