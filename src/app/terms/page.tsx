import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function TermsPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-primary text-4xl md:text-5xl font-bold text-secondary mb-6">
              Terms of Service
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              These terms govern your use of Rent It Forward. Please read them carefully 
              before using our platform.
            </p>
          </div>
        </div>
      </section>

      {/* Terms Content */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto prose prose-lg max-w-none">
            <p className="text-sm text-gray-500 mb-8">Last updated: January 17, 2025</p>

            <h2 className="text-2xl font-bold text-secondary mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-6">
              By accessing or using Rent It Forward, you agree to be bound by these Terms of Service 
              and our Privacy Policy. If you don't agree with any part of these terms, you may not 
              use our service.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-6">
              Rent It Forward is a peer-to-peer rental marketplace that connects people who want to 
              rent items with those who want to lend them. We provide the platform but do not own, 
              manufacture, or control the items listed.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">3. User Accounts</h2>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>You must be at least 18 years old to use our service</li>
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must verify your identity before listing or renting items</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">4. User Responsibilities</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">For All Users:</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Provide accurate information about yourself and items</li>
              <li>Communicate respectfully with other users</li>
              <li>Follow all applicable laws and regulations</li>
              <li>Not use the platform for illegal activities</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">For Lenders:</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Provide accurate descriptions and photos of items</li>
              <li>Ensure items are safe and in working condition</li>
              <li>Set fair and reasonable rental rates</li>
              <li>Be available for pickup/delivery as arranged</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">For Renters:</h3>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Use items responsibly and as intended</li>
              <li>Return items in the same condition as received</li>
              <li>Pay all fees and charges on time</li>
              <li>Report any issues or damage immediately</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">5. Prohibited Items</h2>
            <p className="text-gray-600 mb-4">The following items may not be listed on our platform:</p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Weapons, ammunition, or explosives</li>
              <li>Illegal drugs or drug paraphernalia</li>
              <li>Stolen or counterfeit goods</li>
              <li>Items that require special licenses to operate</li>
              <li>Hazardous materials or chemicals</li>
              <li>Items that violate intellectual property rights</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">6. Payments and Fees</h2>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Renters pay a 5% booking fee plus payment processing fees</li>
              <li>Lenders pay a 3% service fee on rental income</li>
              <li>All payments are processed securely through our platform</li>
              <li>Refunds are subject to our cancellation policy</li>
              <li>We may change our fee structure with 30 days notice</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">7. Cancellations and Refunds</h2>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Cancellations made 24+ hours in advance receive full refunds</li>
              <li>Last-minute cancellations may incur fees</li>
              <li>Lenders may set their own cancellation policies</li>
              <li>We reserve the right to cancel bookings for safety reasons</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">8. Damage and Insurance</h2>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>All rentals include basic damage protection</li>
              <li>Users should take photos before and after rentals</li>
              <li>Damage disputes will be resolved by our support team</li>
              <li>Users may be responsible for repair or replacement costs</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">9. Platform Rules</h2>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>All transactions must go through our platform</li>
              <li>Users may not circumvent our fee structure</li>
              <li>We may remove listings that violate our policies</li>
              <li>We may suspend or terminate accounts for violations</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">10. Limitation of Liability</h2>
            <p className="text-gray-600 mb-6">
              Rent It Forward is not liable for any direct, indirect, incidental, special, or 
              consequential damages arising from your use of our platform. We are not responsible 
              for the quality, safety, or legality of items listed on our platform.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">11. Dispute Resolution</h2>
            <p className="text-gray-600 mb-6">
              Disputes between users should first be resolved through our platform's dispute resolution 
              process. Any legal disputes will be governed by Australian law and resolved in Australian courts.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">12. Changes to Terms</h2>
            <p className="text-gray-600 mb-6">
              We may modify these terms at any time. Material changes will be communicated to users 
              via email or platform notification. Continued use of our service constitutes acceptance 
              of modified terms.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">13. Contact Information</h2>
            <p className="text-gray-600 mb-6">
              Questions about these terms? Contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-xl">
              <p className="text-gray-600 mb-2">
                <strong>Email:</strong> legal@rentitforward.com.au
              </p>
              <p className="text-gray-600 mb-2">
                <strong>Phone:</strong> 1300 RENT IT (1300 736 848)
              </p>
              <p className="text-gray-600">
                <strong>Address:</strong> Rent It Forward Pty Ltd, Australia
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-secondary mb-6">Ready to Get Started?</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              By creating an account, you agree to these terms and our privacy policy. 
              Join our community today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Create Account
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/privacy">
                  Privacy Policy
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 