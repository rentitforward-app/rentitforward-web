'use client';

import { useState, useEffect } from 'react';
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
  Edit,
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

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created_at');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const supabase = createClient();

  useEffect(() => {
    // Don't redirect while loading admin status
    if (adminLoading) return;
    
    if (!user || !isAdmin) {
      window.location.href = '/login';
      return;
    }
    fetchListings();
  }, [user, isAdmin, adminLoading]);

  useEffect(() => {
    filterAndSortListings();
  }, [listings, searchTerm, sortBy, filterBy]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
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
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map(listing => ({
        ...listing,
        owner_profile: Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles
      }));

      setListings(formattedData);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Failed to fetch listings');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortListings = () => {
    let filtered = [...listings];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.owner_profile?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.owner_profile?.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter(listing => listing.approval_status === filterBy);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'price_per_day':
          return b.price_per_day - a.price_per_day;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredListings(filtered);
  };

  const handleApproval = async (listingId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const updateData: any = {
        approval_status: action === 'approve' ? 'approved' : 'rejected',
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      };

      if (action === 'approve') {
        updateData.is_active = true;
      } else if (reason) {
        updateData.rejection_reason = reason;
      }

      const { error } = await supabase
        .from('listings')
        .update(updateData)
        .eq('id', listingId);

      if (error) throw error;

      toast.success(`Listing ${action}d successfully`);
      fetchListings();
    } catch (error) {
      console.error(`Error ${action}ing listing:`, error);
      toast.error(`Failed to ${action} listing`);
    }
  };

  const handleReject = (listingId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason) {
      handleApproval(listingId, 'reject', reason);
    }
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
              <p className="text-sm font-medium text-gray-500">Approved Listings</p>
              <p className="text-2xl font-bold text-gray-900">{listings.filter(l => l.approval_status === 'approved').length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{listings.filter(l => l.approval_status === 'pending').length}</p>
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
              <p className="text-2xl font-bold text-gray-900">{listings.filter(l => l.approval_status === 'rejected').length}</p>
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
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Listings</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="created_at">Sort by: Newest</option>
              <option value="price_per_day">Sort by: Price</option>
              <option value="title">Sort by: Title</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Listings */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredListings.length === 0 ? (
        <Card className="p-8 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">No listings found</h3>
          <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {filteredListings.map((listing) => (
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
                      onClick={() => window.open(`/listings/${listing.id}`, '_blank')}
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
                        onClick={() => handleApproval(listing.id, 'reject')}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Disable
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {}}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 