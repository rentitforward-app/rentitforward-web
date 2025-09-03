'use client'

import { useState } from 'react'
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface FormData {
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
}

interface FormStatus {
  type: 'idle' | 'loading' | 'success' | 'error'
  message: string
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: ''
  })

  const [status, setStatus] = useState<FormStatus>({
    type: 'idle',
    message: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setStatus({ type: 'loading', message: 'Sending your message...' })

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (response.ok) {
        setStatus({
          type: 'success',
          message: 'Thank you! Your message has been sent successfully. We\'ll get back to you soon.'
        })
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          subject: '',
          message: ''
        })
      } else {
        setStatus({
          type: 'error',
          message: result.error || 'Failed to send message. Please try again.'
        })
      }
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.'
      })
    }
  }

  const isFormValid = formData.firstName && formData.lastName && formData.email && formData.subject && formData.message

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-green-50 to-green-100 py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Contact Us
            </h1>
          <p className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto">
              Have questions or need support? We're here to help! 
              Get in touch with our friendly team.
            </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Details */}
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-10">Get in Touch</h2>
              
              <div className="space-y-8">
                <div className="flex items-start space-x-6">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Mail className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-3">Email Support</h3>
                    <p className="text-gray-600 text-lg mb-4 leading-relaxed">
                      Get help with your account, bookings, or listings. We typically respond within 24 hours.
                    </p>
                    <a 
                      href="mailto:hello@rentitforward.com.au" 
                      className="text-green-600 hover:text-green-700 text-lg font-medium transition-colors inline-flex items-center space-x-2"
                    >
                      <span>hello@rentitforward.com.au</span>
                      <Send className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                  <h4 className="text-xl font-semibold text-gray-900 mb-4">Company Information</h4>
                  <div className="space-y-3 text-gray-600">
                    <p className="text-lg font-semibold text-green-600">Rent It Forward</p>
                    <p className="text-lg"><strong>ABN:</strong> 79 150 200 910</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <Card variant="elevated" padding="lg">
                <CardContent className="p-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-8">Send us a Message</h2>
                
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-3">
                          First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="Your first name"
                        required
                      />
                    </div>
                    <div>
                        <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-3">
                          Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        placeholder="Your last name"
                        required
                      />
                    </div>
                  </div>

                  <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-3">
                        Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      placeholder="your.email@example.com"
                      required
                    />
                  </div>

                  <div>
                      <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-3">
                        Subject *
                    </label>
                      <select 
                        id="subject" 
                        name="subject" 
                        value={formData.subject}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        required
                      >
                      <option value="">Select a topic</option>
                      <option value="general">General Question</option>
                      <option value="booking">Booking Support</option>
                      <option value="listing">Listing Help</option>
                      <option value="payment">Payment Issue</option>
                      <option value="safety">Safety Concern</option>
                      <option value="bug">Technical Issue</option>
                        <option value="partnership">Partnership Inquiry</option>
                        <option value="feedback">Feedback & Suggestions</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                      <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-3">
                        Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                      placeholder="Tell us how we can help you..."
                      required
                    />
                  </div>

                    {/* Status Message */}
                    {status.type !== 'idle' && (
                      <div className={`p-4 rounded-xl flex items-center space-x-3 ${
                        status.type === 'success' 
                          ? 'bg-green-50 border border-green-200 text-green-800'
                          : status.type === 'error'
                          ? 'bg-red-50 border border-red-200 text-red-800'
                          : 'bg-blue-50 border border-blue-200 text-blue-800'
                      }`}>
                        {status.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                        {status.type === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                        {status.type === 'loading' && <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                        <span className="font-medium">{status.message}</span>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      className="w-full py-4 text-lg font-semibold bg-green-600 hover:bg-green-700 transition-colors"
                      disabled={!isFormValid || status.type === 'loading'}
                    >
                      {status.type === 'loading' ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Link */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">Need Quick Answers?</h2>
            <p className="text-xl text-gray-600 leading-relaxed mb-10 max-w-3xl mx-auto">
              Check our FAQ section for instant answers to common questions, 
              or browse our help articles for detailed guides.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button size="lg" asChild className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4">
                <Link href="/faq">
                  View FAQ
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white text-lg px-8 py-4">
                <Link href="/how-it-works">
                  How It Works
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 