# Location and Geocoding Setup Guide

This guide explains how to set up and configure the location-based features including geocoding, distance calculation, and spatial database optimization.

## 🗺️ Overview

The location system includes:
- **Real geocoding** using Google Maps, MapBox, or free Nominatim APIs
- **Distance calculation** using the Haversine formula
- **Spatial database indexing** for high-performance location queries
- **Cross-platform support** for both web and mobile applications

## 📋 Prerequisites

1. **Supabase project** with PostGIS extension enabled
2. **Geocoding API access** (recommended: Google Maps API or MapBox)
3. **Node.js 18+** for running migration scripts
4. **Database admin access** for creating indexes and functions

## 🔧 Setup Instructions

### Step 1: Enable PostGIS Extension

In your Supabase SQL editor, run:

```sql
-- Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify PostGIS is working
SELECT PostGIS_Version();
```

### Step 2: Configure Environment Variables

#### Web Application (.env.local)

```bash
# Geocoding API Configuration
GEOCODING_PROVIDER=google  # Options: 'google', 'mapbox', 'nominatim'

# Google Maps API (recommended)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key  # For client-side maps

# Alternative: MapBox API
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### Mobile Application

Update the geocoding API URL in `app/(tabs)/create.tsx`:

```typescript
const apiUrl = __DEV__ 
  ? 'http://localhost:3000/api/geocoding'  // Development
  : 'https://your-production-domain.com/api/geocoding';  // Update this!
```

### Step 3: Run Spatial Database Migration

#### Option A: Automated Script (Preferred)

```bash
# In the web project directory
npm run migrate:spatial
```

#### Option B: Manual SQL Execution

1. Copy the contents of `supabase/migrations/20241201000000_add_spatial_indexes.sql`
2. Open your Supabase SQL editor
3. Paste and execute the SQL commands

### Step 4: Verify Installation

#### Check Database Indexes

```sql
-- Verify spatial indexes were created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE indexname LIKE '%location%';

-- Should show:
-- idx_listings_location_spatial
-- idx_profiles_location_spatial
-- idx_listings_active_location
-- idx_listings_category_location
-- idx_listings_price_location
```

#### Test Geocoding Functions

```sql
-- Test distance calculation function
SELECT calculate_distance_km(
  ST_GeogFromText('POINT(151.2093 -33.8688)'),  -- Sydney
  ST_GeogFromText('POINT(144.9631 -37.8136)')   -- Melbourne
) as distance_km;
-- Should return approximately 713.4 km

-- Test listings within radius function
SELECT * FROM get_listings_within_radius(
  -33.8688,  -- Sydney latitude
  151.2093,  -- Sydney longitude
  50.0       -- 50km radius
) LIMIT 5;
```

## 🚀 API Configuration

### Google Maps API Setup (Recommended)

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable APIs**
   - Enable "Geocoding API" for address-to-coordinates conversion
   - Enable "Maps JavaScript API" for interactive maps (future feature)
   - Enable "Places API" for address autocomplete (future feature)

3. **Create API Key**
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Restrict the key to your specific APIs and domains
   - Add your production domain and localhost for development

4. **Set Usage Limits**
   - Set daily quotas to prevent unexpected charges
   - Monitor usage in the Google Cloud Console

### MapBox API Setup (Alternative)

1. **Create MapBox Account**
   - Sign up at [MapBox](https://www.mapbox.com/)
   - Go to your account page

2. **Create Access Token**
   - Generate a new access token
   - Scope it for geocoding and maps

3. **Configure Rate Limits**
   - Set appropriate usage limits for your application

### Free Nominatim (Fallback)

- No API key required
- Rate limited (1 request per second)
- Good for development and low-traffic applications
- Automatically used when no API key is provided

## 📊 Performance Optimization

### Database Indexing

The migration creates several optimized indexes:

```sql
-- Primary spatial index (GIST for geographic queries)
CREATE INDEX idx_listings_location_spatial ON listings USING GIST (location);

