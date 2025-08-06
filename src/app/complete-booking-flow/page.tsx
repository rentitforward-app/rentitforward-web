'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/separator';
import { AvailabilityCalendar } from '@/components/booking/AvailabilityCalendar';
import { PricingBreakdown } from '@/components/booking/PricingBreakdown';
import { BookingRequestForm } from '@/components/booking/BookingRequestForm';
import { OwnerBookingDashboard } from '@/components/booking/OwnerBookingDashboard';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';
import { DateRangeSelection } from '@/lib/calendar-utils';
import { 
  ArrowRight, 
  Search, 
  Calendar, 
  CreditCard, 
  Clock, 
  CheckCircle,
  Package,
  RotateCcw,
  Star,
  Bell,
  MapPin,
  User,
  DollarSign,
  Shield,
  Camera,
  MessageSquare
} from 'lucide-react';

const mockListing = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Professional Camera Kit - Canon EOS R5',
  description: 'Complete professional photography setup including Canon EOS R5 camera body, 24-70mm f/2.8 lens, tripod, and camera bag. Perfect for events, portraits, and commercial photography.',
  category: 'Photography',
  price_per_day: 95.00,
  price_weekly: 550.00,
  images: [
    '/images/camera-kit-1.jpg',
    '/images/camera-kit-2.jpg',
  ],
  owner: {
    name: 'Alex Chen',
    rating: 4.9,
    reviews: 127,
    avatar: '/images/alex-avatar.jpg',
  },
  location: {
    address: '123 Collins Street',
    city: 'Melbourne',
    state: 'VIC',
    postal_code: '3000',
  },
  features: ['4K Video Recording', 'Weather Sealed', 'Image Stabilization'],
  deposit: 200.00,
  insurance_enabled: true,
};

