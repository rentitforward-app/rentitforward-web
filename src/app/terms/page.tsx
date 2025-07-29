import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function TermsPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center">
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
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="max-w-4xl mx-auto prose prose-lg max-w-none">
            <p className="text-sm text-gray-500 mb-8">Last updated: January 17, 2025</p>

            {/* Introduction */}
            <div className="bg-blue-50 p-6 rounded-xl mb-8">
              <h2 className="text-xl font-bold text-secondary mb-3">Important Notice</h2>
              <p className="text-gray-700 mb-2">
                These Terms of Service are governed by Australian law, including the Australian Consumer Law (ACL) 
                under the Competition and Consumer Act 2010 (Cth). Your statutory rights as a consumer under 
                Australian law are not excluded, restricted or modified by these terms.
              </p>
              <p className="text-gray-700">
                <strong>Entity:</strong> Rent It Forward Pty Ltd (ACN: [To be inserted], ABN: [To be inserted])
              </p>
            </div>

            <h2 className="text-2xl font-bold text-secondary mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-4">
              By accessing, browsing, registering for, or using Rent It Forward (the "Platform"), you acknowledge 
              that you have read, understood, and agree to be legally bound by these Terms of Service ("Terms") 
              and our Privacy Policy, which is incorporated by reference.
            </p>
            <p className="text-gray-600 mb-6">
              If you do not agree with any part of these terms, you must not use our service. Your continued 
              use of the Platform constitutes ongoing acceptance of these Terms.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">2. Description of Service</h2>
            <p className="text-gray-600 mb-4">
              Rent It Forward operates a peer-to-peer rental marketplace that facilitates connections between:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Lenders/Sharers:</strong> Users who list items for rental</li>
              <li><strong>Renters:</strong> Users who rent items from Lenders</li>
            </ul>
            <p className="text-gray-600 mb-6">
              We provide the technology platform, payment processing, dispute resolution services, and customer 
              support. We do not own, manufacture, control, inspect, or warrant the items listed on our Platform.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">3. Eligibility and Account Requirements</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">3.1 Age and Capacity Requirements</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>You must be at least 18 years of age and have legal capacity to enter contracts</li>
              <li>You must be a resident of Australia with a valid Australian address</li>
              <li>Corporate users must be validly incorporated in Australia</li>
              <li>You must not be subject to any legal restrictions preventing platform use</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">3.2 Account Registration</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Provide accurate, current, and complete registration information</li>
              <li>Maintain and update your information to keep it accurate and current</li>
              <li>Verify your identity through government-issued photo ID</li>
              <li>Maintain confidentiality of your account credentials</li>
              <li>Notify us immediately of any unauthorized account access</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">3.3 Account Responsibilities</h3>
            <p className="text-gray-600 mb-6">
              You are solely responsible for all activities that occur under your account, including any 
              actions by authorized sub-users, employees, or agents. You agree to monitor your account 
              for unauthorized use and report any security breaches immediately.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">4. User Responsibilities and Conduct</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">4.1 General Obligations for All Users</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Comply with all applicable Australian federal, state, and local laws</li>
              <li>Provide truthful, accurate, and non-misleading information</li>
              <li>Treat other users with respect and professionalism</li>
              <li>Maintain appropriate insurance coverage for your activities</li>
              <li>Report suspected fraudulent or illegal activity</li>
              <li>Cooperate with investigations and dispute resolution processes</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">4.2 Specific Obligations for Lenders/Sharers</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Own or have legal authority to rent the listed items</li>
              <li>Provide accurate descriptions, specifications, and high-quality photos</li>
              <li>Ensure items are safe, functional, and in the condition described</li>
              <li>Set reasonable rental rates and terms</li>
              <li>Maintain items in accordance with manufacturer specifications</li>
              <li>Respond promptly to rental requests and communications</li>
              <li>Make items available at agreed times and locations</li>
              <li>Provide necessary operating instructions and safety information</li>
              <li>Maintain appropriate insurance for items and potential third-party claims</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">4.3 Specific Obligations for Renters</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Use items only for their intended purpose and in accordance with instructions</li>
              <li>Exercise reasonable care to prevent damage, loss, or theft</li>
              <li>Return items in the same condition as received (normal wear excepted)</li>
              <li>Report any damage, malfunction, or safety issues immediately</li>
              <li>Pay all fees, charges, and applicable deposits on time</li>
              <li>Allow Lenders to inspect items upon return</li>
              <li>Not permit unauthorized persons to use rented items</li>
              <li>Maintain appropriate insurance coverage where required</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">5. Prohibited Items and Activities</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">5.1 Prohibited Items</h3>
            <p className="text-gray-600 mb-4">The following items are strictly prohibited from listing:</p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Weapons, firearms, ammunition, explosives, or military equipment</li>
              <li>Illegal drugs, drug paraphernalia, or prescription medications</li>
              <li>Stolen, counterfeit, or fraudulently obtained goods</li>
              <li>Items requiring special licenses unless you hold valid licenses</li>
              <li>Hazardous materials, chemicals, or biological substances</li>
              <li>Items that infringe intellectual property rights</li>
              <li>Adult content, pornographic materials, or sex toys</li>
              <li>Human remains, bodily fluids, or medical waste</li>
              <li>Live animals or animal products requiring permits</li>
              <li>Items that violate export/import restrictions</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">5.2 Prohibited Activities</h3>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Circumventing our fee structure or conducting off-platform transactions</li>
              <li>Creating multiple accounts to manipulate reviews or bookings</li>
              <li>Posting false, misleading, or defamatory content</li>
              <li>Harassing, threatening, or discriminating against other users</li>
              <li>Attempting to gain unauthorized access to our systems</li>
              <li>Using automated tools to scrape data or create accounts</li>
              <li>Subletting or transferring rental agreements without consent</li>
            </ul>

            {/* Continue with updated payment and fees section from previous edit */}
            <h2 className="text-2xl font-bold text-secondary mb-4">6. Payments and Fees</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">Fee Structure:</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Renters:</strong> Pay a 15% service fee on the base rental price</li>
              <li><strong>Lenders/Sharers:</strong> Platform deducts a 20% commission from rental income</li>
              <li><strong>Optional Insurance:</strong> Approximately $7/day for damage protection (renter's choice)</li>
              <li><strong>Security Deposits:</strong> Optional for high-value items (e.g., $50-$300 depending on item value)</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-secondary mb-3">Payment Processing:</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>All payments are processed securely through our escrow system</li>
              <li>Renters pay the full amount upfront (base price + service fee + optional add-ons)</li>
              <li>Funds are held in escrow until rental completion</li>
              <li>Lenders receive payment after successful rental completion (minus commission)</li>
              <li>Security deposits are refunded within 2-3 business days if item returned undamaged</li>
            </ul>
            
            <h3 className="text-xl font-semibold text-secondary mb-3">Additional Terms:</h3>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>All fees are inclusive of GST where applicable</li>
              <li>Fee structure may be updated with 30 days written notice to users</li>
              <li>Refunds are subject to our cancellation and dispute resolution policies</li>
              <li>Failed payments may result in booking cancellation and potential account suspension</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">7. Cancellations, Refunds, and Australian Consumer Law</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">7.1 Cancellation Policy</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Cancellations 24+ hours before rental start: Full refund minus processing fees</li>
              <li>Cancellations within 24 hours: Subject to Lender's cancellation policy</li>
              <li>Lender cancellations: Full refund to Renter plus potential compensation</li>
              <li>Force majeure events: Cancellations handled on case-by-case basis</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">7.2 Consumer Guarantees</h3>
            <div className="bg-yellow-50 p-4 rounded-lg mb-4">
              <p className="text-gray-700">
                <strong>Australian Consumer Law Protection:</strong> Under the Australian Consumer Law, 
                you have guaranteed rights that cannot be excluded. Items and services must be of 
                acceptable quality, fit for purpose, and match their description. If these guarantees 
                are not met, you may be entitled to a remedy.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-secondary mb-4">8. Insurance, Damage, and Liability</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">8.1 Insurance Coverage</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Optional damage protection insurance available for additional fee</li>
              <li>Users encouraged to maintain their own comprehensive insurance</li>
              <li>Platform provides limited protection only as outlined in specific policies</li>
              <li>High-value items may require mandatory insurance or higher deposits</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">8.2 Damage and Loss Procedures</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Document item condition with photos before and after each rental</li>
              <li>Report damage, loss, or theft immediately to Platform and relevant authorities</li>
              <li>Cooperate fully with damage assessments and investigation processes</li>
              <li>Disputes resolved through our internal process before external legal action</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">8.3 Limitation of Platform Liability</h3>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <p className="text-gray-700 text-sm">
                <strong>Important:</strong> To the extent permitted by law, including the Australian Consumer Law, 
                our liability is limited to the re-supply of services or payment of re-supply costs. We exclude 
                all warranties and conditions except those that cannot be excluded by law. Our total liability 
                for any claim is limited to the fees paid by you in the 12 months prior to the claim.
              </p>
            </div>

            <h2 className="text-2xl font-bold text-secondary mb-4">9. Intellectual Property Rights</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">9.1 Platform Content</h3>
            <p className="text-gray-600 mb-4">
              All Platform content, including software, text, graphics, logos, and trademarks, is owned by 
              Rent It Forward Pty Ltd or our licensors and protected by Australian and international copyright 
              and trademark laws.
            </p>

            <h3 className="text-xl font-semibold text-secondary mb-3">9.2 User Content License</h3>
            <p className="text-gray-600 mb-6">
              By uploading content to our Platform, you grant us a non-exclusive, worldwide, royalty-free 
              license to use, reproduce, and display your content for Platform operation and marketing purposes.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">10. Privacy and Data Protection</h2>
            <p className="text-gray-600 mb-4">
              Your privacy is protected under the Privacy Act 1988 (Cth) and our Privacy Policy. We collect, 
              use, and disclose personal information in accordance with Australian privacy laws.
            </p>
            <p className="text-gray-600 mb-6">
              You consent to the collection and use of your information as described in our Privacy Policy, 
              which forms part of these Terms.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">11. Platform Rules and Account Management</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">11.1 Platform Integrity</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>All transactions must be conducted through our Platform</li>
              <li>Users may not circumvent our fee structure or payment systems</li>
              <li>We reserve the right to remove listings that violate our policies</li>
              <li>We may verify user information and item authenticity at any time</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">11.2 Account Suspension and Termination</h3>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>We may suspend or terminate accounts for policy violations</li>
              <li>You may terminate your account at any time with proper notice</li>
              <li>Upon termination, you remain liable for any outstanding obligations</li>
              <li>We will provide reasonable notice except in cases of serious violations</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">12. Dispute Resolution</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">12.1 Internal Dispute Resolution</h3>
            <p className="text-gray-600 mb-4">
              We provide an internal dispute resolution process for conflicts between users. This includes 
              mediation services, evidence review, and binding decisions on platform-related disputes.
            </p>

            <h3 className="text-xl font-semibold text-secondary mb-3">12.2 External Dispute Resolution</h3>
            <p className="text-gray-600 mb-4">
              If internal resolution fails, disputes may be referred to:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Australian Financial Complaints Authority (AFCA) for payment disputes</li>
              <li>Fair Trading authorities in relevant states/territories</li>
              <li>Courts of competent jurisdiction in Australia</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">12.3 Governing Law</h3>
            <p className="text-gray-600 mb-6">
              These Terms are governed by the laws of Australia and the state/territory where you reside. 
              Any legal proceedings must be commenced in the appropriate Australian court.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">13. Changes to Terms</h2>
            <p className="text-gray-600 mb-4">
              We may modify these Terms at any time. Material changes will be communicated via:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Email notification to registered users</li>
              <li>Prominent notice on the Platform</li>
              <li>In-app notifications for mobile users</li>
            </ul>
            <p className="text-gray-600 mb-6">
              Changes take effect 30 days after notification unless you object and terminate your account. 
              Continued use constitutes acceptance of modified Terms.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">14. Severability and Interpretation</h2>
            <p className="text-gray-600 mb-6">
              If any provision of these Terms is found to be unenforceable, the remaining provisions will 
              continue in full force. Terms are to be interpreted fairly and reasonably, with consideration 
              for both parties' legitimate interests.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">15. Contact Information and Complaints</h2>
            <p className="text-gray-600 mb-6">
              For questions, complaints, or legal notices, contact us:
            </p>
            <div className="bg-gray-50 p-6 rounded-xl">
              <p className="text-gray-600 mb-2">
                <strong>Legal Department:</strong> legal@rentitforward.com.au
              </p>
              <p className="text-gray-600 mb-2">
                <strong>Customer Service:</strong> support@rentitforward.com.au
              </p>
              <p className="text-gray-600 mb-2">
                <strong>Phone:</strong> 1300 RENT IT (1300 736 848)
              </p>
              <p className="text-gray-600 mb-2">
                <strong>Business Hours:</strong> Monday-Friday 9AM-5PM AEST
              </p>
              <p className="text-gray-600">
                <strong>Registered Address:</strong> Rent It Forward Pty Ltd<br />
                [Address to be inserted]<br />
                Australia
              </p>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl mt-8">
              <h3 className="text-lg font-bold text-secondary mb-3">Your Consumer Rights</h3>
              <p className="text-gray-700 text-sm">
                If you have a complaint, you can contact us using the details above. If you are not satisfied 
                with our response, you can contact the Australian Financial Complaints Authority (AFCA) at 
                www.afca.org.au or your local Fair Trading office. You may also have rights under the 
                Australian Consumer Law that cannot be excluded.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-secondary mb-6">Ready to Get Started?</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              By creating an account, you agree to these terms and our privacy policy. 
              Join our community today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/signup">
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