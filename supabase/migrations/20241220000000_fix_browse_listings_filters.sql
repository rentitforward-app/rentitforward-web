-- Update the get_listings_sorted_by_distance function to only show approved, active, and available listings
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
  condition listing_condition,
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
    COALESCE(p.location, l.state || ', Australia') as address,
    SPLIT_PART(COALESCE(p.location, l.state), ',', 1) as city,
    l.state,
    'Australia'::text as country,
    l.postcode as postal_code,
    'delivery' = ANY(l.delivery_methods) as delivery_available,
    'pickup' = ANY(l.delivery_methods) as pickup_available,
    l.is_available as is_active,
    l.condition,
    l.brand,
    l.model,
    l.year,
    l.created_at,
    NULL::numeric as rating,
    0::integer as review_count,
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
    -- Only show listings that are available for rent
    AND l.is_available = true
    -- Only show listings that are active (not paused by owner)
    AND l.is_active = true
    -- Must have location data for distance calculation
    AND l.location IS NOT NULL
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

-- Add comment explaining the function's filtering logic
COMMENT ON FUNCTION get_listings_sorted_by_distance IS 'Returns listings sorted by distance from a center point. Only includes listings that are: 1) approved by admin, 2) available for rent, 3) active (not paused by owner), and 4) have valid location data.'; 