-- Composite indexes for filtered searches
CREATE INDEX idx_listings_active_location ON listings (is_active, location) WHERE is_active = true;
CREATE INDEX idx_listings_category_location ON listings (category, location) WHERE is_active = true;
CREATE INDEX idx_listings_price_location ON listings (price_per_day, location) WHERE is_active = true;
```

### Query Optimization

Use the provided database functions for best performance:

```javascript
// Instead of client-side distance calculation and sorting
const { data } = await supabase.rpc('get_listings_sorted_by_distance', {
  center_lat: userLatitude,
  center_lng: userLongitude,
  category_filter: selectedCategory,
  max_results: 100
});
```

### Caching Strategy

1. **Geocoding Results**: Cache address-to-coordinate conversions
2. **User Location**: Store user's last known location locally
3. **Distance Calculations**: Cache frequently calculated distances

## 🔄 Mobile Integration

### iOS Configuration

Add location permissions to `info.plist`:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>This app uses location to show nearby rental items</string>
```

### Android Configuration

Add permissions to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

## 🧪 Testing

### Test Geocoding API

```bash
# Test the geocoding endpoint
curl -X POST http://localhost:3000/api/geocoding \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main Street",
    "city": "Sydney",
    "state": "NSW",
    "country": "Australia"
  }'
```

### Test Distance Calculation

```javascript
// In browser console or Node.js
import { calculateDistance } from 'rentitforward-shared';

const sydneyToMelbourne = calculateDistance(
  -33.8688, 151.2093,  // Sydney
  -37.8136, 144.9631   // Melbourne
);
console.log(sydneyToMelbourne); // Should be ~713.4 km
```

## 🚨 Troubleshooting

### Common Issues

1. **"PostGIS extension not found"**
   - Solution: Enable PostGIS in Supabase: `CREATE EXTENSION IF NOT EXISTS postgis;`

2. **"Geocoding API quota exceeded"**
   - Solution: Check API usage in provider console, increase limits or add caching

3. **"Spatial index creation failed"**
   - Solution: Ensure you have sufficient database permissions and PostGIS is enabled

4. **"Distance calculation returns null"**
   - Solution: Verify location data exists and is in correct PostGIS format

### Debug Mode

Enable debug logging by setting:

```bash
# In development
DEBUG=rentitforward:location
```

### Performance Monitoring

Monitor key metrics:
- Geocoding API response times
- Database query performance
- Distance calculation accuracy
- Cache hit rates

## 📈 Scaling Considerations

### High-Traffic Optimization

1. **Database Connection Pooling**: Use pgBouncer for connection management
2. **Read Replicas**: Separate read/write operations
3. **Spatial Clustering**: Group nearby listings for faster queries
4. **CDN Caching**: Cache static location data

### Geographic Expansion

To support countries beyond Australia:

1. Update coordinate validation in shared utilities
2. Modify geocoding functions to accept country parameter
3. Add country-specific fallback coordinates
4. Update spatial bounds checking

## 🔐 Security

### API Key Security

- Never expose API keys in client-side code
- Use environment variables for all sensitive keys
- Implement rate limiting on your geocoding endpoints
- Monitor API usage for unusual patterns

### Data Privacy

- Only store necessary location data
- Implement user consent for location tracking
- Allow users to opt-out of location features
- Follow local privacy regulations (GDPR, CCPA, etc.)

## 📚 Additional Resources

- [PostGIS Documentation](https://postgis.net/documentation/)
- [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding)
- [MapBox Geocoding API](https://docs.mapbox.com/api/search/geocoding/)
- [Supabase PostGIS Guide](https://supabase.com/docs/guides/database/extensions/postgis)

## 🤝 Support

For technical support:
1. Check this documentation first
2. Search existing GitHub issues
3. Create a new issue with detailed error information
4. Include relevant log outputs and configuration details 