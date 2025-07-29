import { Search, MessageCircle, CreditCard, Star, Shield, Clock } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center">
            <h1 className="font-primary text-4xl md:text-5xl font-bold text-secondary mb-6">
              How It Works
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Renting and lending on Rent It Forward is simple, safe, and rewarding. 
              Here's everything you need to know to get started.
            </p>
          </div>
        </div>
      </section>

      {/* For Renters */}
      <section className="py-16 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary mb-4">For Renters</h2>
            <p className="text-lg text-gray-600">Find and rent exactly what you need from your local community</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">1. Search & Browse</h3>
              <p className="text-gray-600">
                Search for items by category, location, or specific keywords. Filter results by price, availability, and distance.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">2. Connect & Arrange</h3>
              <p className="text-gray-600">
                Message the owner to ask questions, check availability, and arrange pickup or delivery details.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">3. Book & Pay</h3>
              <p className="text-gray-600">
                Secure your booking with our safe payment system. Your payment is protected until you confirm receipt.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">4. Use & Review</h3>
              <p className="text-gray-600">
                Enjoy your rental! Return the item as agreed and leave a review to help build our community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Lenders */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary mb-4">For Lenders</h2>
            <p className="text-lg text-gray-600">Turn your unused items into a source of passive income</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📷</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">1. List Your Items</h3>
              <p className="text-gray-600">
                Take photos and create listings for items you want to rent out. Set your price and availability.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">2. Receive Requests</h3>
              <p className="text-gray-600">
                Get notified when someone wants to rent your item. Chat with potential renters and approve bookings.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">3. Hand Over Item</h3>
              <p className="text-gray-600">
                Meet the renter or arrange delivery. Check the item condition together before handover.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💰</span>
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">4. Get Paid</h3>
              <p className="text-gray-600">
                Receive payment automatically when the rental is confirmed. Build your reputation with positive reviews.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety & Trust */}
      <section className="py-16 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary mb-4">Safety & Trust</h2>
            <p className="text-lg text-gray-600">Your security and peace of mind are our top priorities</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">Verified Users</h3>
              <p className="text-gray-600">
                All users verify their identity with government ID and phone number verification for added security.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">Secure Payments</h3>
              <p className="text-gray-600">
                All transactions are processed securely. Payments are held in escrow until rental completion.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">24/7 Support</h3>
              <p className="text-gray-600">
                Our customer support team is available around the clock to help resolve any issues.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-secondary mb-4">Transparent Pricing</h2>
            <p className="text-lg text-gray-600">Simple, fair fees with no hidden costs</p>
          </div>
          
          <Card variant="elevated" padding="lg">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-bold text-secondary mb-4">For Renters</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                      Service fee: 15% of rental cost
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                      Optional insurance: ~$7/day for damage protection
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                      Optional security deposit for high-value items
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                      Secure escrow payment system
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Example:</strong> $30/day bike rental + $4.50 service fee (15%) + $7 insurance = $41.50 total
                    </p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-2xl font-bold text-secondary mb-4">For Lenders</h3>
                  <ul className="space-y-3 text-gray-600">
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                      Platform commission: 20% of rental income
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                      Free listing creation
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                      Automatic payouts after rental completion
                    </li>
                    <li className="flex items-center">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                      Set your own pricing and availability
                    </li>
                  </ul>
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      <strong>Example:</strong> $30/day rental - $6 platform fee (20%) = $24 net earnings
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-secondary mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Join thousands of Australians already sharing and earning through Rent It Forward
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Sign Up Now
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/browse">
                  Browse Items
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 