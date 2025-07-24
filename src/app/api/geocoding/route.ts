import { NextRequest, NextResponse } from 'next/server';

// Define types locally until shared package is properly linked
interface Coordinates {
  latitude: number;
  longitude: number;
}

interface Location extends Coordinates {
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

interface GeocodingResult {
  success: boolean;
  location?: Location;
  coordinates?: Coordinates;
  suggestions?: any[];
  address?: any;
  error?: string;
}

interface GeocodingConfig {
  apiKey: string;
  provider: 'google' | 'mapbox' | 'nominatim';
  language?: string;
  region?: string;
}

/**
 * Google Places Autocomplete for address suggestions
 */
async function getAddressSuggestions(input: string, config: GeocodingConfig): Promise<GeocodingResult> {
  console.log('🔍 getAddressSuggestions called with:', { input, provider: config.provider, hasApiKey: !!config.apiKey });
  
  if (config.provider === 'google' && config.apiKey) {
    const params = new URLSearchParams({
      input: input,
      key: config.apiKey,
      components: `country:${config.region || 'au'}`,
      language: config.language || 'en',
      types: 'address',
    });

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
    console.log('📡 Making Google Places API call to:', url);

    const response = await fetch(url);
    console.log('📊 Google Places API response status:', response.status, response.statusText);

    if (!response.ok) {
      console.error('❌ Google Places API HTTP error:', response.status, response.statusText);
      return { success: false, error: `Google Places API error: ${response.statusText}` };
    }

    const data = await response.json();
    console.log('📋 Google Places API response data:', data);

    if (data.status === 'OK') {
      // Get place details for each suggestion to include coordinates
      const detailedSuggestions = await Promise.all(
        data.predictions.slice(0, 5).map(async (prediction: any) => {
          const detailsParams = new URLSearchParams({
            place_id: prediction.place_id,
            key: config.apiKey,
            fields: 'formatted_address,geometry,address_components',
          });

          const detailsResponse = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`
          );

          if (detailsResponse.ok) {
            const detailsData = await detailsResponse.json();
            if (detailsData.status === 'OK') {
              return {
                ...prediction,
                ...detailsData.result,
              };
            }
          }
          return prediction;
        })
      );

      return {
        success: true,
        suggestions: detailedSuggestions,
      };
    } else {
      return { success: false, error: `Google Places API error: ${data.status}` };
    }
  }

  // Fallback: return input as single suggestion
  return {
    success: true,
    suggestions: [{
      formatted_address: input,
      description: input,
    }],
  };
}

/**
 * Basic geocoding function using Google Maps API
 */
async function geocodeAddress(address: string, config: GeocodingConfig): Promise<GeocodingResult> {
  if (config.provider === 'google' && config.apiKey) {
    const params = new URLSearchParams({
      address: address,
      key: config.apiKey,
      region: config.region || 'au',
      language: config.language || 'en',
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    );

    if (!response.ok) {
      return { success: false, error: `Google Geocoding API error: ${response.statusText}` };
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      return { success: false, error: data.error_message || `Google Geocoding error: ${data.status}` };
    }

    if (data.results.length === 0) {
      return { success: false, error: 'No results found for the provided address' };
    }

    const result = data.results[0];
    const coordinates: Coordinates = {
      latitude: result.geometry.location.lat,
      longitude: result.geometry.location.lng,
    };

    const location: Location = {
      ...coordinates,
      address: result.formatted_address,
      city: getAddressComponent(result.address_components, ['locality', 'administrative_area_level_2']) || '',
      state: getAddressComponent(result.address_components, ['administrative_area_level_1']) || '',
      postal_code: getAddressComponent(result.address_components, ['postal_code']) || '',
      country: getAddressComponent(result.address_components, ['country']) || '',
    };

    return { success: true, location, coordinates };
  }

  // Fallback to Nominatim (free) for now
  return await geocodeWithNominatim(address);
}

/**
 * Reverse geocoding function
 */
async function reverseGeocode(coordinates: Coordinates, config: GeocodingConfig): Promise<GeocodingResult> {
  if (config.provider === 'google' && config.apiKey) {
    const params = new URLSearchParams({
      latlng: `${coordinates.latitude},${coordinates.longitude}`,
      key: config.apiKey,
      language: config.language || 'en',
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`
    );

    if (!response.ok) {
      return { success: false, error: `Google Reverse Geocoding API error: ${response.statusText}` };
    }

    const data = await response.json();

    if (data.status !== 'OK') {
      return { success: false, error: data.error_message || `Google Reverse Geocoding error: ${data.status}` };
    }

    if (data.results.length === 0) {
      return { success: false, error: 'No address found for the provided coordinates' };
    }

    const result = data.results[0];
    const location: Location = {
      ...coordinates,
      address: result.formatted_address,
      city: getAddressComponent(result.address_components, ['locality', 'administrative_area_level_2']) || '',
      state: getAddressComponent(result.address_components, ['administrative_area_level_1']) || '',
      postal_code: getAddressComponent(result.address_components, ['postal_code']) || '',
      country: getAddressComponent(result.address_components, ['country']) || '',
    };

    return { success: true, location, coordinates };
  }

  return { success: false, error: 'Reverse geocoding not available with free provider' };
}

/**
 * Free geocoding using Nominatim
 */
async function geocodeWithNominatim(address: string): Promise<GeocodingResult> {
  const params = new URLSearchParams({
    q: address,
    format: 'json',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'au',
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent': 'RentItForward/1.0',
      },
    }
  );

  if (!response.ok) {
    return { success: false, error: `Nominatim API error: ${response.statusText}` };
  }

  const data = await response.json();

  if (data.length === 0) {
    return { success: false, error: 'No results found for the provided address' };
  }

  const result = data[0];
  const coordinates: Coordinates = {
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
  };

  const addressData = result.address || {};
  const location: Location = {
    ...coordinates,
    address: result.display_name,
    city: addressData.city || addressData.suburb || '',
    state: addressData.state || '',
    postal_code: addressData.postcode || '',
    country: addressData.country || 'Australia',
  };

  return { success: true, location, coordinates };
}

/**
 * Helper function to extract address component from Google's response
 */
function getAddressComponent(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  types: string[]
): string | null {
  for (const component of components) {
    if (types.some(type => component.types.includes(type))) {
      return component.long_name;
    }
  }
  return null;
}

/**
 * Check if geocoding result is within Australia
 */
function isValidAustralianResult(result: GeocodingResult): boolean {
  if (!result.success || !result.coordinates) {
    return false;
  }

  const { latitude, longitude } = result.coordinates;
  
  // Approximate bounds of Australia
  const australiaBounds = {
    north: -9,      // Cape York, Queensland
    south: -55,     // Heard Island (including territories)
    east: 169,      // Norfolk Island
    west: 96,       // Western Australia coast
  };
  
  return (
    latitude <= australiaBounds.north &&
    latitude >= australiaBounds.south &&
    longitude <= australiaBounds.east &&
    longitude >= australiaBounds.west
  );
}

/**
 * Handle reverse geocoding request
 */
async function handleReverseGeocode(lat: number, lng: number) {
  try {
    const provider = process.env.GEOCODING_PROVIDER as 'google' | 'mapbox' | 'nominatim' || 'nominatim';
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    const config: GeocodingConfig = {
      provider: apiKey ? provider : 'nominatim',
      apiKey,
      language: 'en',
      region: 'au',
    };

    if (config.provider === 'google' && config.apiKey) {
      const params = new URLSearchParams({
        latlng: `${lat},${lng}`,
        key: config.apiKey,
        language: 'en',
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          return NextResponse.json({
            success: true,
            address: data.results[0],
            coordinates: { lat, lng },
          });
        }
      }
    }

    return NextResponse.json(
      { error: 'Reverse geocoding failed' },
      { status: 500 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Reverse geocoding error' },
      { status: 500 }
    );
  }
}

/**
 * Handle address autocomplete request
 */
async function handleAddressAutocomplete(input: string) {
  try {
    console.log('🔍 Address autocomplete request for:', input);
    
    const provider = process.env.GEOCODING_PROVIDER as 'google' | 'mapbox' | 'nominatim' || 'nominatim';
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    console.log('🔧 API Configuration:', { provider, hasApiKey: !!apiKey });
    
    const config: GeocodingConfig = {
      provider: apiKey ? provider : 'nominatim',
      apiKey,
      language: 'en',
      region: 'au',
    };

    console.log('🚀 Calling getAddressSuggestions with config:', config.provider);
    const result = await getAddressSuggestions(input, config);
    console.log('📝 Autocomplete result:', result);
    
    if (result.success) {
      console.log('✅ Autocomplete successful, returning suggestions');
      return NextResponse.json({
        success: true,
        suggestions: result.suggestions,
      });
    } else {
      console.error('❌ Autocomplete failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Address autocomplete failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('🚨 Autocomplete exception:', error);
    return NextResponse.json(
      { error: 'Address autocomplete error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/geocoding
 * Geocode an address to coordinates, get address suggestions, or reverse geocode
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, city, state, country = 'Australia', coordinates } = body;

    // Handle reverse geocoding (coordinates to address)
    if (coordinates && coordinates.lat && coordinates.lng) {
      return await handleReverseGeocode(coordinates.lat, coordinates.lng);
    }

    // Handle address autocomplete (search suggestions)
    if (address && !city && !state) {
      return await handleAddressAutocomplete(address);
    }

    // Handle full geocoding (address to coordinates)
    if (!address || !city || !state) {
      return NextResponse.json(
        { error: 'Address, city, and state are required for geocoding, or just address for autocomplete' },
        { status: 400 }
      );
    }

    // Get API configuration from environment
    const provider = process.env.GEOCODING_PROVIDER as 'google' | 'mapbox' | 'nominatim' || 'nominatim';
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.MAPBOX_ACCESS_TOKEN || '';

    if ((provider === 'google' || provider === 'mapbox') && !apiKey) {
      console.warn(`${provider} provider selected but no API key found, falling back to nominatim`);
    }

    const config: GeocodingConfig = {
      provider: apiKey ? provider : 'nominatim',
      apiKey,
      language: 'en',
      region: 'au',
    };

    // Construct full address
    const fullAddress = `${address}, ${city}, ${state}, ${country}`;

    console.log(`🗺️ Geocoding address: ${fullAddress} using ${config.provider}`);

    // Geocode the address
    const result = await geocodeAddress(fullAddress, config);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Geocoding failed' },
        { status: 422 }
      );
    }

    // Validate result is within Australia
    if (!isValidAustralianResult(result)) {
      return NextResponse.json(
        { error: 'Address not found within Australia' },
        { status: 422 }
      );
    }

    console.log(`✅ Geocoding successful: ${result.coordinates?.latitude}, ${result.coordinates?.longitude}`);

    return NextResponse.json({
      success: true,
      coordinates: result.coordinates,
      location: result.location,
      provider: config.provider,
    });

  } catch (error) {
    console.error('🚨 Geocoding API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error during geocoding' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/geocoding/reverse?lat=...&lng=...
 * Reverse geocode coordinates to an address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Invalid coordinates provided' },
        { status: 400 }
      );
    }

    // Get API configuration from environment
    const provider = process.env.GEOCODING_PROVIDER as 'google' | 'mapbox' | 'nominatim' || 'nominatim';
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.MAPBOX_ACCESS_TOKEN || '';

    const config: GeocodingConfig = {
      provider: apiKey ? provider : 'nominatim',
      apiKey,
      language: 'en',
      region: 'au',
    };

    console.log(`🗺️ Reverse geocoding: ${latitude}, ${longitude} using ${config.provider}`);

    // Reverse geocode the coordinates
    const result = await reverseGeocode({ latitude, longitude }, config);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Reverse geocoding failed' },
        { status: 422 }
      );
    }

    console.log(`✅ Reverse geocoding successful: ${result.location?.address}`);

    return NextResponse.json({
      success: true,
      location: result.location,
      provider: config.provider,
    });

  } catch (error) {
    console.error('🚨 Reverse geocoding API error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error during reverse geocoding' },
      { status: 500 }
    );
  }
} 