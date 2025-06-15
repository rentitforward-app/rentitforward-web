import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <nav className="container flex items-center justify-between py-4">
        <Link href="/" className="flex items-center">
          <Image 
            src="/images/RentitForward-Main-Logo.svg" 
            alt="Rent It Forward" 
            width={240} 
            height={64}
            className="h-12 w-auto"
            priority
          />
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          <Link href="/browse" className="text-gray-700 hover:text-primary">
            Browse Items
          </Link>
          <Link href="/how-it-works" className="text-gray-700 hover:text-primary">
            How it Works
          </Link>
          <Link href="/learn-more" className="text-gray-700 hover:text-primary">
            Learn more
          </Link>
        </div>
        
        <div className="flex items-center space-x-4">
          <Link href="/login" className="text-gray-700 hover:text-primary">
            Login
          </Link>
          <Link href="/register" className="btn-primary">
            Sign Up
          </Link>
          <Link href="/listings/create" className="btn-primary">
            Create Listing
          </Link>
        </div>
      </nav>
    </header>
  )
} 