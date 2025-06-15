import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-primary text-4xl md:text-5xl font-bold text-secondary mb-6">
              Privacy Policy
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Your privacy is important to us. This policy explains how we collect, 
              use, and protect your personal information.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Policy Content */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-4xl mx-auto prose prose-lg max-w-none">
            <p className="text-sm text-gray-500 mb-8">Last updated: January 17, 2025</p>

            <h2 className="text-2xl font-bold text-secondary mb-4">1. Information We Collect</h2>
            <p className="text-gray-600 mb-6">
              We collect information you provide directly to us, such as when you create an account, 
              list an item, make a booking, or contact us for support. This includes:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Personal information (name, email, phone number, address)</li>
              <li>Government-issued ID for verification purposes</li>
              <li>Payment information (processed securely by our payment partners)</li>
              <li>Photos and descriptions of items you list</li>
              <li>Messages and communications with other users</li>
              <li>Reviews and feedback you provide</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Provide, maintain, and improve our services</li>
              <li>Process transactions and send related information</li>
              <li>Verify your identity and prevent fraud</li>
              <li>Communicate with you about your account and our services</li>
              <li>Facilitate connections between renters and lenders</li>
              <li>Comply with legal obligations and resolve disputes</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">3. Information Sharing</h2>
            <p className="text-gray-600 mb-4">
              We don't sell your personal information. We may share your information in these situations:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>With other users as necessary to facilitate rentals</li>
              <li>With service providers who help us operate our platform</li>
              <li>When required by law or to protect our rights</li>
              <li>In connection with a business transfer or acquisition</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">4. Data Security</h2>
            <p className="text-gray-600 mb-6">
              We implement appropriate technical and organizational measures to protect your personal 
              information against unauthorized access, alteration, disclosure, or destruction. However, 
              no method of transmission over the internet is 100% secure.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">5. Your Rights</h2>
            <p className="text-gray-600 mb-4">
              Depending on your location, you may have certain rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Access and update your personal information</li>
              <li>Request deletion of your personal information</li>
              <li>Object to processing of your personal information</li>
              <li>Request data portability</li>
              <li>Withdraw consent where applicable</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">6. Cookies and Tracking</h2>
            <p className="text-gray-600 mb-6">
              We use cookies and similar technologies to enhance your experience, analyze usage patterns, 
              and improve our services. You can control cookie preferences through your browser settings.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">7. Third-Party Links</h2>
            <p className="text-gray-600 mb-6">
              Our platform may contain links to third-party websites or services. We're not responsible 
              for the privacy practices of these external sites.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">8. Children's Privacy</h2>
            <p className="text-gray-600 mb-6">
              Our services are not intended for children under 18. We don't knowingly collect personal 
              information from children under 18.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">9. International Transfers</h2>
            <p className="text-gray-600 mb-6">
              Your information may be transferred to and processed in countries other than your own. 
              We ensure appropriate safeguards are in place for such transfers.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">10. Changes to This Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update this privacy policy from time to time. We'll notify you of any material 
              changes by posting the new policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">11. Contact Us</h2>
            <p className="text-gray-600 mb-6">
              If you have questions about this privacy policy or our privacy practices, please contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-xl">
              <p className="text-gray-600 mb-2">
                <strong>Email:</strong> privacy@rentitforward.com.au
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
            <h2 className="text-3xl font-bold text-secondary mb-6">Questions About Privacy?</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              We're committed to protecting your privacy. If you have any questions or concerns, 
              our support team is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact" className="btn-primary text-lg px-8 py-3">
                Contact Support
              </Link>
              <Link href="/terms" className="btn-outline text-lg px-8 py-3">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 