import { Shield, Users, Leaf, Target } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function AboutPage() {
  return (
    <div>
      {/* Hero Section with Background Image */}
      <section className="relative h-[70vh] px-4 overflow-hidden flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <Image
            src="/images/RIF_Onboarding_Image.png"
            alt="About Us Hero Background"
            fill
            className="object-cover"
            style={{ objectPosition: 'center center' }}
            priority
          />
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        
        <div className="max-w-screen-2xl mx-auto text-center relative">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
            We're Building a Future Where Sharing Replaces Owning.
          </h1>
          <p className="text-xl text-white/90 leading-relaxed max-w-4xl mx-auto">
            We're building Australia's most trusted community-driven rental marketplace, 
            where sharing creates value for everyone while promoting sustainable living.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <Card variant="elevated" padding="lg">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold text-secondary mb-4">Our Mision</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                To create a sustainable sharing economy where Australians can access what they need 
                without the burden of ownership, while building stronger communities and reducing 
                environmental impact.
                </p>
              </CardContent>
            </Card>
            <Card variant="elevated" padding="lg">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold text-secondary mb-4">Our Vision</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  A world where communities thrive through sharing, where every household 
                  has access to the tools and items they need, and where sustainable 
                  practices are the norm, not the exception.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-secondary mb-12">Our Core Values</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card variant="elevated" className="text-center">
              <CardContent>
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-3">Community First</h3>
                <p className="text-gray-600">
                  Building stronger local connections through sharing and trust.
                </p>
              </CardContent>
            </Card>
            
            <Card variant="elevated" className="text-center">
              <CardContent>
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-3">Sustainability</h3>
                <p className="text-gray-600">
                  Reducing waste and environmental impact through collaborative consumption.
                </p>
              </CardContent>
            </Card>
            
            <Card variant="elevated" className="text-center">
              <CardContent>
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-3">Trust & Safety</h3>
                <p className="text-gray-600">
                  Ensuring secure transactions and verified community members.
                </p>
              </CardContent>
            </Card>
            
            <Card variant="elevated" className="text-center">
              <CardContent>
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-secondary mb-3">Accessibility</h3>
                <p className="text-gray-600">
                  Making tools and resources available to everyone in the community.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-secondary mb-6">Join Our Mission</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Whether you're looking to rent something you need or earn income from items 
              you own, you're contributing to a more sustainable and connected community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">
                  Join Our Community
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/contact">
                  Contact Us
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 