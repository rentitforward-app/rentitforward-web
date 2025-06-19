import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, Eye, Heart } from 'lucide-react';
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
  owner: {
    name: string;
    avatar?: string;
  };
  className?: string;
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
  owner,
  className,
}: ListingCardProps) {
  const mainImage = images[0] || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTA5Mzk2IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9IjUwMCI+Tm8gSW1hZ2UgQXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4K';

  return (
    <Card variant="interactive" padding="none" className={cn('overflow-hidden group', className)}>
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={mainImage}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
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
        <button className="absolute bottom-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors">
          <Heart className="w-4 h-4 text-gray-600 hover:text-red-500" />
        </button>
      </div>

      {/* Card Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h3>

        {/* Rating and Reviews */}
        {rating && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
            <span className="text-sm font-medium text-gray-900">{rating}</span>
            {reviewCount && (
              <span className="text-sm text-gray-500">({reviewCount} reviews)</span>
            )}
          </div>
        )}

        {/* Distance */}
        {distance && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
            <MapPin className="w-4 h-4" />
            <span>{distance.toFixed(1)} mi away</span>
          </div>
        )}

        {/* Owner */}
        <div className="flex items-center justify-between">
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

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/listings/${id}`}>
              <Eye className="w-4 h-4 mr-1" />
              View & Rent
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
} 