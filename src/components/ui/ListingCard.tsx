import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { Star, MapPin, Heart, Package, Truck } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { cn, formatPrice } from '@/lib/utils';

interface ListingCardProps {
  id: string;
  title: string;
  images: string[];
  price: number;
  period?: 'day' | 'week' | 'month';
  rating?: number;
  reviewCount?: number;
  distance?: number;
  category?: string;
  city?: string;
  state?: string;
  delivery_available?: boolean;
  pickup_available?: boolean;
  owner: {
    name: string;
    avatar?: string;
  };
  className?: string;
  isFavorited?: boolean;
  onFavoriteToggle?: () => void;
}

export default function ListingCard({
  id,
  title,
  images,
  price,
  period = 'day',
  rating,
  reviewCount,
  distance,
  category,
  city,
  state,
  delivery_available,
  pickup_available,
  owner,
  className,
  isFavorited = false,
  onFavoriteToggle,
}: ListingCardProps) {
  const mainImage = images[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5Mzk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';

  // Debug logging for distance values
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 ListingCard "${title}": distance = ${distance}, type = ${typeof distance}`);
    }
  }, [title, distance]);

  return (
    <Link href={`/listings/${id}`} className="block">
      <Card variant="interactive" padding="none" className={cn('overflow-hidden group cursor-pointer', className)}>
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={mainImage}
            alt={title}
            fill
            className="object-contain bg-gray-50 group-hover:scale-105 transition-transform duration-300"
          />
          
          {/* Category Badge */}
          {category && (
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                📷 {category.toUpperCase()}
              </span>
            </div>
          )}

          {/* Price Badge */}
          <div className="absolute top-3 right-3">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1">
              <span className="text-sm font-bold text-primary-600">
                {formatPrice(price)}/{period}
              </span>
            </div>
          </div>

          {/* Heart Icon */}
          {onFavoriteToggle && (
            <button 
              className="absolute bottom-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors z-10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFavoriteToggle();
              }}
            >
              <Heart 
                className={`w-4 h-4 transition-colors ${
                  isFavorited 
                    ? 'text-red-500 fill-red-500' 
                    : 'text-gray-600 hover:text-red-500'
                }`} 
              />
            </button>
          )}
        </div>

        {/* Card Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
            {title}
          </h3>

          {/* Rating and Reviews */}
          {rating && rating > 0 && reviewCount && reviewCount > 0 ? (
            <div className="flex items-center gap-1 mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${
                      i < Math.floor(rating) 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-gray-900">{rating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({reviewCount} reviews)</span>
            </div>
          ) : (
            <div className="mb-2">
              <span className="text-sm text-green-600 font-medium">Be the first to rent this!</span>
            </div>
          )}

          {/* Location (masked for security) */}
          {(city || state) && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
              <MapPin className="w-4 h-4" />
              <span>
                {city && state ? `${city}, ${state}` : city || state}
              </span>
            </div>
          )}

          {/* Distance */}
          {distance && distance !== Infinity && isFinite(distance) && (
            <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
              <span>{distance.toFixed(1)} km away</span>
            </div>
          )}

          {/* Delivery Methods */}
          {(delivery_available || pickup_available) && (
            <div className="flex items-center gap-2 mb-3">
              {pickup_available && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <Package className="w-3 h-3 mr-1" />
                  Pickup
                </span>
              )}
              {delivery_available && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  <Truck className="w-3 h-3 mr-1" />
                  Delivery
                </span>
              )}
            </div>
          )}

          {/* Owner */}
          <div className="flex items-center gap-2">
            {owner.avatar ? (
              <Image
                src={owner.avatar}
                alt={owner.name}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-xs font-medium text-primary-600">
                  {owner.name.charAt(0)}
                </span>
              </div>
            )}
            <span className="text-sm text-gray-600">{owner.name}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
} 