'use client';

import React, { useState } from 'react';
import { useUserProfile, useCurrentUserProfile, useUpdateUserProfile } from '@/hooks/graphql/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatPrice, formatDate } from '@rentitforward/shared/utils/formatting';

interface UserProfileProps {
  userId?: string; // If provided, shows public profile; if not, shows current user's profile
  isOwnProfile?: boolean;
}

/**
 * Modern User Profile Component using GraphQL
 * Demonstrates efficient data loading with relationships and real-time updates
 */
export function GraphQLUserProfile({ userId, isOwnProfile = false }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);

  // Use different hooks based on whether viewing own profile or someone else's
  const publicProfile = useUserProfile(userId || '');
  const currentProfile = useCurrentUserProfile();
  const { updateUserProfile, loading: updateLoading } = useUpdateUserProfile();

  // Determine which data to use
  const profile = isOwnProfile || !userId ? currentProfile : publicProfile;
  const { user, loading, error, stats, recentBookings, notifications } = profile;

  if (loading) {
    return <UserProfileSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <p className="text-red-600">Error loading profile: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-gray-600">User not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback className="text-lg">
                {user.full_name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{user.full_name}</h1>
                  {user.username && (
                    <p className="text-gray-600">@{user.username}</p>
                  )}
                </div>
                
                {isOwnProfile && (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-4">
                {user.location && (
                  <span className="text-sm text-gray-600">
                    📍 {user.location.city}, {user.location.state}
                  </span>
                )}
                
                {user.verified && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    ✅ Verified
                  </Badge>
                )}
                
                {user.member_since && (
                  <span className="text-sm text-gray-600">
                    Member since {formatDate(new Date(user.member_since))}
                  </span>
                )}
              </div>
              
              {user.bio && (
                <p className="text-gray-700">{user.bio}</p>
              )}
              
              {/* User Stats */}
              <div className="flex items-center space-x-6 pt-2">
                <div className="text-center">
                  <div className="text-xl font-bold">{profile.totalListings || 0}</div>
                  <div className="text-xs text-gray-600">Listings</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{profile.totalBookings || 0}</div>
                  <div className="text-xs text-gray-600">Bookings</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{profile.averageRating?.toFixed(1) || '0.0'}</div>
                  <div className="text-xs text-gray-600">Rating ⭐</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{profile.totalReviews || 0}</div>
                  <div className="text-xs text-gray-600">Reviews</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="listings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          {isOwnProfile && <TabsTrigger value="dashboard">Dashboard</TabsTrigger>}
        </TabsList>

        {/* Listings Tab */}
        <TabsContent value="listings" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Listings ({profile.totalListings})</h3>
            {isOwnProfile && (
              <Button>+ Add New Listing</Button>
            )}
          </div>
          
          {profile.listings?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.listings.map((listing: any) => (
                <Card key={listing.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    {listing.images && listing.images[0] && (
                      <div className="aspect-video bg-gray-200 rounded-md mb-3">
                        <img 
                          src={listing.images[0]} 
                          alt={listing.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>
                    )}
                    <h4 className="font-semibold line-clamp-2">{listing.title}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-lg font-bold text-green-600">
                        {formatPrice(listing.price_per_day)}/day
                      </span>
                      <Badge variant="outline">{listing.category}</Badge>
                    </div>
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                      <span>{listing.bookings_count || 0} bookings</span>
                      <span>{formatDate(new Date(listing.created_at))}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-gray-600 mb-4">No listings found</p>
                {isOwnProfile && (
                  <Button>Create Your First Listing</Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Bookings ({profile.totalBookings})</h3>
          
          {profile.bookings?.length > 0 ? (
            <div className="space-y-3">
              {profile.bookings.map((booking: any) => (
                <Card key={booking.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      {booking.listing?.images?.[0] && (
                        <img 
                          src={booking.listing.images[0]} 
                          alt={booking.listing.title}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{booking.listing?.title}</h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(new Date(booking.start_date))} - {formatDate(new Date(booking.end_date))}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <Badge 
                            variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                          >
                            {booking.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {formatPrice(booking.total_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-gray-600">No bookings found</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <h3 className="text-lg font-semibold">
            Reviews ({profile.totalReviews}) • {profile.averageRating?.toFixed(1)} ⭐
          </h3>
          
          {profile.reviews?.length > 0 ? (
            <div className="space-y-4">
              {profile.reviews.map((review: any) => (
                <Card key={review.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={review.reviewer?.avatar_url} />
                        <AvatarFallback>
                          {review.reviewer?.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">{review.reviewer?.full_name}</h5>
                          <div className="flex items-center space-x-2">
                            <div className="flex">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                                  ⭐
                                </span>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">
                              {formatDate(new Date(review.created_at))}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 mt-1">{review.comment}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-gray-600">No reviews yet</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dashboard Tab (Own Profile Only) */}
        {isOwnProfile && (
          <TabsContent value="dashboard" className="space-y-4">
            <h3 className="text-lg font-semibold">Dashboard</h3>
            
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPrice(stats.total_earnings || 0)}
                    </div>
                    <div className="text-sm text-gray-600">Total Earnings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stats.active_listings || 0}</div>
                    <div className="text-sm text-gray-600">Active Listings</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{stats.pending_bookings || 0}</div>
                    <div className="text-sm text-gray-600">Pending Bookings</div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Recent Activity */}
            {recentBookings && recentBookings.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  {recentBookings.map((booking: any) => (
                    <Card key={booking.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{booking.listing?.title}</span>
                        <Badge variant="outline">{booking.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDate(new Date(booking.start_date))} - {formatDate(new Date(booking.end_date))}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Notifications */}
            {notifications && notifications.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recent Notifications ({notifications.length})</h4>
                <div className="space-y-2">
                  {notifications.map((notification: any) => (
                    <Card key={notification.id} className="p-3 bg-blue-50">
                      <h5 className="font-medium">{notification.title}</h5>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* GraphQL Demo Info */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-800">🚀 GraphQL Profile Features</CardTitle>
        </CardHeader>
        <CardContent className="text-green-700">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Efficient Data Loading:</h4>
              <ul className="space-y-1 text-sm">
                <li>✅ Single query loads user + listings + bookings + reviews</li>
                <li>✅ DataLoader prevents N+1 queries for relationships</li>
                <li>✅ Real-time updates via subscriptions</li>
                <li>✅ Optimistic updates for better UX</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Smart Features:</h4>
              <ul className="space-y-1 text-sm">
                <li>🔄 Automatic cache updates after mutations</li>
                <li>⚡ Instant UI updates with loading states</li>
                <li>🎯 Precise data fetching (no over-fetching)</li>
                <li>📊 Rich relationship data in single request</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Loading skeleton component
function UserProfileSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-96" />
              <div className="flex space-x-6 pt-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="text-center">
                    <Skeleton className="h-6 w-12 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="aspect-video mb-3" />
              <Skeleton className="h-5 w-full mb-2" />
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 