-- Update the get_listings_sorted_by_distance function to exclude currently rented items
-- This ensures the browse page doesn't show items that are currently being rented

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
  price_weekly decimal,
  price_hourly decimal,
  deposit decimal,
  images text[],
  address text,
  city text,
  state text,
  country text,
  postal_code text,
  delivery_available boolean,
  pickup_available boolean,
  is_active boolean,
  condition text,
  brand text,
  model text,
  year integer,
  created_at timestamptz,
  rating numeric,
  review_count integer,
  location geography,
  distance_km double precision,
  longitude double precision,
  latitude double precision,
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
    l.price_weekly,
    NULL::decimal as price_hourly,
    l.deposit,
    l.images,
    l.address,
    l.city,
    l.state,
    l.country,
    l.postal_code,
    l.delivery_available,
    l.pickup_available,
    l.is_active,
    l.condition::text,
    l.brand,
    l.model,
    l.year,
    l.created_at,
    l.rating,
    l.review_count,
    l.location,
    calculate_distance_km(
      l.location,
      ST_GeogFromText('POINT(' || center_lng || ' ' || center_lat || ')')
    ) as distance_km,
    ST_X(l.location::geometry) as longitude,
    ST_Y(l.location::geometry) as latitude,
    p.full_name as owner_name,
    p.avatar_url as owner_avatar
  FROM listings l
  LEFT JOIN profiles p ON l.owner_id = p.id
  WHERE
    -- Only show listings that are approved by admin
    l.approval_status = 'approved'
    -- Only show listings that are active (not paused by owner)
    AND l.is_active = true
    -- Must have location data for distance calculation
    AND l.location IS NOT NULL
    -- Only show listings that are NOT currently being rented
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.listing_id = l.id
        AND b.status IN ('active', 'confirmed')
        AND CURRENT_DATE BETWEEN b.start_date AND b.end_date
    )
    -- Optional category filter
    AND (category_filter IS NULL OR l.category = category_filter)
    -- Optional price range filters
    AND (min_price IS NULL OR l.price_per_day >= min_price)
    AND (max_price IS NULL OR l.price_per_day <= max_price)
  ORDER BY distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_listings_sorted_by_distance(double precision, double precision, text, decimal, decimal, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_listings_sorted_by_distance(double precision, double precision, text, decimal, decimal, integer) TO anon;

-- Update comment to reflect the new filtering logic
COMMENT ON FUNCTION get_listings_sorted_by_distance IS 'Returns listings sorted by distance from a center point. Only includes listings that are: 1) approved by admin, 2) active (not paused by owner), 3) have valid location data, and 4) are NOT currently being rented (no active bookings covering current date).'; 