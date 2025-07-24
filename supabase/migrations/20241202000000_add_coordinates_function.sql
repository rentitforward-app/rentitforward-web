-- Add function to get listings with extracted coordinates from PostGIS location field
CREATE OR REPLACE FUNCTION get_listings_with_coordinates()
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
  latitude double precision,
  longitude double precision,
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
    NULL::decimal as price_hourly, -- Not in current schema
    l.deposit,
    l.images,
    COALESCE(p.location, l.state || ', Australia') as address, -- Use profile location or state as address
    SPLIT_PART(COALESCE(p.location, l.state), ',', 1) as city, -- Extract city from location
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
    NULL::numeric as rating, -- To be calculated from reviews
    0::integer as review_count, -- To be calculated from reviews
    l.location,
    CASE 
      WHEN l.location IS NOT NULL THEN ST_Y(l.location::geometry)
      ELSE l.latitude
    END as latitude,
    CASE 
      WHEN l.location IS NOT NULL THEN ST_X(l.location::geometry)
      ELSE l.longitude
    END as longitude,
    p.full_name as owner_name,
    p.avatar_url as owner_avatar
  FROM listings l
  LEFT JOIN profiles p ON l.owner_id = p.id
  WHERE l.is_available = true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_listings_with_coordinates() TO authenticated;
GRANT EXECUTE ON FUNCTION get_listings_with_coordinates() TO anon; 