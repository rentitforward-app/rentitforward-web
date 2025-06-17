'use client';

import { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  MapPin,
  Star,
  Calendar,
  Download,
  Filter
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Listing {
  id: string;
  title: string;
  description: string;
  price_per_day: number;
  category: string;
  location: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
  updated_at: string;
  owner: {
    name: string;
    email: string;
    trust_score: number;
  };
  photos: string[];
  booking_count: number;
  rating: number;
  review_count: number;
  reported: boolean;
  flags: string[];
}

export default function AdminListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [filteredListings, setFilteredListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showListingModal, setShowListingModal] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [listings, searchTerm, statusFilter]);

  const loadListings = async () => {
    try {
      // Mock data - in production, this would come from your database
      const mockListings: Listing[] = [
        {
          id: '1',
          title: 'Professional DSLR Camera Kit',
          description: 'Complete photography setup with Canon EOS R5, multiple lenses, tripod, and accessories. Perfect for events, portraits, and professional shoots.',
          price_per_day: 85,
          category: 'Electronics',
          location: 'Sydney, NSW',
          status: 'pending',
          created_at: '2024-11-20T10:00:00Z',
          updated_at: '2024-11-20T10:00:00Z',
          owner: {
            name: 'Mike Chen',
            email: 'mike.chen@email.com',
            trust_score: 85
          },
          photos: ['/api/placeholder/300/200'],
          booking_count: 0,
          rating: 0,
          review_count: 0,
          reported: false,
          flags: ['new_listing']
        },
        {
          id: '2',
          title: 'Mountain Bike - Trek X-Caliber 9',
          description: 'High-performance mountain bike suitable for trails and urban riding. Recently serviced and in excellent condition.',
          price_per_day: 45,
          category: 'Sports & Recreation',
          location: 'Melbourne, VIC',
          status: 'approved',
          created_at: '2024-11-15T14:30:00Z',
          updated_at: '2024-11-19T16:45:00Z',
          owner: {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@email.com',
            trust_score: 92
          },
          photos: ['/api/placeholder/300/200'],
          booking_count: 8,
          rating: 4.8,
          review_count: 6,
          reported: false,
          flags: []
        },
        {
          id: '3',
          title: 'Camping Gear Set - Complete Package',
          description: 'Everything you need for a weekend camping trip. Includes tent, sleeping bags, cooking equipment, and more.',
          price_per_day: 35,
          category: 'Outdoor & Camping',
          location: 'Brisbane, QLD',
          status: 'pending',
          created_at: '2024-11-19T09:15:00Z',
          updated_at: '2024-11-19T09:15:00Z',
          owner: {
            name: 'Emma Wilson',
            email: 'emma.wilson@email.com',
            trust_score: 67
          },
          photos: ['/api/placeholder/300/200'],
          booking_count: 2,
          rating: 4.0,
          review_count: 2,
          reported: true,
          flags: ['reported', 'incomplete_description']
        },
        {
          id: '4',
          title: 'Power Tools Collection',
          description: 'Professional grade power tools for construction and DIY projects.',
          price_per_day: 25,
          category: 'Tools & Equipment',
          location: 'Perth, WA',
          status: 'rejected',
          created_at: '2024-11-10T11:20:00Z',
          updated_at: '2024-11-18T13:30:00Z',
          owner: {
            name: 'David Brown',
            email: 'david.brown@email.com',
            trust_score: 45
          },
          photos: ['/api/placeholder/300/200'],
          booking_count: 0,
          rating: 0,
          review_count: 0,
          reported: false,
          flags: ['poor_photos', 'safety_concerns']
        }
      ];

      setListings(mockListings);
      setFilteredListings(mockListings);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = [...listings];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(listing =>
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.owner.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'flagged') {
        filtered = filtered.filter(listing => listing.reported || listing.flags.length > 0);
      } else {
        filtered = filtered.filter(listing => listing.status === statusFilter);
      }
    }

    setFilteredListings(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      case 'suspended':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Suspended</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleListingAction = (listing: Listing, action: string) => {
    console.log(`${action} listing:`, listing);
    // Implement listing actions here
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listing Moderation</h1>
          <p className="text-gray-600">Review and manage platform listings</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Listings</p>
              <p className="text-2xl font-bold text-gray-900">{listings.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Review</p>
              <p className="text-2xl font-bold text-gray-900">{listings.filter(l => l.status === 'pending').length}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-gray-900">{listings.filter(l => l.status === 'approved').length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Flagged</p>
              <p className="text-2xl font-bold text-gray-900">{listings.filter(l => l.reported || l.flags.length > 0).length}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search listings by title, description, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">All Listings</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="flagged">Flagged</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredListings.map((listing) => (
          <Card key={listing.id} className="overflow-hidden">
            <div className="relative">
              <img
                src={listing.photos[0]}
                alt={listing.title}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-3 left-3">
                {getStatusBadge(listing.status)}
              </div>
              <div className="absolute top-3 right-3 flex space-x-1">
                {listing.reported && (
                  <div className="bg-red-100 text-red-800 p-1 rounded-full">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
                {listing.flags.length > 0 && (
                  <div className="bg-yellow-100 text-yellow-800 p-1 rounded-full">
                    <span className="text-xs font-medium">{listing.flags.length}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-lg truncate">{listing.title}</h3>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(listing.price_per_day)}/day
                </div>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{listing.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mr-2" />
                  {listing.location}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Package className="w-4 h-4 mr-2" />
                  {listing.category}
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  Created {format(new Date(listing.created_at), 'MMM d, yyyy')}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-600">
                  By {listing.owner.name}
                </div>
                <div className="flex items-center">
                  {listing.booking_count > 0 && (
                    <>
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-gray-600">
                        {listing.rating} ({listing.review_count})
                      </span>
                    </>
                  )}
                </div>
              </div>

              {listing.flags.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-700 mb-1">Flags:</div>
                  <div className="flex flex-wrap gap-1">
                    {listing.flags.map((flag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                        {flag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedListing(listing);
                    setShowListingModal(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Review
                </Button>
                
                {listing.status === 'pending' && (
                  <>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleListingAction(listing, 'approve')}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleListingAction(listing, 'reject')}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredListings.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">No listings found</h3>
            <p className="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        </Card>
      )}

      {/* Listing Detail Modal */}
      {showListingModal && selectedListing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setShowListingModal(false)} />
            <div className="relative bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Listing Review</h3>
                <button
                  onClick={() => setShowListingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedListing.photos[0]}
                    alt={selectedListing.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  
                  <div className="mt-4">
                    <h4 className="text-xl font-semibold text-gray-900 mb-2">
                      {selectedListing.title}
                    </h4>
                    <p className="text-gray-600 mb-4">{selectedListing.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Price per day:</span>
                        <span className="font-medium">{formatCurrency(selectedListing.price_per_day)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Category:</span>
                        <span>{selectedListing.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Location:</span>
                        <span>{selectedListing.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created:</span>
                        <span>{format(new Date(selectedListing.created_at), 'MMM d, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-6">
                    <h5 className="font-medium text-gray-900 mb-3">Owner Information</h5>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-500">Name:</span>
                        <span>{selectedListing.owner.name}</span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-500">Email:</span>
                        <span>{selectedListing.owner.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Trust Score:</span>
                        <span className="font-medium">{selectedListing.owner.trust_score}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h5 className="font-medium text-gray-900 mb-3">Status & Flags</h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Current Status:</span>
                        {getStatusBadge(selectedListing.status)}
                      </div>
                      
                      {selectedListing.reported && (
                        <div className="bg-red-50 p-3 rounded-lg">
                          <div className="flex items-center text-red-700">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            This listing has been reported
                          </div>
                        </div>
                      )}

                      {selectedListing.flags.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-2">Flags:</div>
                          <div className="space-y-1">
                            {selectedListing.flags.map((flag, index) => (
                              <div key={index} className="bg-yellow-50 p-2 rounded text-sm text-yellow-800">
                                {flag.replace('_', ' ')}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h5 className="font-medium text-gray-900 mb-3">Performance</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-sm text-blue-600">Total Bookings</div>
                        <div className="text-xl font-semibold text-blue-700">{selectedListing.booking_count}</div>
                      </div>
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <div className="text-sm text-yellow-600">Average Rating</div>
                        <div className="text-xl font-semibold text-yellow-700">
                          {selectedListing.rating > 0 ? `${selectedListing.rating}/5` : 'No ratings'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setShowListingModal(false)}>
                  Close
                </Button>
                
                {selectedListing.status === 'pending' && (
                  <>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        handleListingAction(selectedListing, 'approve');
                        setShowListingModal(false);
                      }}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        handleListingAction(selectedListing, 'reject');
                        setShowListingModal(false);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                
                {selectedListing.status === 'approved' && (
                  <Button
                    variant="outline"
                    className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                    onClick={() => {
                      handleListingAction(selectedListing, 'suspend');
                      setShowListingModal(false);
                    }}
                  >
                    Suspend
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 