'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useAdmin } from '@/hooks/use-admin';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import Image from 'next/image';

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

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
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
  }, [user, isAdmin, adminLoading, filter]);

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
        .eq('approval_status', filter)
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

  // Show loading while checking admin status
  if (adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Listing Management</h1>
          <p className="text-gray-600">Review and approve user submissions</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {(['pending', 'approved', 'rejected'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    filter === status
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {status} Listings
                  {status === 'pending' && (
                    <Clock className="w-4 h-4 inline ml-1" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : listings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No {filter} listings found.</p>
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
                      <span className="text-lg font-bold text-green-600">
                        ${listing.price_per_day}/day
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">{listing.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {listing.category}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {new Date(listing.created_at).toLocaleDateString()}
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
                      
                      {filter === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApproval(listing.id, 'approve')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(listing.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 