'use client'

import { useState, useEffect, useRef } from 'react'
import { Mail, Send, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import ReCAPTCHA from 'react-google-recaptcha'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface FormData {
  firstName: string
  lastName: string
  email: string
  subject: string
  message: string
  timestamp: string
  jsEnabled: string
  website: string
  confirm_email: string
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
    message: '',
    timestamp: '',
    jsEnabled: 'false',
    website: '',
    confirm_email: ''
  })

  const [status, setStatus] = useState<FormStatus>({
    type: 'idle',
    message: ''
  })

  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [formStartTime, setFormStartTime] = useState<number>(0)
  const recaptchaRef = useRef<ReCAPTCHA>(null)

  // Set JavaScript enabled and form start time
  useEffect(() => {
    setFormData(prev => ({ ...prev, jsEnabled: 'true' }))
    setFormStartTime(Date.now())
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Update timestamp before submission
    const currentTime = Date.now()
    const submissionTime = currentTime - formStartTime
    
    // Check if submission is too fast (less than 3 seconds)
    if (submissionTime < 3000) {
      setStatus({
        type: 'error',
        message: 'Please take your time filling out the form. Submission too fast.'
      })
      return
    }

    // Check if reCAPTCHA is completed
    if (!captchaToken) {
      setStatus({
        type: 'error',
        message: 'Please complete the reCAPTCHA verification.'
      })
      return
    }

    // Check if JavaScript is enabled
    if (formData.jsEnabled !== 'true') {
      setStatus({
        type: 'error',
        message: 'JavaScript must be enabled to submit this form.'
      })
      return
    }
    
    setStatus({ type: 'loading', message: 'Sending your message...' })

    try {
      const submissionData = {
        ...formData,
        timestamp: currentTime.toString(),
        captchaToken
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      })

      const result = await response.json()

      if (response.ok) {
        setStatus({
          type: 'success',
          message: 'Thank you! Your message has been sent successfully. We\'ll get back to you soon.'
        })
        
        // Reset form and captcha
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          subject: '',
          message: '',
          timestamp: '',
          jsEnabled: 'true',
          website: '',
          confirm_email: ''
        })
        setCaptchaToken(null)
        if (recaptchaRef.current) {
          recaptchaRef.current.reset()
        }
        
        // Reset form start time
        setFormStartTime(Date.now())
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

  const isFormValid = formData.firstName && 
                     formData.lastName && 
                     formData.email && 
                     formData.subject && 
                     formData.message && 
                     captchaToken &&
                     formData.jsEnabled === 'true'

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
                    {/* Honeypot Fields - Hidden from users, visible to bots */}
                    <div className="absolute left-[-9999px] opacity-0 pointer-events-none">
                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="w-0 h-0 overflow-hidden"
                      />
                      <input
                        type="email"
                        name="confirm_email"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="w-0 h-0 overflow-hidden"
                      />
                    </div>

                    {/* Hidden security fields */}
                    <input type="hidden" name="timestamp" value={formData.timestamp} />
                    <input type="hidden" name="jsEnabled" value={formData.jsEnabled} />

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
                        maxLength={50}
                        pattern="[A-Za-z\s'-]+"
                        title="Please enter a valid first name (letters, spaces, hyphens, apostrophes only)"
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
                        maxLength={50}
                        pattern="[A-Za-z\s'-]+"
                        title="Please enter a valid last name (letters, spaces, hyphens, apostrophes only)"
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
                      maxLength={100}
                      pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                      title="Please enter a valid email address"
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
                      <option value="General Question">General Question</option>
                      <option value="Booking Support">Booking Support</option>
                      <option value="Listing Help">Listing Help</option>
                      <option value="Payment Issue">Payment Issue</option>
                      <option value="Safety Concern">Safety Concern</option>
                      <option value="Technical Issue">Technical Issue</option>
                        <option value="Partnership Inquiry">Partnership Inquiry</option>
                        <option value="Feedback & Suggestions">Feedback & Suggestions</option>
                      <option value="Other">Other</option>
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
                      maxLength={1000}
                      title="Please enter your message (maximum 1000 characters)"
                    />
                    <div className="text-right text-sm text-gray-500 mt-1">
                      {formData.message.length}/1000 characters
                    </div>
                  </div>

                  {/* reCAPTCHA */}
                  <div className="flex justify-center">
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                      onChange={handleCaptchaChange}
                      className="mb-4"
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
              <Button variant="outline" size="lg" asChild className="border-green-600 text-green-600 hover:bg-green-700 hover:text-white text-lg px-8 py-4">
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