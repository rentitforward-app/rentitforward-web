import Link from 'next/link'
import { Search, Plus, MessageCircle, Star, Shield, Globe } from 'lucide-react'

const categories = [
  { name: 'Tools & DIY', icon: '🔧', slug: 'tools-diy' },
  { name: 'Electronics', icon: '📱', slug: 'electronics' },
  { name: 'Cameras', icon: '📷', slug: 'cameras' },
  { name: 'Sports & Outdoors', icon: '🏃', slug: 'sports-outdoors' },
  { name: 'Event & Party', icon: '🎉', slug: 'event-party' },
  { name: 'Instruments', icon: '🎸', slug: 'instruments' },
  { name: 'Automotive', icon: '🚗', slug: 'automotive' },
  { name: 'Home & Garden', icon: '🏡', slug: 'home-garden' },
  { name: 'Appliances', icon: '🏠', slug: 'appliances' },
  { name: 'Other', icon: '📦', slug: 'other' },
]

const topItems = [
  { id: 1, name: 'Canon EOS 5D Mark IV', rating: 4.8, reviews: 12, price: 45 },
  { id: 2, name: 'DeWalt Power Drill', rating: 4.9, reviews: 28, price: 15 },
  { id: 3, name: '4-Person Camping Tent', rating: 4.7, reviews: 19, price: 25 },
  { id: 4, name: 'DJ Equipment Set', rating: 4.9, reviews: 15, price: 75 },
]

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-50 to-primary-100 py-20">
        <div className="container text-center">
          <h1 className="font-primary text-5xl md:text-6xl font-bold text-secondary mb-6">
            Share More, Buy Less
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Find exactly what you need from a variety of rental categories. 
            Rent from your community and promote a sustainable lifestyle.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search for items near you"
                className="input pl-12 pr-24 py-4 text-lg w-full"
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary px-6 py-2">
                Search
              </button>
            </div>
          </div>
          
          <div className="flex justify-center space-x-4">
            <Link href="/browse" className="btn-primary text-lg px-8 py-3">
              Browse Items
            </Link>
            <Link href="/listings/create" className="btn-outline text-lg px-8 py-3">
              <Plus className="w-5 h-5 mr-2" />
              List an Item
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Browse by Categories</h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Find exactly what you need from a variety of rental categories.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {categories.map((category) => (
              <Link 
                key={category.name}
                href={`/browse/${category.slug}`}
                className="card-hover p-6 text-center group"
              >
                <div className="text-4xl mb-4">{category.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Rent It Forward */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4">Why Rent It Forward?</h2>
          
          <div className="grid md:grid-cols-2 gap-12 mt-12">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">💰</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Reduce Waste, Save Money</h3>
                  <p className="text-gray-600">
                    Instead of buying, rent items from your community and promote a sustainable lifestyle.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">💸</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Earn Extra Income</h3>
                  <p className="text-gray-600">
                    List your unused items for rent and turn them into a passive income source.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Safe & Secure</h3>
                  <p className="text-gray-600">
                    All transactions are protected with secure payments and verified users.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Community Focused</h3>
                  <p className="text-gray-600">
                    Connect with your local community and build lasting relationships.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top Rented Items Preview */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">Top Rented Items</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topItems.map((item) => (
              <div key={item.id} className="card-hover overflow-hidden">
                <div className="aspect-square bg-gray-200 mb-4"></div>
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{item.name}</h3>
                  <div className="flex items-center mb-2">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 mr-1" />
                    <span className="text-sm text-gray-600">{item.rating} ({item.reviews} reviews)</span>
                  </div>
                  <p className="text-primary font-semibold">${item.price}/day</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
