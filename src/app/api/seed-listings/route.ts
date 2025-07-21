import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  try {
    // Check authentication and get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Sample listings data
    const sampleListings = [
      {
        owner_id: user.id,
        title: 'Canon EOS 5D Mark IV Professional Camera',
        description: 'Professional DSLR camera perfect for photography enthusiasts and professionals. Includes original box, charger, and strap. Well-maintained and recently serviced.',
        category: 'Electronics',
        subcategory: 'Cameras',
        daily_rate: 89.99,
        weekly_rate: 449.99,
        monthly_rate: 1599.99,
        deposit_amount: 500.00,
        images: [
          'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=600',
          'https://images.unsplash.com/photo-1581833971358-2c8b550f87b3?w=800&h=600',
          'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&h=600'
        ],
        location: 'Kuala Lumpur',
        state: 'Kuala Lumpur',
        postcode: '50000',
        latitude: 3.139,
        longitude: 101.6869,
        delivery_available: true,
        pickup_available: true,
        condition: 'like_new' as const,
        brand: 'Canon',
        model: 'EOS 5D Mark IV',
        year: 2020,
        features: [
          '30.4 MP Full Frame CMOS Sensor',
          '4K Video Recording',
          'Dual Pixel CMOS AF',
          'Built-in GPS',
          'Weather Sealed',
          'Touchscreen LCD'
        ],
        rules: [
          'Handle with care',
          'Return in same condition',
          'No modification of settings without permission',
          'Report any damage immediately'
        ],
        tags: ['photography', 'professional', 'digital camera', 'Canon']
      },
      {
        owner_id: user.id,
        title: 'Trek Mountain Bike - All Terrain',
        description: 'High-quality mountain bike suitable for all terrains. Recently tuned and serviced. Perfect for weekend adventures and daily commuting.',
        category: 'Sports & Recreation',
        subcategory: 'Bicycles',
        daily_rate: 35.00,
        weekly_rate: 200.00,
        monthly_rate: 700.00,
        deposit_amount: 150.00,
        images: [
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600',
          'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600'
        ],
        location: 'Petaling Jaya',
        state: 'Selangor',
        postcode: '47400',
        latitude: 3.1073,
        longitude: 101.6067,
        delivery_available: true,
        pickup_available: true,
        condition: 'good' as const,
        brand: 'Trek',
        model: 'Marlin 7',
        year: 2021,
        features: [
          '21-speed gear system',
          'Front suspension',
          'Disc brakes',
          'Lightweight aluminum frame',
          'All-terrain tires'
        ],
        rules: [
          'Wear helmet (can be provided)',
          'Return clean',
          'No modifications',
          'Report any mechanical issues'
        ],
        tags: ['mountain bike', 'cycling', 'outdoor', 'exercise']
      },
      {
        owner_id: user.id,
        title: 'DJI Mavic Air 2 Drone with 4K Camera',
        description: 'Professional drone perfect for aerial photography and videography. Comes with extra batteries, carrying case, and all original accessories.',
        category: 'Electronics',
        subcategory: 'Drones',
        daily_rate: 125.00,
        weekly_rate: 700.00,
        monthly_rate: 2500.00,
        deposit_amount: 800.00,
        images: [
          'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=600',
          'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&h=600'
        ],
        location: 'Shah Alam',
        state: 'Selangor',
        postcode: '40000',
        latitude: 3.0733,
        longitude: 101.5185,
        delivery_available: true,
        pickup_available: true,
        condition: 'like_new' as const,
        brand: 'DJI',
        model: 'Mavic Air 2',
        year: 2022,
        features: [
          '4K HDR Video',
          '48MP Photos',
          '34-minute flight time',
          'Advanced safety features',
          'Intelligent flight modes',
          'OcuSync 2.0 transmission'
        ],
        rules: [
          'Must have drone license',
          'Follow local aviation regulations',
          'No flying in restricted areas',
          'Return with all parts and accessories',
          'Report any crashes immediately'
        ],
        tags: ['drone', 'aerial photography', 'DJI', '4K video']
      }
    ];

    // Insert sample listings
    const { data: insertedListings, error: insertError } = await supabase
      .from('listings')
      .insert(sampleListings)
      .select('*');

    if (insertError) {
      console.error('Error inserting sample listings:', insertError);
      return NextResponse.json({ error: 'Failed to insert sample listings' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Sample listings created successfully',
      listings: insertedListings,
      count: insertedListings?.length || 0
    });

  } catch (error) {
    console.error('Error in seed-listings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 