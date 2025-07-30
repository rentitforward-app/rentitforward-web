import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// User profile queries
const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: ID!) {
    user(id: $userId) {
      id
      email
      full_name
      username
      avatar_url
      bio
      location {
        city
        state
        country
      }
      phone
      verified
      member_since: created_at
      rating
      total_rentals
      total_bookings
      
      # User's listings
      listings(first: 10, filter: { status: ACTIVE }) {
        edges {
          node {
            id
            title
            price_per_day
            category
            images
            status
            created_at
            bookings_count
          }
        }
        totalCount
      }
      
      # Recent bookings
      bookings(first: 5, orderBy: CREATED_AT_DESC) {
        edges {
          node {
            id
            start_date
            end_date
            status
            total_amount
            listing {
              id
              title
              images
              owner {
                id
                full_name
              }
            }
          }
        }
        totalCount
      }
      
      # Reviews received
      reviews_received: reviews(first: 5) {
        edges {
          node {
            id
            rating
            comment
            created_at
            reviewer {
              id
              full_name
              avatar_url
            }
          }
        }
        totalCount
        avgRating
      }
    }
  }
`;

const GET_CURRENT_USER_PROFILE = gql`
  query GetCurrentUserProfile {
    me {
      id
      email
      full_name
      username
      avatar_url
      bio
      location {
        city
        state
        country
      }
      phone
      verified
      member_since: created_at
      
      # Dashboard data
      dashboard_stats {
        total_listings
        active_listings
        total_bookings
        pending_bookings
        total_earnings
        avg_rating
      }
      
      # Recent activity
      recent_bookings: bookings(first: 3) {
        edges {
          node {
            id
            start_date
            end_date
            status
            listing {
              title
              images
            }
          }
        }
      }
      
      # Notifications
      notifications(first: 5, filter: { read: false }) {
        edges {
          node {
            id
            title
            message
            type
            created_at
          }
        }
        totalCount
      }
    }
  }
`;

// User profile mutations
const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile($input: UpdateUserProfileInput!) {
    updateUserProfile(input: $input) {
      success
      message
      user {
        id
        full_name
        username
        bio
        avatar_url
        location {
          city
          state
          country
        }
        phone
      }
    }
  }
`;

const UPDATE_AVATAR = gql`
  mutation UpdateAvatar($input: UpdateAvatarInput!) {
    updateAvatar(input: $input) {
      success
      message
      avatar_url
    }
  }
`;

const VERIFY_PHONE = gql`
  mutation VerifyPhone($input: VerifyPhoneInput!) {
    verifyPhone(input: $input) {
      success
      message
      verified
    }
  }
`;

// Hook for getting any user's profile (public view)
export function useUserProfile(userId: string) {
  const {
    data,
    loading,
    error,
    refetch
  } = useQuery(GET_USER_PROFILE, {
    variables: { userId },
    skip: !userId,
    errorPolicy: 'all'
  });

  return {
    user: data?.user,
    loading,
    error,
    refetch,
    
    // Computed values
    listings: data?.user?.listings?.edges?.map((edge: any) => edge.node) || [],
    totalListings: data?.user?.listings?.totalCount || 0,
    bookings: data?.user?.bookings?.edges?.map((edge: any) => edge.node) || [],
    totalBookings: data?.user?.bookings?.totalCount || 0,
    reviews: data?.user?.reviews_received?.edges?.map((edge: any) => edge.node) || [],
    averageRating: data?.user?.reviews_received?.avgRating || 0,
    totalReviews: data?.user?.reviews_received?.totalCount || 0,
  };
}

// Hook for current user's own profile (private view with dashboard data)
export function useCurrentUserProfile() {
  const {
    data,
    loading,
    error,
    refetch
  } = useQuery(GET_CURRENT_USER_PROFILE, {
    errorPolicy: 'all'
  });

  return {
    user: data?.me,
    loading,
    error,
    refetch,
    
    // Dashboard data
    stats: data?.me?.dashboard_stats,
    recentBookings: data?.me?.recent_bookings?.edges?.map((edge: any) => edge.node) || [],
    notifications: data?.me?.notifications?.edges?.map((edge: any) => edge.node) || [],
    unreadNotifications: data?.me?.notifications?.totalCount || 0,
    
    // Quick stats
    isVerified: data?.me?.verified || false,
    memberSince: data?.me?.member_since,
  };
}

// Hook for updating user profile
export function useUpdateUserProfile() {
  const [updateProfile, { loading }] = useMutation(UPDATE_USER_PROFILE);
  
  const updateUserProfile = async (profileData: any) => {
    try {
      const result = await updateProfile({
        variables: {
          input: profileData
        },
        // Update the cache after successful mutation
        update: (cache, { data }) => {
          if (data?.updateUserProfile?.success) {
            // Update current user profile in cache
            cache.modify({
              id: cache.identify({ __typename: 'User', id: data.updateUserProfile.user.id }),
              fields: {
                full_name: () => data.updateUserProfile.user.full_name,
                username: () => data.updateUserProfile.user.username,
                bio: () => data.updateUserProfile.user.bio,
                location: () => data.updateUserProfile.user.location,
                phone: () => data.updateUserProfile.user.phone,
              },
            });
          }
        }
      });

      if (result.data?.updateUserProfile?.success) {
        toast.success('Profile updated successfully!');
        return { success: true, user: result.data.updateUserProfile.user };
      } else {
        toast.error(result.data?.updateUserProfile?.message || 'Failed to update profile');
        return { success: false, error: result.data?.updateUserProfile?.message };
      }
    } catch (error) {
      toast.error('Failed to update profile');
      return { success: false, error };
    }
  };

  return {
    updateUserProfile,
    loading
  };
}

// Hook for updating avatar
export function useUpdateAvatar() {
  const [updateAvatar, { loading }] = useMutation(UPDATE_AVATAR);
  
  const updateUserAvatar = async (avatarFile: File) => {
    try {
      // In a real implementation, you'd upload to Supabase Storage first
      // then pass the URL to the mutation
      const avatarUrl = await uploadImageToStorage(avatarFile);
      
      const result = await updateAvatar({
        variables: {
          input: { avatar_url: avatarUrl }
        }
      });

      if (result.data?.updateAvatar?.success) {
        toast.success('Avatar updated successfully!');
        return { success: true, avatarUrl: result.data.updateAvatar.avatar_url };
      } else {
        toast.error('Failed to update avatar');
        return { success: false };
      }
    } catch (error) {
      toast.error('Failed to update avatar');
      return { success: false, error };
    }
  };

  return {
    updateUserAvatar,
    loading
  };
}

// Hook for phone verification
export function usePhoneVerification() {
  const [verifyPhone, { loading }] = useMutation(VERIFY_PHONE);
  
  const verifyUserPhone = async (phoneNumber: string, verificationCode: string) => {
    try {
      const result = await verifyPhone({
        variables: {
          input: { phone: phoneNumber, code: verificationCode }
        }
      });

      if (result.data?.verifyPhone?.success) {
        toast.success('Phone verified successfully!');
        return { success: true };
      } else {
        toast.error('Invalid verification code');
        return { success: false };
      }
    } catch (error) {
      toast.error('Verification failed');
      return { success: false, error };
    }
  };

  return {
    verifyUserPhone,
    loading
  };
}

// Helper function for image upload (placeholder - implement with Supabase Storage)
async function uploadImageToStorage(file: File): Promise<string> {
  // Placeholder implementation
  // In reality, you'd upload to Supabase Storage and return the public URL
  return URL.createObjectURL(file);
} 