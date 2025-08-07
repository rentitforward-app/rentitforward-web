'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

import { toast } from 'react-hot-toast';
import { 
  MapPin, 
  Star, 
  Heart, 
  Calendar, 
  MessageCircle, 
  Shield, 
  Truck, 
  Package,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  DollarSign,
  Info,
  Eye,
  Send
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format, addDays, parseISO } from 'date-fns';
import MessageModal from '@/components/MessageModal';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ReviewList, ReviewStats } from '@/components/reviews';
import { PaymentBookingModal } from '@/components/booking/PaymentBookingModal';
import { ImageZoomModal } from '@/components/ImageZoomModal';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  price_per_day: number;
  price_weekly: number | null;
  price_hourly: number | null;
  deposit: number;
  images: string[];
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  condition: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  features: string[];
  rules: string[];
  view_count: number;
  favorite_count: number;
  rating?: number | null;
  review_count?: number | null;
  delivery_available: boolean;
  pickup_available: boolean;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    created_at: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
  reviewee_id: string;
  type: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
  bookings?: {
    listing_id: string;
  };
}

interface RelatedListing {
  id: string;
  title: string;
  price_per_day: number;
  daily_rate?: number; // For compatibility with transformed data
  images: string[];
  city: string;
  state: string;
  condition: string;
  brand: string | null;
  model: string | null;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}



// Layout wrapper that chooses appropriate layout based on authentication
function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const supabaseClient = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();
  }, [supabaseClient]);

  // If authenticated, use AuthenticatedLayout (which replaces the entire layout)
  if (isAuthenticated) {
    return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
  }

  // For non-authenticated users or while checking auth, just return children
  // The root layout already handles Header/Footer
  return <>{children}</>;
}

