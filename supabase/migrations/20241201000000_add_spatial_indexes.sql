-- Add spatial indexes for location-based queries
-- This will significantly improve performance when sorting by distance

-- Create spatial index on listings.location for distance calculations
CREATE INDEX IF NOT EXISTS idx_listings_location_spatial 
ON listings USING GIST (location);

-- Create spatial index on profiles.location for user location queries  
CREATE INDEX IF NOT EXISTS idx_profiles_location_spatial 
ON profiles USING GIST (location);

-- Create composite index for listings with location and active status
CREATE INDEX IF NOT EXISTS idx_listings_active_location 
ON listings (is_active, location) 
WHERE is_active = true;

-- Create index for listings by category and location (for filtered searches)
CREATE INDEX IF NOT EXISTS idx_listings_category_location 
ON listings (category, location) 
WHERE is_active = true;

-- Create index for listings by price range and location
CREATE INDEX IF NOT EXISTS idx_listings_price_location 
ON listings (price_per_day, location) 
WHERE is_active = true;

-- Add function to calculate distance between two geography points
-- This will be used in queries for distance-based sorting
CREATE OR REPLACE FUNCTION calculate_distance_km(point1 geography, point2 geography)
RETURNS float8 AS $$
BEGIN
  -- ST_DWithin uses meters, so we convert to kilometers
  RETURN ST_Distance(point1, point2) / 1000.0;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Add function to get listings within a certain radius
CREATE OR REPLACE FUNCTION get_listings_within_radius(
  center_lat double precision,
  center_lng double precision, 
  radius_km double precision DEFAULT 50.0,
  max_results integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  price_per_day decimal,
  images text[],
  address text,
  city text,
  state text,
  location geography,
  distance_km double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.category,
    l.price_per_day,
    l.images,
    l.address,
    l.city,
    l.state,
    l.location,
    calculate_distance_km(
      l.location, 
      ST_GeogFromText('POINT(' || center_lng || ' ' || center_lat || ')')
    ) as distance_km
  FROM listings l
  WHERE 
    l.is_active = true
    AND l.location IS NOT NULL
    AND ST_DWithin(
      l.location,
      ST_GeogFromText('POINT(' || center_lng || ' ' || center_lat || ')'),
      radius_km * 1000  -- Convert km to meters
    )
  ORDER BY distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add function to get nearby listings sorted by distance
CREATE OR REPLACE FUNCTION get_listings_sorted_by_distance(
  center_lat double precision,
  center_lng double precision,
  category_filter text DEFAULT NULL,
  min_price decimal DEFAULT NULL,
  max_price decimal DEFAULT NULL,
  max_results integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  price_per_day decimal,
  images text[],
  address text,
  city text,
  state text,
  location geography,
  distance_km double precision,
  owner_name text,
  owner_avatar text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.category,
    l.price_per_day,
    l.images,
    l.address,
    l.city,
    l.state,
    l.location,
    calculate_distance_km(
      l.location, 
      ST_GeogFromText('POINT(' || center_lng || ' ' || center_lat || ')')
    ) as distance_km,
    p.full_name as owner_name,
    p.avatar_url as owner_avatar
  FROM listings l
  LEFT JOIN profiles p ON l.owner_id = p.id
  WHERE 
    l.is_active = true
    AND l.location IS NOT NULL
    AND (category_filter IS NULL OR l.category = category_filter)
    AND (min_price IS NULL OR l.price_per_day >= min_price)
    AND (max_price IS NULL OR l.price_per_day <= max_price)
  ORDER BY distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment explaining the spatial indexes
COMMENT ON INDEX idx_listings_location_spatial IS 
'Spatial index for location-based distance calculations and geographic queries';

COMMENT ON INDEX idx_profiles_location_spatial IS 
'Spatial index for user location queries and profile-based distance calculations';

COMMENT ON FUNCTION calculate_distance_km(geography, geography) IS 
'Calculate distance in kilometers between two geographic points using PostGIS';

COMMENT ON FUNCTION get_listings_within_radius IS 
'Get listings within a specified radius from a center point, sorted by distance';

COMMENT ON FUNCTION get_listings_sorted_by_distance IS 
'Get listings sorted by distance with optional category and price filters'; 