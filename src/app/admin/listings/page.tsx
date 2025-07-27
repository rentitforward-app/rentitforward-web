'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useAdmin } from '@/hooks/use-admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Package,
  DollarSign,
  AlertCircle,
  Download,
  Plus,
  Search,
  Ban
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price_per_day: number;
  images: string[];
  approval_status: 'pending' | 'approved' | 'rejected';
  owner_profile: {
    full_name: string;
    email: string;
  };
  created_at: string;
  rejection_reason?: string;
}

type SortOption = 'created_at' | 'price_per_day' | 'title';
type FilterOption = 'all' | 'pending' | 'approved' | 'rejected';
type CategoryOption = 'all' | 'Automotive' | 'Appliances' | 'Event & Party' | 'Instruments' | 'Cameras' | 'Electronics' | 'Home & Garden' | 'Sports & Outdoors' | 'Tools & DIY' | 'Books & Learning' | 'Crafts & Creative' | 'Moving & Storage' | 'Travel & Camping' | 'Other';

export default function AdminListingsPage() {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryOption>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statsCount, setStatsCount] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
  });
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectListingId, setRejectListingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();

  const ITEMS_PER_PAGE = 24;

  useEffect(() => {
    // Don't redirect while loading admin status
    if (adminLoading) return;
    
    if (!user || !isAdmin) {
      window.location.href = '/login';
      return;
    }
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      fetchListings();
      fetchStats();
    }, searchTerm ? 500 : 0);

    return () => clearTimeout(timeoutId);
  }, [user, isAdmin, adminLoading, currentPage, searchTerm, sortBy, filterBy, categoryFilter]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      
      // Build the query
      let query = supabase
        .from('listings')
        .select(`
          id,
          title,
          description,
          category,
          price_per_day,
          images,
          approval_status,
          created_at,
          rejection_reason,
          profiles!owner_id (
            full_name,
            email
          )
        `, { count: 'exact' });

      // Apply approval status filter
      if (filterBy !== 'all') {
        query = query.eq('approval_status', filterBy);
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.or(`category.ilike.${categoryFilter},category.ilike.${categoryFilter.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`);
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
      }

      // Apply sorting
      const ascending = sortBy === 'title';
      query = query.order(sortBy, { ascending });

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedData = data?.map(listing => ({
        ...listing,
        owner_profile: Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles
      })) || [];

      setListings(formattedData);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get total count for all statuses
      const { count: totalCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true });

      const { count: approvedCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved');

      const { count: pendingCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'pending');

      const { count: rejectedCount } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'rejected');

      setStatsCount({
        total: totalCount || 0,
        approved: approvedCount || 0,
        pending: pendingCount || 0,
        rejected: rejectedCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const sendNotificationToOwner = async (listingId: string, ownerId: string, action: 'approve' | 'reject', listingTitle: string, reason?: string) => {
    try {
      // Validate required parameters
      if (!listingId || !ownerId || !listingTitle || !action) {
        console.error('Missing required parameters for notification:', {
          listingId: !!listingId,
          ownerId: !!ownerId,
          listingTitle: !!listingTitle,
          action: !!action
        });
        return;
      }

      // For now, let's skip notifications due to permission issues and just log success
      console.log('Would send notification:', {
        action,
        listingTitle,
        ownerId,
        reason
      });
      
      toast.success(`Listing ${action}d successfully (notification skipped due to permissions)`);
      return;

      // TODO: Fix notification permissions and re-enable this code
      /*
      const notificationData = {
        user_id: ownerId,
        title: action === 'approve' ? 'Listing Approved!' : 'Listing Rejected',
        message: action === 'approve' 
          ? `Your listing "${listingTitle}" has been approved and is now live on the platform.`
          : `Your listing "${listingTitle}" has been rejected. ${reason ? `Reason: ${reason}` : 'Please review and resubmit.'}`,
        type: 'listing' as const,
        related_id: listingId,
      };

      console.log('Attempting to send notification with data:', JSON.stringify(notificationData, null, 2));

      // Check authentication before sending notification
      const { data: sessionData } = await supabase.auth.getSession();
      console.log('Session before notification:', {
        hasSession: !!sessionData?.session,
        userId: sessionData?.session?.user?.id,
        email: sessionData?.session?.user?.email
      });

      if (!sessionData?.session) {
        console.error('No valid session found for notification');
        toast.error('Authentication expired. Please refresh and try again.');
        return;
      }

      const { data: notificationResult, error: notificationError } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select();

      if (notificationError) {
        console.error('Full Supabase notification error object:', notificationError);
        console.error('Error type:', typeof notificationError);
        console.error('Error properties:', Object.keys(notificationError));
        console.error('Stringified error:', JSON.stringify(notificationError, null, 2));
        console.error('Failed notification data:', JSON.stringify(notificationData, null, 2));
        
        // Try to extract meaningful error message
        const errorMessage = notificationError?.message || 'Unknown notification error';
        console.error('Extracted error message:', errorMessage);
        
        toast.error(`Failed to send notification: ${errorMessage}`);
      } else {
        console.log('Notification sent successfully:', notificationResult);
        toast.success('Owner notified successfully');
      }
      */
    } catch (error) {
      console.error('Unexpected error sending notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const handleApproval = async (listingId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      console.log(`Attempting to ${action} listing:`, listingId);
      console.log('Current user:', user?.id, user?.email);
      console.log('Admin status:', isAdmin);
      
      // Check Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', sessionData?.session?.user?.id, sessionData?.session?.user?.email);
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Authentication error. Please refresh and try again.');
        return;
      }
      
      // Validate authentication
      if (!user?.id || !sessionData?.session?.user?.id) {
        toast.error('Authentication required. Please refresh the page and try again.');
        return;
      }

      // Find the listing to get owner info and title
      const listing = listings.find(l => l.id === listingId);
      if (!listing) {
        console.error('Listing not found in local state:', listingId);
        toast.error('Listing not found');
        return;
      }

      console.log('Found listing:', {
        id: listing.id,
        title: listing.title,
        owner: listing.owner_profile?.full_name
      });

      const updateData: any = {
        approval_status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      };

      // Only add rejection reason if rejecting and reason provided
      if (action === 'reject' && reason) {
        updateData.rejection_reason = reason;
      }

      // Clear rejection reason when approving
      if (action === 'approve') {
        updateData.rejection_reason = null;
      }

      console.log('Update data:', JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listingId)
        .select();

      if (error) {
        console.error('Full Supabase update error object:', error);
        console.error('Error type:', typeof error);
        console.error('Error properties:', Object.keys(error));
        console.error('Stringified error:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('Updated listing successfully:', data);
      
      // Send notification to the listing owner
      const { data: ownerData, error: ownerError } = await supabase
        .from('listings')
        .select('owner_id')
        .eq('id', listingId)
        .single();

      if (ownerError) {
        console.error('Error fetching owner data:', ownerError);
      } else if (ownerData?.owner_id) {
        console.log('Sending notification to owner:', ownerData.owner_id);
        await sendNotificationToOwner(listingId, ownerData.owner_id, action, listing.title, reason);
      } else {
        console.warn('No owner data found for listing:', listingId);
      }

      toast.success(`Listing ${action}d successfully`);
      
      // Refresh the listings and stats to show updated status
      await fetchListings();
      await fetchStats();
    } catch (error) {
      console.error(`Full error object when ${action}ing listing:`, error);
      console.error('Error type:', typeof error);
      console.error('Error properties:', error ? Object.keys(error) : 'null');
      console.error('Stringified error:', JSON.stringify(error, null, 2));
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Extracted error message:', errorMessage);
      
      toast.error(`Failed to ${action} listing: ${errorMessage}`);
    }
  };

  const handleReject = (listingId: string) => {
    setRejectListingId(listingId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (rejectListingId && rejectReason.trim()) {
      await handleApproval(rejectListingId, 'reject', rejectReason.trim());
      setShowRejectModal(false);
      setRejectListingId(null);
      setRejectReason('');
    } else {
      toast.error('Please provide a reason for rejection');
    }
  };

  const renderPagination = () => {
    if (totalCount <= ITEMS_PER_PAGE) return null;

    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, totalCount)} to {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} listings
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              size="sm"
            >
              Previous
            </Button>
            
            {/* Page numbers */}
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, Math.ceil(totalCount / ITEMS_PER_PAGE)) }, (_, i) => {
                const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
                let pageNumber;
                
                if (totalPages <= 5) {
                  pageNumber = i + 1;
                } else if (currentPage <= 3) {
                  pageNumber = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNumber = totalPages - 4 + i;
                } else {
                  pageNumber = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`px-3 py-1 text-sm rounded ${
                      currentPage === pageNumber
                        ? 'bg-red-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / ITEMS_PER_PAGE), currentPage + 1))}
              disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Access denied. Admin privileges required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listing Management</h1>
          <p className="text-gray-600">Review and approve user submissions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => {}}>
            <Download className="w-4 h-4 mr-2" />
            Export Listings
          </Button>
          <Button onClick={() => {}}>
            <Plus className="w-4 h-4 mr-2" />
            Add Listing
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Listings</p>
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
              <p className="text-sm font-medium text-gray-500">Approved Listings</p>
              <p className="text-2xl font-bold text-gray-900">{statsCount.approved}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Review</p>
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
              <p className="text-sm font-medium text-gray-500">Rejected Listings</p>
              <p className="text-2xl font-bold text-gray-900">{statsCount.rejected}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
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
                placeholder="Search listings by title, category, or owner..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={filterBy}
              onChange={(e) => {
                setFilterBy(e.target.value as FilterOption);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Listings</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value as CategoryOption);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Categories</option>
              <option value="Automotive">Automotive</option>
              <option value="Appliances">Appliances</option>
              <option value="Event & Party">Event & Party</option>
              <option value="Instruments">Instruments</option>
              <option value="Cameras">Cameras</option>
              <option value="Electronics">Electronics</option>
              <option value="Home & Garden">Home & Garden</option>
              <option value="Sports & Outdoors">Sports & Outdoors</option>
              <option value="Tools & DIY">Tools & DIY</option>
              <option value="Books & Learning">Books & Learning</option>
              <option value="Crafts & Creative">Crafts & Creative</option>
              <option value="Moving & Storage">Moving & Storage</option>
              <option value="Travel & Camping">Travel & Camping</option>
              <option value="Other">Other</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="created_at">Sort by: Newest</option>
              <option value="price_per_day">Sort by: Price</option>
              <option value="title">Sort by: Title</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Top Pagination */}
      {renderPagination()}

      {/* Listings */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
              ) : listings.length === 0 ? (
          <Card className="p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No listings found</h3>
          <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </Card>
        ) : (
          <div className="grid gap-6">
          {listings.map((listing) => (
              <Card key={listing.id} className="p-6">
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="w-32 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {listing.images && listing.images.length > 0 ? (
                      <Image
                        src={listing.images[0]}
                        alt={listing.title}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200">
                        <span className="text-gray-400 text-sm">No image</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{listing.title}</h3>
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(listing.price_per_day)}/day
                      </span>
                      {getStatusBadge(listing.approval_status)}
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
                    </div>

                    <div className="text-sm text-gray-500 mb-3">
                      <strong>Owner:</strong> {listing.owner_profile?.full_name} ({listing.owner_profile?.email})
                    </div>

                    {listing.rejection_reason && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          <strong>Rejection Reason:</strong> {listing.rejection_reason}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                      onClick={() => router.push(`/admin/listings/${listing.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </Button>
                      
                    {listing.approval_status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproval(listing.id, 'approve')}
                          className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(listing.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}

                    {listing.approval_status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(listing.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Disable
                      </Button>
                    )}

                    {listing.approval_status === 'rejected' && (
                      <Button
                        size="sm"
                        onClick={() => handleApproval(listing.id, 'approve')}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Re-approve
                      </Button>
                    )}


                  </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

      {/* Bottom Pagination */}
      {renderPagination()}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Listing
            </h3>
            <p className="text-gray-600 mb-4">
              Please provide a reason for rejecting this listing. This will be sent to the owner.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end space-x-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectListingId(null);
                  setRejectReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmReject}
                disabled={!rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
              >
                Reject Listing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 