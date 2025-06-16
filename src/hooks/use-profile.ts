'use client'

import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  phone_number?: string
  bio?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country: string
  rating: number
  total_reviews: number
  verified: boolean
  created_at: string
  updated_at: string
}

export function useProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const supabase = createClient()

  const fetchProfile = async (userId: string) => {
    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        setProfile(null)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: 'No user logged in' }

    setProfileLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating profile:', error)
        return { error: error.message }
      } else {
        setProfile(data)
        return { data }
      }
    } catch (error) {
      console.error('Profile update error:', error)
      return { error: 'Failed to update profile' }
    } finally {
      setProfileLoading(false)
    }
  }

  const isProfileComplete = () => {
    return !!(profile?.full_name && profile?.city && profile?.state)
  }

  useEffect(() => {
    // Get initial session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        await fetchProfile(user.id)
      } else {
        setProfile(null)
      }
      
      setLoading(false)
    }

    void getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (currentUser) {
          await fetchProfile(currentUser.id)
        } else {
          setProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return {
    user,
    profile,
    loading,
    profileLoading,
    isAuthenticated: !!user,
    isProfileComplete: isProfileComplete(),
    updateProfile,
    refetchProfile: user ? () => fetchProfile(user.id) : () => Promise.resolve(),
  }
} 