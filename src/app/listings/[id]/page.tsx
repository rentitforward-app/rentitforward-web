'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string | null;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  deposit_amount: number;
  images: string[];
  location: string;
  state: string;
  postcode: string;
  condition: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  features: string[];
  rules: string[];
  delivery_methods: string[];
  view_count: number;
  favorite_count: number;
  created_at: string;
  profiles: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    location: string;
    created_at: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

const bookingSchema = z.object({
  startDate: z.string().min(1, 'Please select a start date'),
  endDate: z.string().min(1, 'Please select an end date'),
  deliveryMethod: z.string().min(1, 'Please select a delivery method'),
  deliveryAddress: z.string().optional(),
  specialInstructions: z.string().optional(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end > start;
}, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type BookingForm = z.infer<typeof bookingSchema>;

export default function ListingDetailPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [bookedDates, setBookedDates] = useState<string[]>([]);

  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const listingId = params.id as string;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
  });

  const watchStartDate = watch('startDate');
  const watchEndDate = watch('endDate');
  const watchDeliveryMethod = watch('deliveryMethod');

  useEffect(() => {
    checkUser();
    fetchListing();
    fetchReviews();
    fetchBookedDates();
  }, [listingId]);

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
            location,
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
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          profiles:reviewer_id (
            full_name,
            avatar_url
          )
        `)
        .eq('reviewee_id', listing?.profiles.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching reviews:', error);
        return;
      }

      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchBookedDates = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('start_date, end_date')
        .eq('listing_id', listingId)
        .in('status', ['confirmed', 'active']);

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

  const calculateBookingCost = () => {
    if (!watchStartDate || !watchEndDate || !listing) {
      return { subtotal: 0, serviceFee: 0, total: 0, totalDays: 0 };
    }

    const start = new Date(watchStartDate);
    const end = new Date(watchEndDate);
    const totalDays = differenceInDays(end, start);

    if (totalDays <= 0) {
      return { subtotal: 0, serviceFee: 0, total: 0, totalDays: 0 };
    }

    let dailyRate = listing.daily_rate;
    
    // Apply weekly/monthly rates if available and applicable
    if (totalDays >= 28 && listing.monthly_rate) {
      const months = Math.floor(totalDays / 28);
      const remainingDays = totalDays % 28;
      dailyRate = ((months * listing.monthly_rate) + (remainingDays * listing.daily_rate)) / totalDays;
    } else if (totalDays >= 7 && listing.weekly_rate) {
      const weeks = Math.floor(totalDays / 7);
      const remainingDays = totalDays % 7;
      dailyRate = ((weeks * listing.weekly_rate) + (remainingDays * listing.daily_rate)) / totalDays;
    }

    const subtotal = dailyRate * totalDays;
    const serviceFee = subtotal * 0.1; // 10% service fee
    const total = subtotal + serviceFee + listing.deposit_amount;

    return { subtotal, serviceFee, total, totalDays };
  };

  const onSubmitBooking = async (data: BookingForm) => {
    if (!user) {
      toast.error('Please log in to make a booking');
      router.push('/login');
      return;
    }

    if (!listing) return;

    setIsBooking(true);
    try {
      const costs = calculateBookingCost();
      
      const { error } = await supabase
        .from('bookings')
        .insert({
          listing_id: listingId,
          renter_id: user.id,
          owner_id: listing.profiles.id,
          start_date: data.startDate,
          end_date: data.endDate,
          total_days: costs.totalDays,
          daily_rate: listing.daily_rate,
          subtotal: costs.subtotal,
          service_fee: costs.serviceFee,
          total_amount: costs.total,
          deposit_amount: listing.deposit_amount,
          delivery_method: data.deliveryMethod,
          delivery_address: data.deliveryAddress || null,
          special_instructions: data.specialInstructions || null,
          status: 'pending'
        });

      if (error) {
        console.error('Error creating booking:', error);
        toast.error('Failed to create booking');
        return;
      }

      toast.success('Booking request sent successfully!');
      router.push('/dashboard?tab=bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Failed to create booking');
    } finally {
      setIsBooking(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(price);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    );
  }

  const costs = calculateBookingCost();

  return (
    <div className="min-h-screen bg-gray-50">
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
              <div className="aspect-w-16 aspect-h-9 relative h-96">
                <Image
                  src={listing.images[currentImageIndex] || '/placeholder-item.jpg'}
                  alt={listing.title}
                  fill
                  className="object-cover"
                />
                
                {listing.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* Image Indicators */}
                {listing.images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {listing.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {listing.images.length > 1 && (
                <div className="p-4 bg-gray-50">
                  <div className="flex space-x-2 overflow-x-auto">
                    {listing.images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          index === currentImageIndex ? 'border-[#44D62C]' : 'border-gray-200'
                        }`}
                      >
                        <Image
                          src={image}
                          alt={`${listing.title} ${index + 1}`}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
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
                    {listing.location}, {listing.state} {listing.postcode}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
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
                  {listing.delivery_methods.map((method, index) => (
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
                    <div className="w-15 h-15 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{listing.profiles.full_name}</h3>
                  <p className="text-gray-600">{listing.profiles.location}</p>
                  <p className="text-sm text-gray-500">
                    Host since {format(new Date(listing.profiles.created_at), 'MMMM yyyy')}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                    <MessageCircle className="h-4 w-4 mr-2 inline" />
                    Message
                  </button>
                </div>
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Reviews</h2>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="flex-shrink-0">
                          {review.profiles.avatar_url ? (
                            <Image
                              src={review.profiles.avatar_url}
                              alt={review.profiles.full_name}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              <User className="h-5 w-5 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{review.profiles.full_name}</h4>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">
                            {format(new Date(review.created_at), 'MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 ml-13">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="mb-6">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-3xl font-bold text-[#44D62C]">
                      {formatPrice(listing.daily_rate)}
                    </span>
                    <span className="text-gray-600">per day</span>
                  </div>
                  {listing.weekly_rate && (
                    <p className="text-sm text-gray-600 mt-1">
                      {formatPrice(listing.weekly_rate)} per week
                    </p>
                  )}
                  {listing.monthly_rate && (
                    <p className="text-sm text-gray-600">
                      {formatPrice(listing.monthly_rate)} per month
                    </p>
                  )}
                </div>

                {user?.id !== listing.profiles.id ? (
                  <form onSubmit={handleSubmit(onSubmitBooking)} className="space-y-4">
                    {/* Date Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          {...register('startDate')}
                          type="date"
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                        />
                        {errors.startDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          {...register('endDate')}
                          type="date"
                          min={watchStartDate || format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                        />
                        {errors.endDate && (
                          <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Delivery Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delivery Method
                      </label>
                      <select
                        {...register('deliveryMethod')}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                      >
                        <option value="">Select delivery method</option>
                        {listing.delivery_methods.map((method) => (
                          <option key={method} value={method}>
                            {method.charAt(0).toUpperCase() + method.slice(1)}
                          </option>
                        ))}
                      </select>
                      {errors.deliveryMethod && (
                        <p className="mt-1 text-sm text-red-600">{errors.deliveryMethod.message}</p>
                      )}
                    </div>

                    {/* Delivery Address (if delivery selected) */}
                    {watchDeliveryMethod === 'delivery' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Delivery Address
                        </label>
                        <textarea
                          {...register('deliveryAddress')}
                          rows={3}
                          placeholder="Enter your delivery address..."
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                        />
                      </div>
                    )}

                    {/* Special Instructions */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Special Instructions (Optional)
                      </label>
                      <textarea
                        {...register('specialInstructions')}
                        rows={3}
                        placeholder="Any special requests or instructions..."
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm"
                      />
                    </div>

                    {/* Booking Summary */}
                    {costs.totalDays > 0 && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Booking Summary</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>
                              {formatPrice(listing.daily_rate)} × {costs.totalDays} {costs.totalDays === 1 ? 'day' : 'days'}
                            </span>
                            <span>{formatPrice(costs.subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Service fee</span>
                            <span>{formatPrice(costs.serviceFee)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Security deposit</span>
                            <span>{formatPrice(listing.deposit_amount)}</span>
                          </div>
                          <div className="border-t pt-2 flex justify-between font-semibold">
                            <span>Total</span>
                            <span>{formatPrice(costs.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isBooking || costs.totalDays === 0}
                      className="w-full bg-[#44D62C] text-white py-3 px-4 rounded-md font-semibold hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBooking ? 'Processing...' : 'Request to Book'}
                    </button>

                    <p className="text-xs text-gray-600 text-center">
                      You won't be charged yet. This sends a booking request to the owner.
                    </p>
                  </form>
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
      </div>
    </div>
  );
} 