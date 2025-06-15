import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-secondary text-white py-12">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="mb-4">
              <Image 
                src="/images/RentitForward-Main-Logo.svg" 
                alt="Rent It Forward" 
                width={160} 
                height={45}
                className="h-10 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-gray-300 mb-4">
              Share More, Buy Less. Building a sustainable community through sharing.
            </p>
            <p className="text-gray-400 text-sm">
              Address: Australia
            </p>
            <p className="text-gray-400 text-sm">
              hello@rentitforward.com.au
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/guarantee">Guarantee</Link></li>
              <li><Link href="/faq">FAQ's</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/contact">Contact Us</Link></li>
              <li><Link href="/terms">Terms and Conditions</Link></li>
              <li><Link href="/privacy">Privacy Policy</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4">Browse</h4>
            <ul className="space-y-2 text-gray-300">
              <li><Link href="/categories">All Categories</Link></li>
              <li><Link href="/learn-more">Learn more</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-600 mt-8 pt-8 text-center text-gray-400">
          <p>Copyright © 2025 Rent It Forward. All rights reserved.</p>
          <p className="mt-2">Build by Digital Linked.</p>
        </div>
      </div>
    </footer>
  )
} 