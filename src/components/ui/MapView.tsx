'use client';

import { useEffect, useState } from 'react';
import { Heart, Star } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface MapViewProps {
  listings: Array<{
    id: string;
    title: string;
    images: string[];
    price_per_day: number;
    rating?: number | null;
    review_count?: number | null;
    distance?: number;
    category?: string;
    address: string;
    city: string;
    state: string;
    profiles?: {
      full_name: string;
      avatar_url?: string | null;
    };
  }>;
  userLocation?: { lat: number; lng: number } | null;
  onFavoriteToggle?: (listingId: string) => void;
  favorites?: Set<string>;
}

export default function MapView({ 
  listings, 
  userLocation, 
  onFavoriteToggle, 
  favorites = new Set() 
}: MapViewProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate map loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🗺️</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Map View</h3>
        <p className="text-gray-600 mb-4">
          Interactive map showing {listings.length} listings in your area
        </p>
        <p className="text-sm text-gray-500">
          Map integration coming soon!
        </p>
      </div>
    </div>
  );
} 