export default function CompleteBookingFlowPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState<{startDate: Date | null; endDate: Date | null}>({
    startDate: null,
    endDate: null,
  });
  const [showPricing, setShowPricing] = useState(false);
  const [bookingData, setBookingData] = useState<any>(null);

  const steps = [
    { id: 1, title: 'Browse & Discover', icon: Search, description: 'Find the perfect item' },
    { id: 2, title: 'Item Detail & Availability', icon: Calendar, description: 'View details and check availability' },
    { id: 3, title: 'Price & Fee Breakdown', icon: DollarSign, description: 'Transparent pricing' },
    { id: 4, title: 'Booking & Payment Authorization', icon: CreditCard, description: 'Secure payment hold' },
    { id: 5, title: 'Owner Review & Confirmation', icon: Clock, description: 'Awaiting owner approval' },
    { id: 6, title: 'Booking Confirmed', icon: CheckCircle, description: 'Payment captured' },
    { id: 7, title: 'Pickup & Rental Period', icon: Package, description: 'Item pickup and usage' },
    { id: 8, title: 'Return & Completion', icon: RotateCcw, description: 'Return and review' },
    { id: 9, title: 'Notifications & Documents', icon: Bell, description: 'Real-time updates' },
  ];

  const handleDateSelection = (selection: DateRangeSelection) => {
    setSelectedDates({ startDate: selection.startDate, endDate: selection.endDate });
    if (selection.startDate && selection.endDate) {
      setShowPricing(true);
      setCurrentStep(3);
    }
  };

  const handleBookingSubmit = (data: any) => {
    setBookingData(data);
    setCurrentStep(4);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">🔍 Browse & Discover</h2>
              <p className="text-gray-600 mb-6">Search and filter through thousands of items available for rent</p>
            </div>
            
            <Card className="max-w-md mx-auto">
              <div className="aspect-video bg-gray-200 rounded-t-lg flex items-center justify-center">
                <Camera className="w-12 h-12 text-gray-400" />
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{mockListing.title}</h3>
                  <Badge variant="outline">{mockListing.category}</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{mockListing.description}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg font-bold text-green-600">${mockListing.price_per_day}/day</span>
                    <div className="text-xs text-gray-500">${mockListing.price_weekly}/week</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{mockListing.owner.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                  <MapPin className="w-3 h-3" />
                  <span>{mockListing.location.city}, {mockListing.location.state}</span>
                </div>
              </CardContent>
            </Card>
            
            <div className="text-center">
              <Button onClick={() => setCurrentStep(2)} className="bg-green-600 hover:bg-green-700">
                View Details <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">📋 Item Detail & Availability</h2>
              <p className="text-gray-600 mb-6">Check availability and select your rental dates</p>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    {mockListing.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-gray-600">{mockListing.description}</p>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{mockListing.owner.name}</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs">{mockListing.owner.rating} ({mockListing.owner.reviews})</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Features:</h4>
                    <div className="flex flex-wrap gap-2">
                      {mockListing.features.map((feature, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-gray-500">Daily Rate</div>
                      <div className="text-lg font-semibold text-green-600">${mockListing.price_per_day}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Weekly Rate</div>
                      <div className="text-lg font-semibold text-green-600">${mockListing.price_weekly}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Select Dates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AvailabilityCalendar
                    listingId={mockListing.id}
                    onDatesSelected={handleDateSelection}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">💰 Price & Fee Breakdown</h2>
              <p className="text-gray-600 mb-6">Transparent pricing with no hidden fees</p>
            </div>

            {selectedDates.startDate && selectedDates.endDate && (
              <div className="max-w-lg mx-auto">
                <PricingBreakdown
                  basePrice={mockListing.price_per_day}
                  startDate={selectedDates.startDate}
                  endDate={selectedDates.endDate}
                  deposit={mockListing.deposit}
                  insuranceEnabled={mockListing.insurance_enabled}
                  showInsurance={true}
                />
                <div className="mt-6 text-center">
                  <Button 
                    onClick={() => setCurrentStep(4)} 
                    className="bg-green-600 hover:bg-green-700 w-full"
                  >
                    Continue to Book <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">🔒 Booking & Payment Authorization</h2>
              <p className="text-gray-600 mb-6">Secure your booking with payment authorization</p>
            </div>

            <div className="max-w-lg mx-auto">
              <BookingRequestForm
                listingId={mockListing.id}
                startDate={selectedDates.startDate!}
                endDate={selectedDates.endDate!}
                onSubmit={handleBookingSubmit}
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">⏳ Owner Review & Confirmation</h2>
              <p className="text-gray-600 mb-6">Owner is reviewing your booking request</p>
            </div>

            <div className="max-w-2xl mx-auto">
              <OwnerBookingDashboard />
            </div>

            <div className="text-center">
              <Button onClick={() => setCurrentStep(6)} variant="outline">
                Simulate Owner Approval <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">✅ Booking Confirmed</h2>
              <p className="text-gray-600 mb-6">Payment captured, booking is confirmed!</p>
            </div>

            <Card className="max-w-lg mx-auto">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Booking Confirmed!</h3>
                <p className="text-gray-600 mb-4">
                  Your booking for {mockListing.title} has been confirmed.
                </p>
                
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Booking ID:</span>
                      <span className="font-mono">RF-2025-001</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pickup Date:</span>
                      <span>{selectedDates.startDate?.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Return Date:</span>
                      <span>{selectedDates.endDate?.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setCurrentStep(7)} className="w-full">
                  Continue to Pickup <Package className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">📦 Pickup & Rental Period</h2>
              <p className="text-gray-600 mb-6">Coordinate pickup and enjoy your rental</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Pickup Confirmation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium mb-2">Pickup Instructions</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Location:</strong> {mockListing.location.address}</p>
                      <p><strong>Time:</strong> 10:00 AM - 6:00 PM</p>
                      <p><strong>Contact:</strong> {mockListing.owner.name}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Photo Documentation</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-400" />
                      </div>
                      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Photos taken during pickup for condition documentation</p>
                  </div>

                  <Button className="w-full" variant="outline">
                    Confirm Pickup <CheckCircle className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Communication
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm font-medium">Alex Chen (Owner)</div>
                      <div className="text-sm text-gray-600 mt-1">
                        "Hi! The camera kit is ready for pickup. Everything is included and in perfect working condition. Let me know when you arrive!"
                      </div>
                      <div className="text-xs text-gray-400 mt-1">10 minutes ago</div>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg ml-4">
                      <div className="text-sm font-medium">You</div>
                      <div className="text-sm text-gray-600 mt-1">
                        "Perfect! I'll be there in 30 minutes. Thank you!"
                      </div>
                      <div className="text-xs text-gray-400 mt-1">5 minutes ago</div>
                    </div>
                  </div>

                  <Button onClick={() => setCurrentStep(8)} className="w-full">
                    Proceed to Return <RotateCcw className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">🔄 Return & Completion</h2>
              <p className="text-gray-600 mb-6">Return the item and complete your rental</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="w-5 h-5" />
                    Return Process
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium mb-2">Return Checklist</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>All items returned</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Good condition confirmed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Photos documented</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Condition Assessment</h4>
                    <div className="p-3 border rounded-lg">
                      <div className="text-sm">
                        <strong>Final Condition:</strong> Excellent
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Item returned in perfect condition with all accessories.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Review & Rating
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-3">How was your rental experience?</p>
                    <div className="flex justify-center gap-1 mb-4">
                      {[1,2,3,4,5].map((star) => (
                        <Star key={star} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  
                  <textarea 
                    className="w-full p-3 border rounded-lg text-sm" 
                    rows={3}
                    placeholder="Share your experience with this rental..."
                    defaultValue="Excellent camera kit! Everything worked perfectly and Alex was very helpful with setup instructions. Highly recommend!"
                  />

                  <Button onClick={() => setCurrentStep(9)} className="w-full bg-green-600 hover:bg-green-700">
                    Complete Rental <CheckCircle className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">🔔 Notifications & Documents</h2>
              <p className="text-gray-600 mb-6">Manage notifications and access your rental documents</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Notification Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { time: '2 days ago', message: 'Booking request submitted', icon: CreditCard },
                      { time: '2 days ago', message: 'Owner approved your booking', icon: CheckCircle },
                      { time: '1 day ago', message: 'Payment confirmed', icon: DollarSign },
                      { time: '1 day ago', message: 'Pickup reminder sent', icon: Package },
                      { time: '4 hours ago', message: 'Return reminder sent', icon: RotateCcw },
                      { time: '10 minutes ago', message: 'Rental completed successfully', icon: Star },
                    ].map((notification, index) => {
                      const IconComponent = notification.icon;
                      return (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <IconComponent className="w-5 h-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{notification.message}</div>
                            <div className="text-xs text-gray-500">{notification.time}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                </CardHeader>
                <CardContent className="max-h-96 overflow-y-auto">
                  <NotificationPreferences />
                </CardContent>
              </Card>
            </div>

            <Card className="max-w-lg mx-auto">
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Rental Completed!</h3>
                <p className="text-gray-600 mb-4">
                  Thank you for using Rent It Forward. Your security deposit has been refunded.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" className="text-sm">
                    <Shield className="w-4 h-4 mr-2" />
                    View Receipt
                  </Button>
                  <Button className="text-sm bg-green-600 hover:bg-green-700">
                    <Search className="w-4 h-4 mr-2" />
                    Rent Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎯 Complete 9-Step Booking Flow
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Experience the complete Airbnb-style booking journey from discovery to completion. 
            This interactive demo showcases all phases working together seamlessly.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-12">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-9 gap-2 mb-4">
              {steps.map((step, index) => {
                const IconComponent = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div key={step.id} className="text-center">
                    <button
                      onClick={() => setCurrentStep(step.id)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                        isActive 
                          ? 'bg-green-600 text-white scale-110' 
                          : isCompleted
                          ? 'bg-green-100 text-green-600 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </button>
                    <div className={`text-xs font-medium ${
                      isActive ? 'text-green-600' : isCompleted ? 'text-green-500' : 'text-gray-400'
                    }`}>
                      Step {step.id}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Current Step Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Step Navigation */}
        <div className="flex justify-center gap-4">
          {currentStep > 1 && (
            <Button 
              onClick={() => setCurrentStep(currentStep - 1)}
              variant="outline"
            >
              Previous Step
            </Button>
          )}
          
          {currentStep < steps.length && (
            <Button 
              onClick={() => setCurrentStep(currentStep + 1)}
              className="bg-green-600 hover:bg-green-700"
            >
              Next Step <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === steps.length && (
            <Button 
              onClick={() => setCurrentStep(1)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Start Over <RotateCcw className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>

        {/* Implementation Summary */}
        <div className="mt-16 max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">🏆 Implementation Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Phase 1: Foundation</h3>
                  <p className="text-sm text-gray-600">Calendar availability, pricing breakdown, and real-time sync</p>
                  <Badge className="mt-2 bg-green-100 text-green-600">✅ Complete</Badge>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Phase 2: Approval</h3>
                  <p className="text-sm text-gray-600">Owner approval workflow, payment authorization & capture</p>
                  <Badge className="mt-2 bg-green-100 text-green-600">✅ Complete</Badge>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Phase 3: Notifications</h3>
                  <p className="text-sm text-gray-600">OneSignal integration, push notifications, & preferences</p>
                  <Badge className="mt-2 bg-green-100 text-green-600">✅ Complete</Badge>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-3">🎉 All Phases Successfully Integrated!</h3>
                <p className="text-gray-600 mb-4">
                  The complete 9-step Airbnb-style booking flow is now fully functional with real-time notifications, 
                  transparent pricing, owner approval workflow, and rental lifecycle management.
                </p>
                
                <div className="flex justify-center gap-4">
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    ✅ Calendar & Availability
                  </Badge>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    ✅ Pricing Transparency
                  </Badge>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    ✅ Owner Approval Flow
                  </Badge>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    ✅ Push Notifications
                  </Badge>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    ✅ Rental Lifecycle
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}