export default function ListingDetailPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedListings, setRelatedListings] = useState<RelatedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0);
  
  // Booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isImageZoomOpen, setIsImageZoomOpen] = useState(false);

  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const listingId = params.id as string;



  useEffect(() => {
    checkUser();
    fetchListing();
  }, [listingId]);

  useEffect(() => {
    if (listingId) {
      fetchReviews();
    }
    if (listing) {
      fetchBookedDates();
    }
  }, [listing, listingId]);

  useEffect(() => {
    if (user && listing) {
      checkFavoriteStatus();
    }
  }, [user, listing]);

  useEffect(() => {
    // Increment view count
    if (listing && user?.id !== listing.profiles.id) {
      incrementViewCount();
    }
  }, [listing, user]);

  useEffect(() => {
    // Fetch related listings after main listing is loaded
    if (listing) {
      fetchRelatedListings();
    }
  }, [listing]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          profiles:owner_id (
            id,
            full_name,
            avatar_url,
            address,
            city,
            state,
            postal_code,
            created_at
          )
        `)
        .eq('id', listingId)
        .single();

      if (error) {
        console.error('Error fetching listing:', error);
        toast.error('Listing not found');
        router.push('/browse');
        return;
      }

      setListing(data);
    } catch (error) {
      console.error('Error fetching listing:', error);
      toast.error('Failed to load listing');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!listingId) {
      console.log('No listing ID available for reviews');
      return;
    }

    try {
      // Fetch reviews for this specific listing by joining with bookings
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:reviewer_id (
            full_name,
            avatar_url
          ),
          bookings!inner (
            listing_id
          )
        `)
        .eq('bookings.listing_id', listingId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching reviews:', error);
        return;
      }

      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchRelatedListings = async () => {
    if (!listingId) return;
    
    try {
      const response = await fetch(`/api/listings/${listingId}/related?limit=6`);
      if (response.ok) {
        const data = await response.json();
        setRelatedListings(data.listings || []);
      } else {
        console.error('Failed to fetch related listings:', response.status);
      }
    } catch (error) {
      console.error('Error fetching related listings:', error);
    }
  };

  const fetchBookedDates = async () => {
    if (!listingId) {
      console.log('No listing ID available for booked dates');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('start_date, end_date')
        .eq('listing_id', listingId)
        .in('status', ['confirmed', 'in_progress']);

      if (error) {
        console.error('Error fetching booked dates:', error);
        return;
      }

      const dates: string[] = [];
      data?.forEach(booking => {
        const start = new Date(booking.start_date);
        const end = new Date(booking.end_date);
        const current = new Date(start);

        while (current <= end) {
          dates.push(format(current, 'yyyy-MM-dd'));
          current.setDate(current.getDate() + 1);
        }
      });

      setBookedDates(dates);
    } catch (error) {
      console.error('Error fetching booked dates:', error);
    }
  };

  const checkFavoriteStatus = async () => {
    if (!user || !listing) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listing.id)
        .single();

      setIsFavorite(!!data);
    } catch (error) {
      // No favorite found, which is fine
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase
        .from('listings')
        .update({ view_count: (listing?.view_count || 0) + 1 })
        .eq('id', listingId);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast.error('Please log in to save favorites');
      router.push('/login');
      return;
    }

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);

        setIsFavorite(false);
        toast.success('Removed from favorites');
      } else {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            listing_id: listingId
          });

        setIsFavorite(true);
        toast.success('Added to favorites');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorites');
    }
  };

  const openMessageModal = () => {
    if (!user) {
      toast.error('Please log in to send a message');
      router.push('/login');
      return;
    }

    if (!listing) return;

    setIsMessageModalOpen(true);
  };



  const formatPrice = (price: number | null | undefined) => {
    // Handle string prices that come from database as strings
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (numericPrice === null || numericPrice === undefined || isNaN(numericPrice) || numericPrice === 0) {
      return 'Contact for price';
    }
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(numericPrice);
  };

  const getDisplayImage = (images: string[], index: number = 0) => {
    // Always return placeholder if no images or empty array
    if (!images || images.length === 0) {
      return '/images/placeholder-item.svg';
    }
    
    const image = images[index];
    
    // Check if image exists and hasn't failed to load
    if (!image || image.trim() === '' || imageLoadErrors.has(image)) {
      return '/images/placeholder-item.svg';
    }
    
    return image;
  };

  const handleImageError = (imageSrc: string) => {
    setImageLoadErrors(prev => new Set(prev).add(imageSrc));
  };



  const getDeliveryMethods = () => {
    if (!listing) return [];
    
    const methods = [];
    if (listing.pickup_available) {
      methods.push('pickup');
    }
    if (listing.delivery_available) {
      methods.push('delivery');
    }
    
    return methods;
  };

  const getMaskedPickupLocation = () => {
    if (!listing) return 'Pickup location not specified';
    
    // Show only city and state, hide street address and postal code for security
    const city = listing.city?.trim();
    const state = listing.state?.trim();
    
    if (city && state) {
      return `${city}, ${state}`;
    } else if (city) {
      return city;
    } else if (state) {
      return state;
    }
    
    return 'Pickup location available';
  };

  const nextImage = () => {
    if (listing && listing.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === listing.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (listing && listing.images.length > 0) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? listing.images.length - 1 : prev - 1
      );
    }
  };

  // Carousel navigation functions - Navigate by individual items
  const nextCarouselSlide = () => {
    setCurrentCarouselIndex((prev) => {
      const maxIndex = relatedListings.length - 4; // Show max 4 items on desktop
      return prev >= maxIndex ? 0 : prev + 1;
    });
  };

  const prevCarouselSlide = () => {
    setCurrentCarouselIndex((prev) => {
      const maxIndex = relatedListings.length - 4;
      return prev <= 0 ? maxIndex : prev - 1;
    });
  };

  if (isLoading) {
    return (
      <ConditionalLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
        </div>
      </ConditionalLayout>
    );
  }

  if (!listing) {
    return (
      <ConditionalLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Listing not found</h1>
            <Link
              href="/browse"
              className="text-[#44D62C] hover:text-[#3AB827] font-medium"
            >
              Browse other listings
            </Link>
          </div>
        </div>
      </ConditionalLayout>
    );
  }

  const displayImages = listing.images && listing.images.length > 0 ? listing.images : ['/images/placeholder-item.svg'];

  return (
    <ConditionalLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/browse"
            className="text-[#44D62C] hover:text-[#3AB827] font-medium"
          >
            ← Back to Browse
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="relative bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <div 
                className="aspect-w-16 aspect-h-9 relative h-96 cursor-pointer group"
                onClick={() => setIsImageZoomOpen(true)}
              >
                <Image
                  src={getDisplayImage(displayImages, currentImageIndex)}
                  alt={listing.title}
                  fill
                  className="object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-200"
                  priority
                  onError={() => handleImageError(displayImages[currentImageIndex])}
                />
                
                {/* Zoom indicator */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full p-2">
                    <Eye className="h-6 w-6 text-gray-800" />
                  </div>
                </div>
                
                {displayImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 z-10"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Image Indicators */}
                {displayImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {displayImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                        className={`w-2 h-2 rounded-full ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {displayImages.length > 1 && (
                <div className="p-4 bg-gray-50">
                  <div className="flex space-x-2 overflow-x-auto">
                    {displayImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          index === currentImageIndex ? 'border-[#44D62C]' : 'border-gray-200'
                        }`}
                      >
                        <Image
                          src={getDisplayImage(displayImages, index)}
                          alt={`${listing.title} ${index + 1}`}
                          width={80}
                          height={80}
                          className="object-contain bg-gray-50 w-full h-full"
                          onError={() => handleImageError(displayImages[index])}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Listing Details */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-5 w-5 mr-2" />
                    {listing.city}, {listing.state} {listing.postal_code}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                    <span className="capitalize">{listing.condition}</span>
                    {listing.brand && <span>{listing.brand}</span>}
                    {listing.model && <span>{listing.model}</span>}
                    {listing.year && <span>{listing.year}</span>}
                  </div>

                </div>
                
                <button
                  onClick={toggleFavorite}
                  className="p-2 rounded-full hover:bg-gray-100"
                >
                  <Heart
                    className={`h-6 w-6 ${
                      isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'
                    }`}
                  />
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
                <p className="text-gray-700 leading-relaxed">{listing.description}</p>
              </div>

              {/* Features */}
              {listing.features && listing.features.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Features</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {(showAllFeatures ? listing.features : listing.features.slice(0, 6)).map((feature, index) => (
                      <div key={index} className="flex items-center text-gray-700">
                        <div className="w-2 h-2 bg-[#44D62C] rounded-full mr-3"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  {listing.features.length > 6 && (
                    <button
                      onClick={() => setShowAllFeatures(!showAllFeatures)}
                      className="mt-2 text-[#44D62C] hover:text-[#3AB827] font-medium"
                    >
                      {showAllFeatures ? 'Show less' : `Show ${listing.features.length - 6} more features`}
                    </button>
                  )}
                </div>
              )}

              {/* Delivery Methods */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Delivery Options</h2>
                <div className="flex flex-wrap gap-2">
                  {getDeliveryMethods().map((method, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[#44D62C]/10 text-[#44D62C]"
                    >
                      {method === 'pickup' && <Package className="h-4 w-4 mr-1" />}
                      {method === 'delivery' && <Truck className="h-4 w-4 mr-1" />}
                      {method.charAt(0).toUpperCase() + method.slice(1)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rules */}
              {listing.rules && listing.rules.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">Rental Rules</h2>
                  <ul className="space-y-2">
                    {listing.rules.map((rule, index) => (
                      <li key={index} className="flex items-start text-gray-700">
                        <Info className="h-5 w-5 mr-2 text-[#44D62C] flex-shrink-0 mt-0.5" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Owner Profile */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Meet your host</h2>
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {listing.profiles.avatar_url ? (
                    <Image
                      src={listing.profiles.avatar_url}
                      alt={listing.profiles.full_name}
                      width={60}
                      height={60}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Link 
                    href={`/host/${listing.profiles.id}`}
                    className="hover:text-[#44D62C] transition-colors cursor-pointer"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 hover:text-[#44D62C] transition-colors">
                      {listing.profiles.full_name}
                    </h3>
                  </Link>
                  <p className="text-gray-600">
                    {[listing.profiles.city, listing.profiles.state].filter(Boolean).join(', ')}
                  </p>
                  <p className="text-sm text-gray-500">
                    Host since {format(new Date(listing.profiles.created_at), 'MMMM yyyy')}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={openMessageModal}
                    disabled={user?.id === listing.profiles.id}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </button>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Reviews</h2>
              
              {/* Review Statistics */}
              <ReviewStats 
                reviews={reviews as any}
                className="mb-6"
              />
              
              {/* Review List with Filters */}
              <ReviewList
                reviews={reviews as any}
                currentUserId={user?.id}
                showFilters={reviews.length > 5}
                initialFilter={{ sortBy: 'newest' }}
                emptyMessage="This listing doesn't have any reviews yet. Be the first to leave a review!"
              />
            </div>


          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pb-4 scrollbar-hide">
              <div className="bg-white rounded-lg shadow-md p-3">
                <div className="mb-3">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-[#44D62C]">
                      {listing.price_per_day && listing.price_per_day > 0 
                        ? formatPrice(listing.price_per_day)
                        : 'Contact for price'
                      }
                    </span>
                    {listing.price_per_day && listing.price_per_day > 0 && (
                      <span className="text-gray-600">per day</span>
                    )}
                  </div>
                  {listing.price_weekly && listing.price_weekly > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      {formatPrice(listing.price_weekly)} per week
                    </p>
                  )}
                  {listing.price_hourly && listing.price_hourly > 0 && (
                    <p className="text-sm text-gray-600">
                      {formatPrice(listing.price_hourly)} per hour
                    </p>
                  )}
                </div>

                {user?.id !== listing.profiles.id ? (
                  <>
                    {listing.price_per_day && listing.price_per_day > 0 ? (
                      <div className="space-y-4">
                        {/* Simple Book Now Button */}
                        <button
                          onClick={() => setIsBookingModalOpen(true)}
                          className="w-full bg-[#44D62C] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C] transition-colors duration-200 flex items-center justify-center"
                        >
                          <Calendar className="h-5 w-5 mr-2" />
                          Book Now
                        </button>

                        <p className="text-xs text-gray-600 text-center">
                          Select dates and complete your booking request
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-600 mb-4">Contact the owner for pricing and availability</p>
                        <button 
                          onClick={openMessageModal}
                          className="w-full bg-[#44D62C] text-white py-3 px-4 rounded-md font-semibold hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C] flex items-center justify-center"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Contact Owner
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">This is your listing</p>
                    <Link
                      href={`/listings/${listing.id}/edit`}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
                    >
                      Edit Listing
                    </Link>
                  </div>
                )}

                {/* Security Features */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                    <Shield className="h-5 w-5 text-[#44D62C]" />
                    <span>Secure payments & deposit protection</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Listings - Carousel */}
        {relatedListings.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Related listings you might like</h2>
              <Link
                href="/browse"
                className="hidden sm:block text-[#44D62C] hover:text-[#3AB827] font-medium text-sm"
              >
                View all
              </Link>
            </div>

            <div className="relative">
              {/* Carousel Container */}
              <div className="overflow-hidden">
                <div 
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{
                    transform: `translateX(-${currentCarouselIndex * 100}%)`
                  }}
                >
                  {/* Create slides - one item per slide for mobile, multiple for larger screens */}
                  {relatedListings.map((relatedListing, index) => (
                    <div 
                      key={`slide-${index}`}
                      className="w-full flex-shrink-0 md:w-1/3 lg:w-1/4"
                    >
                      <Link 
                        href={`/listings/${relatedListing.id}`}
                        className="group block"
                      >
                        <div className="bg-gray-50 rounded-lg overflow-hidden hover:shadow-md transition-shadow mx-2">
                          <div className="aspect-w-4 aspect-h-3 relative h-48">
                            <Image
                              src={getDisplayImage(relatedListing.images)}
                              alt={relatedListing.title}
                              fill
                              className="object-contain bg-gray-50 group-hover:scale-105 transition-transform"
                              onError={() => handleImageError(getDisplayImage(relatedListing.images))}
                            />
                          </div>
                          <div className="p-4">
                            <h3 className="font-medium text-gray-900 truncate mb-1">{relatedListing.title}</h3>
                            <p className="text-sm text-gray-600 truncate mb-2">
                              {relatedListing.city}, {relatedListing.state}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-[#44D62C] font-semibold">
                                {formatPrice(relatedListing.price_per_day)}/day
                              </span>
                              <span className="text-xs text-gray-500 capitalize">
                                {relatedListing.condition}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Arrows */}
              {relatedListings.length > 1 && (
                <>
                  <button
                    onClick={prevCarouselSlide}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg hover:shadow-xl transition-all z-10"
                    aria-label="Previous listings"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    onClick={nextCarouselSlide}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg hover:shadow-xl transition-all z-10"
                    aria-label="Next listings"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              {relatedListings.length > 4 && (
                <div className="flex justify-center mt-6 space-x-2">
                  {Array.from({ length: Math.ceil(relatedListings.length / 4) }, (_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentCarouselIndex(index * 4)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        Math.floor(currentCarouselIndex / 4) === index
                          ? 'bg-[#44D62C]' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {listing && (
        <>
          <MessageModal
            isOpen={isMessageModalOpen}
            onClose={() => setIsMessageModalOpen(false)}
            listing={listing}
            onSuccess={() => {
              toast.success('Message sent! Check your messages for replies.');
            }}
          />

                              <PaymentBookingModal
                      isOpen={isBookingModalOpen}
                      onClose={() => setIsBookingModalOpen(false)}
                      listing={listing}
                      user={user}
                    />

          <ImageZoomModal
            isOpen={isImageZoomOpen}
            onClose={() => setIsImageZoomOpen(false)}
            images={displayImages}
            initialIndex={currentImageIndex}
            title={listing.title}
          />
        </>
      )}
    </ConditionalLayout>
  );
} 