'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "How does Rent It Forward work?",
    answer: "Rent It Forward is a peer-to-peer rental marketplace where you can rent items from other community members or list your own items for rent. Simply browse available items, contact the owner, arrange pickup/delivery, and enjoy your rental!"
  },
  {
    question: "Is it safe to rent from strangers?",
    answer: "Yes! We prioritize your safety with verified user profiles, secure payment processing, insurance coverage, and a comprehensive review system. All users must verify their identity with government ID and phone number."
  },
  {
    question: "How much does it cost to use Rent It Forward?",
    answer: "For renters: 5% booking fee + 2.9% + $0.30 payment processing fee. For lenders: 3% service fee on rental income. Listing items is completely free!"
  },
  {
    question: "What happens if an item gets damaged?",
    answer: "All bookings include basic damage protection. If an item is damaged during rental, our support team will work with both parties to resolve the issue fairly. We recommend taking photos before and after rental periods."
  },
  {
    question: "How do payments work?",
    answer: "Payments are processed securely through our platform and held in escrow until the rental is completed. Renters pay upfront, and lenders receive payment after the item is returned successfully."
  },
  {
    question: "Can I cancel a booking?",
    answer: "Yes, but cancellation policies vary by listing. Check the specific cancellation policy before booking. Generally, cancellations made 24+ hours in advance receive full refunds, while last-minute cancellations may incur fees."
  },
  {
    question: "What items can I list for rent?",
    answer: "You can list most items except prohibited goods like weapons, illegal substances, or stolen property. Popular categories include tools, electronics, cameras, outdoor gear, sports equipment, and musical instruments."
  },
  {
    question: "How do I verify my identity?",
    answer: "Upload a photo of your government-issued ID (driver's license or passport) and verify your phone number. This typically takes 1-2 business days to process."
  },
  {
    question: "What if I have a dispute with another user?",
    answer: "Contact our support team immediately. We have a structured dispute resolution process and will work with both parties to find a fair solution. Our goal is to maintain trust and safety for all users."
  },
  {
    question: "Can I rent items for business use?",
    answer: "Yes, you can rent items for business purposes. Make sure to communicate this with the item owner and check if they're comfortable with commercial use. Some items may have different rates for business rentals."
  },
  {
    question: "How are rental days counted?",
    answer: "We use inclusive day counting, meaning both your pickup day and return day count as full rental days. For example, if you select August 27th to August 29th, that's 3 rental days total: pickup on the 27th (morning), full day on the 28th, and return by end of day on the 29th. This gives you maximum flexibility to collect items in the morning and return them by evening of your selected dates."
  }
]

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<number[]>([])

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-primary-100 py-16">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center">
            <h1 className="font-primary text-4xl md:text-5xl font-bold text-secondary mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Find answers to common questions about using Rent It Forward. 
              Can't find what you're looking for? Contact our support team.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Content */}
      <section className="py-16 bg-white">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} variant="elevated" padding="none" className="overflow-hidden">
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-secondary pr-4">
                      {faq.question}
                    </h3>
                    {openItems.includes(index) ? (
                      <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-primary flex-shrink-0" />
                    )}
                  </button>
                  {openItems.includes(index) && (
                    <CardContent className="pt-0">
                      <p className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-screen-2xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-secondary mb-6">Still Have Questions?</h2>
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              Our support team is here to help you with any questions or concerns. 
              We typically respond within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/contact">
                  Contact Support
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
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