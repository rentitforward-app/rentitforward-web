'use client';

import { useEffect, useState, useRef } from 'react';
import { Heart, Star, MapPin } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// Extend global window interface for Google Maps
declare global {
  interface Window {
    google: any;
    toggleFavorite?: (listingId: string) => void;
  }
}

interface MapViewProps {
  listings: Array<{
    id: string;
    title: string;
    images: string[];
    price_per_day: number;
    rating?: number | null;
    review_count?: number | null;
    distance?: number;
    distance_km?: number;
    category?: string;
    address: string;
    city: string;
    state: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
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
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  // Check if Google Maps API is available
  const isGoogleMapsAvailable = typeof window !== 'undefined' && window.google?.maps;

  useEffect(() => {
    // Initialize map when component mounts
    initializeMap();
  }, []);

  useEffect(() => {
    // Update markers when listings change
    if (mapInstance && listings.length > 0) {
      updateMapMarkers();
    }
  }, [listings, mapInstance, favorites]);

  const initializeMap = async () => {
    try {
      if (!mapRef.current) return;

      // Check if Google Maps API is loaded
      if (!isGoogleMapsAvailable) {
        // Check if API key is available for loading
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (apiKey) {
          await loadGoogleMapsAPI(apiKey);
        } else {
          setMapError('Google Maps API key not configured');
          setIsLoading(false);
          return;
        }
      }

      // Default center (Sydney, Australia)
      const defaultCenter = { lat: -33.8688, lng: 151.2093 };
      const center = userLocation && 'lat' in userLocation 
        ? { lat: userLocation.lat, lng: userLocation.lng }
        : defaultCenter;

      // Create map instance
      const map = new window.google.maps.Map(mapRef.current, {
        zoom: userLocation ? 12 : 6,
        center: center,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      setMapInstance(map);

      // Add user location marker if available
      if (userLocation && 'lat' in userLocation) {
        new window.google.maps.Marker({
          position: { lat: userLocation.lat, lng: userLocation.lng },
          map: map,
          title: 'Your Location',
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: 'white',
            strokeWeight: 3,
          }
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize map:', error);
      setMapError('Failed to load map. Please check your internet connection.');
      setIsLoading(false);
    }
  };

  const loadGoogleMapsAPI = async (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.google?.maps) {
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Maps API'));

      document.head.appendChild(script);
    });
  };

  const updateMapMarkers = () => {
    if (!mapInstance || !window.google?.maps) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Create markers for listings with coordinates
    const listingsWithCoords = listings.filter(listing => listing.coordinates);
    
    listingsWithCoords.forEach((listing) => {
      if (!listing.coordinates) return;

      const marker = new window.google.maps.Marker({
        position: {
          lat: listing.coordinates.latitude,
          lng: listing.coordinates.longitude
        },
        map: mapInstance,
        title: listing.title,
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#16a34a',
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 2,
        }
      });

      // Create info window content
      const distance = listing.distance_km ? ` • ${listing.distance_km.toFixed(1)}km away` : '';
      const imageUrl = listing.images?.[0] || '/images/placeholder-item.jpg';
      
      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="max-width: 200px; padding: 8px;">
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${listing.title}</h3>
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #6b7280;">${listing.city}, ${listing.state}${distance}</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #16a34a;">$${listing.price_per_day}/day</p>
            <a href="/listing/${listing.id}" style="background: #16a34a; color: white; text-decoration: none; padding: 4px 8px; border-radius: 4px; font-size: 12px;">View Details</a>
          </div>
        `
      });

      // Add click listener
      marker.addListener('click', () => {
        infoWindow.open(mapInstance, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit map to show all markers if there are any
    if (markersRef.current.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markersRef.current.forEach(marker => {
        const position = marker.getPosition();
        if (position) bounds.extend(position);
      });

      // Include user location in bounds if available
      if (userLocation && 'lat' in userLocation) {
        bounds.extend(new window.google.maps.LatLng(userLocation.lat, userLocation.lng));
      }

      mapInstance.fitBounds(bounds);

      // Set reasonable zoom level
      const listener = window.google.maps.event.addListener(mapInstance, 'bounds_changed', () => {
        if (mapInstance.getZoom()! > 15) mapInstance.setZoom(15);
        window.google.maps.event.removeListener(listener);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading interactive map...</p>
        </div>
      </div>
    );
  }

  if (mapError || !isGoogleMapsAvailable) {
    return (
      <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mb-4">
            <MapPin className="w-16 h-16 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Map Unavailable
          </h3>
          <p className="text-gray-600 mb-4">
            {mapError || 'Google Maps API not configured. Please add your API key to environment variables.'}
          </p>
          <p className="text-sm text-gray-500">
            Found {listings.length} listings 
            {userLocation && ' near your location'}
          </p>
          
          {/* Fallback list view */}
          {listings.length > 0 && (
            <div className="mt-6 max-h-64 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Available Listings</h4>
              <div className="space-y-2">
                {listings.slice(0, 5).map((listing) => (
                  <div key={listing.id} className="bg-white p-3 rounded-lg shadow-sm text-left">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900 text-sm">{listing.title}</h5>
                        <p className="text-xs text-gray-600 mt-1">
                          {listing.city}, {listing.state}
                          {listing.distance_km && ` • ${listing.distance_km.toFixed(1)}km away`}
                        </p>
                        <p className="text-xs font-semibold text-green-600 mt-1">
                          ${listing.price_per_day}/day
                        </p>
                      </div>
                      {onFavoriteToggle && (
                        <button
                          onClick={() => onFavoriteToggle(listing.id)}
                          className="ml-2 p-1 hover:bg-gray-100 rounded"
                        >
                          <Heart 
                            className={`w-4 h-4 ${
                              favorites.has(listing.id) 
                                ? 'fill-red-500 text-red-500' 
                                : 'text-gray-400'
                            }`} 
                          />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {listings.length > 5 && (
                  <p className="text-xs text-gray-500 text-center">
                    And {listings.length - 5} more listings...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <div 
        ref={mapRef}
        className="w-full h-full rounded-lg"
        style={{ minHeight: '400px' }}
      />
    </div>
  );
} 