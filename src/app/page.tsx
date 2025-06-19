import Link from 'next/link'
import { Search, Star, ArrowRight, User, List, DollarSign } from 'lucide-react'
import Image from 'next/image'

const categories = [
  { 
    name: 'Tools & DIY', 
    icon: '🔧', 
    slug: 'tools-diy',
    items: ['drills', 'saws', 'ladders', 'power tools']
  },
  { 
    name: 'Electronics', 
    icon: '📱', 
    slug: 'electronics',
    items: ['laptops', 'tablets', 'gaming', 'audio devices']
  },
  { 
    name: 'Cameras', 
    icon: '📷', 
    slug: 'cameras',
    items: ['DSLR cameras', 'lenses', 'tripods', 'lighting']
  },
  { 
    name: 'Sports & Outdoors', 
    icon: '🚴', 
    slug: 'sports-outdoors',
    items: ['bikes', 'kayaks', 'camping gear', 'sports equipment']
  },
  { 
    name: 'Event & Party', 
    icon: '🎉', 
    slug: 'event-party',
    items: ['speakers', 'decorations', 'costumes', 'party supplies']
  },
  { 
    name: 'Tools & Equipment', 
    icon: '🔨', 
    slug: 'tools-equipment',
    items: ['pressure washers', 'generators', 'lawn equipment', 'construction tools']
  },
]

const topItems = [
  { 
    id: 1, 
    name: 'Canon EOS 5D Mark IV', 
    rating: 4.8, 
    reviews: 12, 
    price: 45,
    image: '/api/placeholder/300/300',
    period: 'day'
  },
  { 
    id: 2, 
    name: 'DeWalt Power Drill', 
    rating: 4.9, 
    reviews: 28, 
    price: 15,
    image: '/api/placeholder/300/300',
    period: 'day'
  },
  { 
    id: 3, 
    name: '4-Person Camping Tent', 
    rating: 4.7, 
    reviews: 19, 
    price: 25,
    image: '/api/placeholder/300/300',
    period: 'day'
  },
  { 
    id: 4, 
    name: 'DJ Equipment Set', 
    rating: 4.9, 
    reviews: 15, 
    price: 75,
    image: '/api/placeholder/300/300',
    period: 'day'
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section with Green Gradient */}
      <section className="relative py-20 px-4 bg-gradient-to-br from-green-400 via-green-500 to-green-600 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full opacity-10"></div>
          <div className="absolute top-32 right-20 w-24 h-24 bg-white rounded-full opacity-10"></div>
          <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-white rounded-full opacity-10"></div>
          <div className="absolute bottom-10 right-10 w-28 h-28 bg-white rounded-full opacity-10"></div>
        </div>
        
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Be Smart, Share More
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto">
            Discover what your community has to offer
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative bg-white rounded-full p-2 shadow-lg">
              <input 
                type="text" 
                placeholder="What would you like to rent?"
                className="w-full pl-6 pr-32 py-4 text-lg rounded-full border-0 focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-500"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-full font-semibold transition-colors flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Browse by Categories</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find exactly what you need from a variety of rental categories
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category, index) => (
              <Link 
                key={index}
                href={`/browse?category=${category.slug}`}
                className="bg-white rounded-2xl p-6 text-center shadow-sm hover:shadow-md transition-all duration-300 group border border-gray-100"
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                  {category.name}
                </h3>
                <div className="text-sm text-gray-500 space-y-1">
                  {category.items.slice(0, 2).map((item, i) => (
                    <div key={i}>{item}</div>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Rent It Forward - First Row */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Why Rent It Forward?</h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-green-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🌱</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Reduce Waste</h3>
              <p className="text-gray-600 leading-relaxed">
                Rent items from your community and promote a sustainable lifestyle.
              </p>
            </div>
            
            <div className="bg-green-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Earn Extra Income</h3>
              <p className="text-gray-600 leading-relaxed">
                Turn your unused items into passive income.
              </p>
            </div>
            
            <div className="bg-green-50 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">👥</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Build a Sharing Community</h3>
              <p className="text-gray-600 leading-relaxed">
                Connect with neighbors and share resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Top Rented Items */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">Top Rented Items</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {topItems.map((item) => (
              <Link key={item.id} href={`/listing/${item.id}`} className="group">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="aspect-square bg-gray-200 relative overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium text-gray-900">{item.rating}</span>
                      </div>
                      <span className="text-sm text-gray-500">({item.reviews} reviews)</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600">
                      ${item.price}<span className="text-sm font-normal text-gray-500">/{item.period}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <User className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">1. Sign Up</h3>
              <p className="text-gray-600 leading-relaxed">
                Create an account and verify your identity
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <List className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">2. List or Browse</h3>
              <p className="text-gray-600 leading-relaxed">
                Share items or find what you need
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <DollarSign className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">3. Rent & Earn</h3>
              <p className="text-gray-600 leading-relaxed">
                Start sharing and earning
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Link 
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-colors"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Help and Policies */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Need Help?</h3>
              <p className="text-gray-600 mb-6">
                Our support team is here to assist you 24/7
              </p>
              <Link 
                href="/support"
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold"
              >
                Contact Support
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Rental Policies</h3>
              <p className="text-gray-600 mb-6">
                Learn about discounts, cancellations, and more
              </p>
              <Link 
                href="/policies"
                className="inline-flex items-center gap-2 text-green-600 hover:text-green-700 font-semibold"
              >
                View Policies
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-green-500">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            List Your Items & Start Earning
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join Rent It Forward and share with your community
          </p>
          <Link 
            href="/create-listing"
            className="inline-flex items-center gap-2 bg-white text-green-600 hover:bg-gray-50 px-8 py-4 rounded-full font-semibold text-lg transition-colors"
          >
            List Your Item
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
