-- Update category mapping from old to new categories
-- This migration updates existing listings to use the new category structure

-- Update existing category values to new ones
UPDATE listings 
SET category = CASE 
    WHEN category = 'tools_diy' THEN 'tools_diy_equipment'
    WHEN category = 'electronics' THEN 'tech_electronics'  
    WHEN category = 'cameras' THEN 'cameras_photography_gear'
    WHEN category = 'sports_outdoors' THEN 'sports_fitness_equipment'
    WHEN category = 'event_party' THEN 'event_party_equipment'
    WHEN category = 'instruments' THEN 'musical_instruments_gear'
    WHEN category = 'automotive' THEN 'vehicles_transport'
    WHEN category = 'home_garden' THEN 'home_garden_appliances'
    WHEN category = 'appliances' THEN 'home_garden_appliances'
    WHEN category = 'other' THEN 'maker_craft_supplies'
    -- Handle any potential variations
    WHEN category = 'Tools & DIY' THEN 'tools_diy_equipment'
    WHEN category = 'Electronics' THEN 'tech_electronics'
    WHEN category = 'Cameras' THEN 'cameras_photography_gear'
    WHEN category = 'Sports & Outdoors' THEN 'sports_fitness_equipment'
    WHEN category = 'Event & Party' THEN 'event_party_equipment'
    WHEN category = 'Instruments' THEN 'musical_instruments_gear'
    WHEN category = 'Automotive' THEN 'vehicles_transport'
    WHEN category = 'Home & Garden' THEN 'home_garden_appliances'
    WHEN category = 'Appliances' THEN 'home_garden_appliances'
    WHEN category = 'Other' THEN 'maker_craft_supplies'
    -- Add camping/outdoor category for any sports items
    WHEN category ILIKE '%camp%' OR category ILIKE '%outdoor%' THEN 'camping_outdoor_gear'
    -- Add costumes category for any costume-related items  
    WHEN category ILIKE '%costume%' OR category ILIKE '%prop%' THEN 'costumes_props'
    ELSE category -- Keep existing value if no match (for any new categories already created)
END
WHERE category IN (
    'tools_diy', 'electronics', 'cameras', 'sports_outdoors', 'event_party', 
    'instruments', 'automotive', 'home_garden', 'appliances', 'other',
    'Tools & DIY', 'Electronics', 'Cameras', 'Sports & Outdoors', 'Event & Party',
    'Instruments', 'Automotive', 'Home & Garden', 'Appliances', 'Other'
) OR category ILIKE '%camp%' OR category ILIKE '%outdoor%' OR category ILIKE '%costume%' OR category ILIKE '%prop%';

-- Remove the subcategory column since we're eliminating subcategories
ALTER TABLE listings DROP COLUMN IF EXISTS subcategory;

-- Update any listings that might have been categorized incorrectly
-- Set any remaining unmatched categories to a default
UPDATE listings 
SET category = 'maker_craft_supplies' 
WHERE category NOT IN (
    'tools_diy_equipment',
    'cameras_photography_gear', 
    'event_party_equipment',
    'camping_outdoor_gear',
    'tech_electronics',
    'vehicles_transport',
    'home_garden_appliances',
    'sports_fitness_equipment', 
    'musical_instruments_gear',
    'costumes_props',
    'maker_craft_supplies'
);

-- Add a comment to track this migration
COMMENT ON TABLE listings IS 'Updated categories structure - removed subcategories and updated to new category values (Migration 013)'; 