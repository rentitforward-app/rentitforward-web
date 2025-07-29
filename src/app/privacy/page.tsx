import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function PrivacyPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center">
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
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="max-w-4xl mx-auto prose prose-lg max-w-none">
            <p className="text-sm text-gray-500 mb-8">Last updated: January 17, 2025</p>

            {/* Introduction */}
            <div className="bg-blue-50 p-6 rounded-xl mb-8">
              <h2 className="text-xl font-bold text-secondary mb-3">Important Information</h2>
              <p className="text-gray-700 mb-2">
                This Privacy Policy is governed by the Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). 
                Rent It Forward Pty Ltd (ACN: [To be inserted], ABN: [To be inserted]) is committed to protecting 
                your privacy and handling your personal information responsibly.
              </p>
              <p className="text-gray-700">
                <strong>Contact:</strong> For privacy-related inquiries, contact our Privacy Officer at 
                privacy@rentitforward.com.au
              </p>
            </div>

            <h2 className="text-2xl font-bold text-secondary mb-4">1. What Personal Information We Collect</h2>
            <p className="text-gray-600 mb-4">
              We collect personal information that is reasonably necessary for our business functions and activities. 
              The types of personal information we collect include:
            </p>

            <h3 className="text-xl font-semibold text-secondary mb-3">1.1 Information You Provide Directly</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, date of birth, residential address</li>
              <li><strong>Identity Verification:</strong> Government-issued photo ID (driver's license, passport), proof of address</li>
              <li><strong>Financial Information:</strong> Bank account details, payment card information (processed by secure third parties)</li>
              <li><strong>Profile Information:</strong> Profile photos, bio, preferences, rental history</li>
              <li><strong>Listing Information:</strong> Item descriptions, photos, pricing, availability, location details</li>
              <li><strong>Communication Data:</strong> Messages with other users, customer support interactions, reviews and ratings</li>
              <li><strong>Transaction Information:</strong> Booking details, payment history, refund requests, dispute records</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">1.2 Information We Collect Automatically</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Device Information:</strong> IP address, device type, operating system, browser type, unique device identifiers</li>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform, click patterns, search queries</li>
              <li><strong>Location Data:</strong> Precise location (with consent), general location for service delivery</li>
              <li><strong>Technical Data:</strong> Log files, error reports, performance data, security incident logs</li>
              <li><strong>Cookies and Tracking:</strong> Session data, preferences, analytics data, advertising interactions</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">1.3 Information from Third Parties</h3>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li><strong>Identity Verification Services:</strong> Document verification, fraud prevention data</li>
              <li><strong>Payment Processors:</strong> Transaction status, payment method verification</li>
              <li><strong>Social Media:</strong> Public profile information (if you connect social accounts)</li>
              <li><strong>Background Check Providers:</strong> Criminal history, credit checks (where permitted)</li>
              <li><strong>Insurance Partners:</strong> Claims history, risk assessment data</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">2. How We Use Your Personal Information</h2>
            <p className="text-gray-600 mb-4">
              We use your personal information for the following purposes, in accordance with the Australian Privacy Principles:
            </p>

            <h3 className="text-xl font-semibold text-secondary mb-3">2.1 Primary Purposes</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Service Provision:</strong> Operating the platform, facilitating rentals, processing payments</li>
              <li><strong>Account Management:</strong> Creating and maintaining user accounts, authentication, security</li>
              <li><strong>Transaction Processing:</strong> Managing bookings, payments, refunds, deposits, insurance claims</li>
              <li><strong>Communication:</strong> Sending booking confirmations, updates, customer support responses</li>
              <li><strong>Safety and Security:</strong> Verifying user identity, preventing fraud, investigating disputes</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">2.2 Secondary Purposes (with consent or as permitted by law)</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Marketing:</strong> Sending promotional emails, personalized recommendations, special offers</li>
              <li><strong>Analytics:</strong> Understanding user behavior, improving platform performance, market research</li>
              <li><strong>Product Development:</strong> Developing new features, testing improvements, personalizing experience</li>
              <li><strong>Legal Compliance:</strong> Meeting regulatory requirements, responding to legal requests</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">2.3 Automated Decision Making</h3>
            <p className="text-gray-600 mb-6">
              We may use automated systems for fraud detection, credit assessment, and risk management. 
              You have the right to request human review of automated decisions that significantly affect you.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">3. How We Share Your Personal Information</h2>
            <p className="text-gray-600 mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>

            <h3 className="text-xl font-semibold text-secondary mb-3">3.1 With Other Platform Users</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Profile information to facilitate rentals (name, photo, ratings, reviews)</li>
              <li>Contact information when bookings are confirmed (as necessary for pickup/delivery)</li>
              <li>Location information to coordinate item exchange</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">3.2 With Service Providers</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Payment Processors:</strong> Stripe, PayPal (for transaction processing)</li>
              <li><strong>Identity Verification:</strong> Document verification and fraud prevention services</li>
              <li><strong>Cloud Services:</strong> AWS, Google Cloud (for data hosting and storage)</li>
              <li><strong>Communication:</strong> Email and SMS service providers</li>
              <li><strong>Analytics:</strong> Google Analytics, Mixpanel (for usage analysis)</li>
              <li><strong>Customer Support:</strong> Helpdesk and chat service providers</li>
              <li><strong>Insurance:</strong> Insurance partners for damage protection</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">3.3 Legal and Regulatory Sharing</h3>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Law enforcement agencies (when required by law or court order)</li>
              <li>Tax authorities (as required for GST and income reporting)</li>
              <li>Financial intelligence agencies (for anti-money laundering compliance)</li>
              <li>Dispute resolution bodies (AFCA, Fair Trading authorities)</li>
              <li>Legal advisors and professional service providers (under confidentiality agreements)</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">4. International Transfers of Personal Information</h2>
            <p className="text-gray-600 mb-4">
              Some of our service providers may be located outside Australia. We ensure appropriate protections 
              are in place for international transfers, including:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Transfers to countries with adequate privacy protection (as recognized by Australian law)</li>
              <li>Standard contractual clauses with overseas service providers</li>
              <li>Binding corporate rules for multinational service providers</li>
              <li>Your explicit consent for specific transfers</li>
            </ul>
            <p className="text-gray-600 mb-6">
              You can request details about specific international transfers by contacting our Privacy Officer.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">5. Data Security and Protection</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">5.1 Security Measures</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Encryption:</strong> All data in transit and at rest is encrypted using industry-standard protocols</li>
              <li><strong>Access Controls:</strong> Multi-factor authentication, role-based access, regular access reviews</li>
              <li><strong>Infrastructure:</strong> Secure cloud hosting, firewalls, intrusion detection systems</li>
              <li><strong>Monitoring:</strong> 24/7 security monitoring, vulnerability scanning, incident response procedures</li>
              <li><strong>Staff Training:</strong> Regular privacy and security training for all employees</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">5.2 Data Breach Response</h3>
            <p className="text-gray-600 mb-6">
              In the event of a data breach that may cause serious harm, we will notify affected individuals and 
              the Office of the Australian Information Commissioner (OAIC) within 72 hours, as required by law.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">6. Data Retention and Deletion</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">6.1 Retention Periods</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Account Information:</strong> Retained while account is active plus 7 years after closure</li>
              <li><strong>Transaction Records:</strong> 7 years (as required by tax and financial regulations)</li>
              <li><strong>Communication Data:</strong> 3 years after last interaction</li>
              <li><strong>Marketing Data:</strong> Until consent is withdrawn or account deleted</li>
              <li><strong>Security Logs:</strong> 2 years for fraud prevention and investigation</li>
              <li><strong>Legal Hold:</strong> Indefinitely when subject to legal proceedings</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">6.2 Secure Deletion</h3>
            <p className="text-gray-600 mb-6">
              When retention periods expire, we securely delete personal information using industry-standard 
              methods to ensure it cannot be recovered or reconstructed.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">7. Your Privacy Rights Under Australian Law</h2>
            <p className="text-gray-600 mb-4">
              Under the Privacy Act 1988 and Australian Privacy Principles, you have the following rights:
            </p>

            <h3 className="text-xl font-semibold text-secondary mb-3">7.1 Access Rights</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Request access to your personal information we hold</li>
              <li>Receive a copy of your personal information in a usable format</li>
              <li>Understand how your information is being used and shared</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">7.2 Correction Rights</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Request correction of inaccurate or incomplete information</li>
              <li>Update your account information at any time</li>
              <li>Request notation of disputes if correction is refused</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">7.3 Deletion and Restriction Rights</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Request deletion of your personal information (subject to legal requirements)</li>
              <li>Restrict processing for specific purposes</li>
              <li>Object to automated decision-making</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">7.4 Consent Management</h3>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Withdraw consent for marketing communications</li>
              <li>Opt-out of non-essential data processing</li>
              <li>Manage cookie preferences</li>
              <li>Control location data sharing</li>
            </ul>

            <h2 className="text-2xl font-bold text-secondary mb-4">8. Cookies and Tracking Technologies</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">8.1 Types of Cookies We Use</h3>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li><strong>Essential Cookies:</strong> Required for platform functionality and security</li>
              <li><strong>Performance Cookies:</strong> Analytics and performance monitoring</li>
              <li><strong>Functional Cookies:</strong> User preferences and personalization</li>
              <li><strong>Marketing Cookies:</strong> Advertising and remarketing (with consent)</li>
            </ul>

            <h3 className="text-xl font-semibold text-secondary mb-3">8.2 Cookie Management</h3>
            <p className="text-gray-600 mb-6">
              You can control cookies through your browser settings or our cookie preference center. 
              Disabling certain cookies may limit platform functionality.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">9. Third-Party Links and Services</h2>
            <p className="text-gray-600 mb-6">
              Our platform may contain links to third-party websites, social media platforms, or integrated 
              services. We are not responsible for the privacy practices of these external sites. We recommend 
              reviewing their privacy policies before providing personal information.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">10. Children's Privacy</h2>
            <p className="text-gray-600 mb-6">
              Our services are not intended for individuals under 18 years of age. We do not knowingly collect 
              personal information from children under 18. If we become aware that we have collected such 
              information, we will take steps to delete it promptly.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">11. Marketing and Communications</h2>
            <h3 className="text-xl font-semibold text-secondary mb-3">11.1 Marketing Consent</h3>
            <p className="text-gray-600 mb-4">
              We will only send marketing communications with your explicit consent, in compliance with the 
              Spam Act 2003 (Cth). You can opt-out at any time using unsubscribe links or contacting us directly.
            </p>

            <h3 className="text-xl font-semibold text-secondary mb-3">11.2 Transactional Communications</h3>
            <p className="text-gray-600 mb-6">
              We will send necessary service-related communications (booking confirmations, payment receipts, 
              security alerts) regardless of marketing preferences, as these are essential for service delivery.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">12. Privacy Impact Assessments</h2>
            <p className="text-gray-600 mb-6">
              We conduct privacy impact assessments for new features, services, or data processing activities 
              that may pose privacy risks. These assessments help us implement appropriate safeguards and 
              minimize privacy impacts.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">13. Changes to This Privacy Policy</h2>
            <p className="text-gray-600 mb-4">
              We may update this Privacy Policy from time to time to reflect changes in our practices, 
              technology, legal requirements, or business operations. Material changes will be communicated via:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-4 space-y-2">
              <li>Email notification to registered users</li>
              <li>Prominent notice on our platform</li>
              <li>In-app notifications for mobile users</li>
              <li>30 days advance notice for significant changes</li>
            </ul>
            <p className="text-gray-600 mb-6">
              Continued use of our services after changes take effect constitutes acceptance of the updated policy.
            </p>

            <h2 className="text-2xl font-bold text-secondary mb-4">14. Contact Information and Complaints</h2>
            <p className="text-gray-600 mb-4">
              For privacy-related questions, requests, or complaints, please contact:
            </p>
            <div className="bg-gray-50 p-6 rounded-xl mb-6">
              <p className="text-gray-600 mb-2">
                <strong>Privacy Officer:</strong> privacy@rentitforward.com.au
              </p>
              <p className="text-gray-600 mb-2">
                <strong>General Inquiries:</strong> support@rentitforward.com.au
              </p>
              <p className="text-gray-600 mb-2">
                <strong>Phone:</strong> 1300 RENT IT (1300 736 848)
              </p>
              <p className="text-gray-600 mb-2">
                <strong>Business Hours:</strong> Monday-Friday 9AM-5PM AEST
              </p>
              <p className="text-gray-600 mb-2">
                <strong>Postal Address:</strong><br />
                Privacy Officer<br />
                Rent It Forward Pty Ltd<br />
                [Address to be inserted]<br />
                Australia
              </p>
              <p className="text-gray-600">
                <strong>Response Time:</strong> We aim to respond to privacy requests within 30 days
              </p>
            </div>

            <h2 className="text-2xl font-bold text-secondary mb-4">15. External Complaint Resolution</h2>
            <p className="text-gray-600 mb-4">
              If you are not satisfied with our response to your privacy complaint, you may lodge a 
              complaint with external authorities:
            </p>
            <div className="bg-yellow-50 p-6 rounded-xl mb-6">
              <h3 className="text-lg font-bold text-secondary mb-3">Office of the Australian Information Commissioner (OAIC)</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-2">
                <li><strong>Website:</strong> www.oaic.gov.au</li>
                <li><strong>Phone:</strong> 1300 363 992</li>
                <li><strong>Email:</strong> enquiries@oaic.gov.au</li>
                <li><strong>Online:</strong> Submit complaint at www.oaic.gov.au/privacy/privacy-complaints</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl mt-8">
              <h3 className="text-lg font-bold text-secondary mb-3">Data Subject Rights Summary</h3>
              <p className="text-gray-700 text-sm mb-3">
                <strong>Quick Access:</strong> To exercise your privacy rights quickly, log into your account 
                and visit the Privacy Settings page, or contact our Privacy Officer directly.
              </p>
              <p className="text-gray-700 text-sm">
                <strong>No Cost:</strong> We do not charge fees for reasonable privacy requests. Excessive 
                or repetitive requests may incur administrative costs as permitted by law.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-secondary mb-6">Questions About Privacy?</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              We're committed to protecting your privacy and being transparent about our data practices. 
              If you have any questions or concerns, our Privacy Officer is here to help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Contact Privacy Officer
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/terms">
                  Terms of Service
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 