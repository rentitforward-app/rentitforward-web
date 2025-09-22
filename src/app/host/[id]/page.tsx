'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { 
  User, 
  MapPin, 
  Star,
  Calendar,
  Award,
  CheckCircle,
  ChevronLeft,
  MessageCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { ReviewList, ReviewStats } from '@/components/reviews';
import MessageModal from '@/components/MessageModal';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import { useAuth } from '@/hooks/use-auth';

interface HostProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  verified: boolean;
  created_at: string;
}

interface HostListing {
  id: string;
  title: string;
  price_per_day: number;
  images: string[];
  city: string;
  state: string;
  condition: string;
  category: string;
  created_at: string;
  is_active: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
  tags: string[] | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  bookings?: {
    listing_id: string;
    listings: {
      title: string;
      owner_id: string;
    };
  };
}

function HostProfileContent() {
  const [host, setHost] = useState<HostProfile | null>(null);
  const [listings, setListings] = useState<HostListing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const params = useParams();
  const hostId = params.id as string;
  const supabase = createClient();

  useEffect(() => {
    if (hostId) {
      fetchHostProfile();
      fetchHostListings();
      fetchHostReviews();
      checkCurrentUser();
    }
  }, [hostId]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchHostProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', hostId)
        .single();

      if (error) {
        console.error('Error fetching host profile:', error);
        toast.error('Host profile not found');
        return;
      }

      setHost(data);
    } catch (error) {
      console.error('Error fetching host profile:', error);
      toast.error('Failed to load host profile');
    }
  };

  const fetchHostListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, price_per_day, images, city, state, condition, category, created_at, is_active')
        .eq('owner_id', hostId)
        .eq('is_active', true) // Use is_active boolean field instead of status
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching host listings:', error);
        return;
      }

      setListings(data || []);
    } catch (error) {
      console.error('Error fetching host listings:', error);
    }
  };

  const fetchHostReviews = async () => {
    try {
      // Fetch reviews for all listings owned by this host
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer_id,
          tags,
          profiles:reviewer_id (
            full_name,
            avatar_url
          ),
          bookings!inner (
            listing_id,
            listings!inner (
              title,
              owner_id
            )
          )
        `)
        .eq('bookings.listings.owner_id', hostId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching host reviews:', error);
        return;
      }

      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching host reviews:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getDisplayImage = (images: string[]) => {
    if (!images || images.length === 0) {
      return '/images/placeholder-item.svg';
    }
    return images[0] || '/images/placeholder-item.svg';
  };

  const calculateAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / reviews.length);
  };

  const openMessageModal = () => {
    if (!currentUser) {
      toast.error('Please log in to send a message');
      return;
    }
    setIsMessageModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
      </div>
    );
  }

  if (!host) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Host not found</h1>
          <Link
            href="/browse"
            className="text-[#44D62C] hover:text-[#3AB827] font-medium"
          >
            Browse listings
          </Link>
        </div>
      </div>
    );
  }

  const averageRating = calculateAverageRating();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/browse"
            className="text-[#44D62C] hover:text-[#3AB827] font-medium flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Browse
          </Link>
        </div>

        {/* Host Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              {host.avatar_url ? (
                <Image
                  src={host.avatar_url}
                  alt={host.full_name}
                  width={120}
                  height={120}
                  className="rounded-full"
                />
              ) : (
                <div className="w-30 h-30 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{host.full_name}</h1>
                  <div className="flex items-center space-x-4 mb-4">
                    {host.city && host.state && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-5 w-5 mr-2" />
                        {host.city}, {host.state}
                      </div>
                    )}
                    {host.verified && (
                      <div className="flex items-center text-[#44D62C]">
                        <CheckCircle className="h-5 w-5 mr-1" />
                        Verified Host
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-600 mb-4">
                    <span>Host since {format(new Date(host.created_at), 'MMMM yyyy')}</span>
                    <span>{listings.length} active listings</span>
                    {reviews.length > 0 && (
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                        <span>{averageRating.toFixed(1)} ({reviews.length} reviews)</span>
                      </div>
                    )}
                  </div>
                  {host.bio && (
                    <p className="text-gray-700 max-w-2xl">{host.bio}</p>
                  )}
                </div>
                {currentUser?.id !== host.id && (
                  <button
                    onClick={openMessageModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message Host
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('listings')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'listings'
                    ? 'border-[#44D62C] text-[#44D62C]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Listings ({listings.length})
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'reviews'
                    ? 'border-[#44D62C] text-[#44D62C]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Reviews ({reviews.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'listings' && (
              <div>
                {listings.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {listings.map((listing) => (
                      <Link
                        key={listing.id}
                        href={`/listings/${listing.id}`}
                        className="group"
                      >
                        <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                          <div className="aspect-w-4 aspect-h-3 relative h-48">
                            <Image
                              src={getDisplayImage(listing.images)}
                              alt={listing.title}
                              fill
                              className="object-contain bg-gray-50 group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="font-medium text-gray-900 truncate mb-1">
                              {listing.title}
                            </h3>
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {listing.city}, {listing.state}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[#44D62C] font-semibold">
                                {formatPrice(listing.price_per_day)}/day
                              </span>
                              <span className="text-xs text-gray-500 capitalize">
                                {listing.condition}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">This host doesn't have any active listings yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {/* Review Statistics */}
                    <ReviewStats 
                      reviews={reviews}
                      showDistribution={true}
                      className="mb-6"
                    />
                    
                    {/* Review List */}
                    <ReviewList
                      reviews={reviews}
                      currentUserId={currentUser?.id}
                      showFilters={reviews.length > 5}
                      initialFilter={{ sortBy: 'newest' }}
                      emptyMessage="This host doesn't have any reviews yet."
                    />
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <Star className="w-12 h-12 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                    <p className="text-gray-600">This host hasn't received any reviews yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message Modal */}
      {host && (
        <MessageModal
          isOpen={isMessageModalOpen}
          onClose={() => setIsMessageModalOpen(false)}
          listing={{
            id: '',
            title: 'Message to Host',
            profiles: host
          } as any}
          onSuccess={() => {
            toast.success('Message sent! Check your messages for replies.');
          }}
        />
      )}
    </div>
  );
}

export default function HostProfilePage() {
  const { isAuthenticated, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#44D62C] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // For authenticated users, show full layout with left sidebar
  if (isAuthenticated) {
    return (
      <AuthenticatedLayout>
        <HostProfileContent />
      </AuthenticatedLayout>
    );
  }

  // For non-authenticated users, show simple layout without left sidebar
  return (
    <div className="min-h-screen bg-gray-50">
      <HostProfileContent />
    </div>
  );
} 