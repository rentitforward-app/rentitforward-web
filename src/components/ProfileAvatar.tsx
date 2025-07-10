'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface ProfileAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLink?: boolean;
}

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export default function ProfileAvatar({ 
  size = 'md', 
  className = '', 
  showLink = true 
}: ProfileAvatarProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClient();

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-8 h-8',
      text: 'text-xs',
      icon: 'w-4 h-4'
    },
    md: {
      container: 'w-9 h-9',
      text: 'text-sm',
      icon: 'w-5 h-5'
    },
    lg: {
      container: 'w-12 h-12',
      text: 'text-base',
      icon: 'w-6 h-6'
    }
  };

  const config = sizeConfig[size];

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          return;
        }

        setProfile(profileData);
      } catch (error) {
        console.error('Error in fetchProfile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user, supabase]);

  // Get initials from full name or email
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  const avatarContent = (
    <div className={`${config.container} ${className} rounded-full flex items-center justify-center overflow-hidden transition-colors`}>
      {isLoading ? (
        <div className="bg-gray-200 w-full h-full rounded-full animate-pulse" />
      ) : profile?.avatar_url ? (
        <Image
          src={profile.avatar_url}
          alt={profile.full_name || 'Profile'}
          width={48}
          height={48}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className={`bg-green-500 w-full h-full flex items-center justify-center text-white font-medium ${config.text} hover:bg-green-600 transition-colors`}>
          {getInitials()}
        </div>
      )}
    </div>
  );

  if (!showLink) {
    return avatarContent;
  }

  return (
    <Link href="/profile" className="block">
      {avatarContent}
    </Link>
  );
} 