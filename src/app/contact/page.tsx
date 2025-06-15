import { Mail, Phone, MapPin, Clock } from 'lucide-react'
import Link from 'next/link'

export default function ContactPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-primary text-4xl md:text-5xl font-bold text-secondary mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Have questions or need support? We're here to help! 
              Get in touch with our friendly team.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Details */}
            <div>
              <h2 className="text-3xl font-bold text-secondary mb-8">Get in Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-secondary mb-1">Email Support</h3>
                    <p className="text-gray-600 mb-2">Get help with your account, bookings, or listings</p>
                    <a href="mailto:hello@rentitforward.com.au" className="text-primary hover:text-primary-600">
                      hello@rentitforward.com.au
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-secondary mb-1">Phone Support</h3>
                    <p className="text-gray-600 mb-2">Speak directly with our support team</p>
                    <a href="tel:1300736848" className="text-primary hover:text-primary-600">
                      1300 RENT IT (1300 736 848)
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-secondary mb-1">Address</h3>
                    <p className="text-gray-600">
                      Rent It Forward Pty Ltd<br />
                      Australia
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-secondary mb-1">Support Hours</h3>
                    <p className="text-gray-600">
                      Monday - Friday: 9:00 AM - 6:00 PM AEST<br />
                      Saturday - Sunday: 10:00 AM - 4:00 PM AEST
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <div className="bg-gray-50 p-8 rounded-xl">
                <h2 className="text-2xl font-bold text-secondary mb-6">Send us a Message</h2>
                
                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                        First Name
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        className="input"
                        placeholder="Your first name"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        className="input"
                        placeholder="Your last name"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="input"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject
                    </label>
                    <select id="subject" name="subject" className="input" required>
                      <option value="">Select a topic</option>
                      <option value="general">General Question</option>
                      <option value="booking">Booking Support</option>
                      <option value="listing">Listing Help</option>
                      <option value="payment">Payment Issue</option>
                      <option value="safety">Safety Concern</option>
                      <option value="bug">Technical Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      className="input"
                      placeholder="Tell us how we can help you..."
                      required
                    />
                  </div>

                  <button type="submit" className="btn-primary w-full">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Link */}
      <section className="py-16 bg-gray-50">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-secondary mb-6">Need Quick Answers?</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Check our FAQ section for instant answers to common questions, 
              or browse our help articles for detailed guides.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/faq" className="btn-primary text-lg px-8 py-3">
                View FAQ
              </Link>
              <Link href="/how-it-works" className="btn-outline text-lg px-8 py-3">
                How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 