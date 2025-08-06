'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { format, addDays, differenceInDays, parseISO } from 'date-fns';
import MessageModal from '@/components/MessageModal';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ReviewList, ReviewStats } from '@/components/reviews';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import { PricingBreakdown } from '@/components/booking/PricingBreakdown';
import { BookingRequestForm } from '@/components/booking/BookingRequestForm';
import { DateRangeSelection } from '@/lib/calendar-utils';

export default function ListingDetailPage() {
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState({
    startDate: null,
    endDate: null
  });
  const [showPricing, setShowPricing] = useState(false);
  const [includeInsurance, setIncludeInsurance] = useState(false);

  const params = useParams();
  const router = useRouter();

  const handleDateSelection = (selection) => {
    setSelectedDates({ 
      startDate: selection.startDate, 
      endDate: selection.endDate 
    });
    if (selection.startDate && selection.endDate) {
      setShowPricing(true);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/browse"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            ← Back to Browse
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Sample Listing</h1>
              <p className="text-gray-600">This is a test listing page with the new booking flow.</p>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-6">
                <span className="text-3xl font-bold text-green-600">$50</span>
                <span className="text-gray-600">per day</span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Dates</h3>
                  <AvailabilityCalendar
                    listingId="test-listing"
                    onDatesSelected={handleDateSelection}
                  />
                </div>

                {showPricing && selectedDates.startDate && selectedDates.endDate && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Price Breakdown</h3>
                    <PricingBreakdown
                      dailyRate={50}
                      startDate={selectedDates.startDate}
                      endDate={selectedDates.endDate}
                      deposit={0}
                      includeInsurance={includeInsurance}
                      onInsuranceChange={setIncludeInsurance}
                      showPointsRedemption={true}
                      availablePoints={0}
                    />
                  </div>
                )}

                {showPricing && selectedDates.startDate && selectedDates.endDate && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Complete Your Request</h3>
                    <BookingRequestForm
                      listingId="test-listing"
                      startDate={selectedDates.startDate}
                      endDate={selectedDates.endDate}
                      dailyRate={50}
                      deposit={0}
                      includeInsurance={includeInsurance}
                      onSuccess={() => {
                        router.push('/dashboard?tab=bookings');
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}