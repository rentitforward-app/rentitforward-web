import { Shield, Users, Leaf, Target } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-primary text-4xl md:text-5xl font-bold text-secondary mb-6">
              About Rent It Forward
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              We're building Australia's most trusted community-driven rental marketplace, 
              where sharing creates value for everyone while promoting sustainable living.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-secondary mb-6">Our Mission</h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                To create a sustainable sharing economy where Australians can access what they need 
                without the burden of ownership, while building stronger communities and reducing 
                environmental impact.
              </p>
              <p className="text-gray-600 text-lg leading-relaxed">
                We believe that sharing is the future – not just for environmental reasons, 
                but because it creates opportunities for people to connect, earn income, 
                and access tools and items they need without the high cost of purchase.
              </p>
            </div>
            <div className="bg-gray-50 p-8 rounded-xl">
              <h3 className="text-2xl font-bold text-secondary mb-4">Our Vision</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                A world where communities thrive through sharing, where every household 
                has access to the tools and items they need, and where sustainable 
                practices are the norm, not the exception.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <h2 className="text-3xl font-bold text-center text-secondary mb-12">Our Core Values</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">Community First</h3>
              <p className="text-gray-600">
                Building stronger local connections through sharing and trust.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">Sustainability</h3>
              <p className="text-gray-600">
                Reducing waste and environmental impact through collaborative consumption.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">Trust & Safety</h3>
              <p className="text-gray-600">
                Ensuring secure transactions and verified community members.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-secondary mb-3">Accessibility</h3>
              <p className="text-gray-600">
                Making tools and resources available to everyone in the community.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-secondary mb-6">Join Our Mission</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Whether you're looking to rent something you need or earn income from items 
              you own, you're contributing to a more sustainable and connected community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="btn-primary text-lg px-8 py-3">
                Join Our Community
              </Link>
              <Link href="/contact" className="btn-outline text-lg px-8 py-3">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 