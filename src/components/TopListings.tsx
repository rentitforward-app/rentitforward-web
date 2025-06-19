'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'

interface Listing {
  id: string
  name: string
  category: string
  price: number
  weeklyPrice?: number
  brand?: string
  model?: string
  condition: string
  location: string
  features: string[]
  image?: string
  owner: {
    name: string
    rating: number
    reviews: number
  }
  period: string
}

interface TopListingsProps {
  limit?: number
}

export default function TopListings({ limit = 4 }: TopListingsProps) {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTopListings = async () => {
      try {
        const response = await fetch(`/api/listings/top?limit=${limit}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch listings')
        }
        
        setListings(data.listings || [])
      } catch (err) {
        console.error('Error fetching top listings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load listings')
      } finally {
        setLoading(false)
      }
    }

    fetchTopListings()
  }, [limit])

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
        {[...Array(limit)].map((_, index) => (
          <div key={index} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
            <div className="aspect-square bg-gray-200"></div>
            <div className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-3 w-2/3"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-4">Unable to load listings at the moment</p>
        <button 
          onClick={() => window.location.reload()}
          className="text-green-600 hover:text-green-700 font-semibold"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No listings available at the moment</p>
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
      {listings.map((item) => (
        <Link key={item.id} href={`/listings/${item.id}`} className="group">
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="aspect-square bg-gray-200 relative overflow-hidden">
              {item.image ? (
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-4xl text-gray-400">
                    {item.category === 'Electronics' && '📱'}
                    {item.category === 'Cameras' && '📷'}
                    {item.category === 'Tools & DIY' && '🔧'}
                    {item.category === 'Sports & Outdoors' && '🚴'}
                    {item.category === 'Event & Party' && '🎉'}
                    {item.category === 'Appliances' && '🏠'}
                    {item.category === 'Automotive' && '🚗'}
                    {item.category === 'Instruments' && '🎵'}
                    {item.category === 'Home & Garden' && '🌱'}
                    {!['Electronics', 'Cameras', 'Tools & DIY', 'Sports & Outdoors', 'Event & Party', 'Appliances', 'Automotive', 'Instruments', 'Home & Garden'].includes(item.category) && '📦'}
                  </span>
                </div>
              )}
            </div>
            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors text-sm line-clamp-2 min-h-[2.5rem]">
                {item.name}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium text-gray-900">{item.owner.rating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-gray-500">({item.owner.reviews} reviews)</span>
              </div>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold text-green-600">${item.price}</span>
                <span className="text-sm font-normal text-gray-500">/{item.period}</span>
              </div>
              <div className="text-xs text-gray-500 mb-1 truncate">{item.location}</div>
              {item.brand && item.model && (
                <div className="text-xs text-gray-600 font-medium truncate">{item.brand} {item.model}</div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
