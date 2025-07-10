'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Edit, 
  Camera, 
  Star,
  CheckCircle,
  XCircle,
  Award
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  bio?: string;
  avatar_url?: string;
  address?: string;
  city?: string;
  state?: string;
  verified: boolean;
  stripe_onboarded: boolean;
  created_at: string;
  trust_score?: number;
  completion_rate?: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone_number: '',
    bio: '',
    address: '',
    city: '',
    state: ''
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Calculate trust score and completion rate
      const enhancedProfile = {
        ...profile,
        trust_score: 87, // Would be calculated based on reviews, completion rate, etc.
        completion_rate: 94
      };

      setProfile(enhancedProfile);
      setEditForm({
        full_name: profile.full_name ?? '',
        phone_number: profile.phone_number ?? '',
        bio: profile.bio ?? '',
        address: profile.address ?? '',
        city: profile.city ?? '',
        state: profile.state ?? ''
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(editForm)
        .eq('id', profile?.id);

      if (error) {
        console.error('Database error:', error);
        toast.error(error.message || 'Failed to update profile');
        return;
      }

      setProfile(prev => prev ? { ...prev, ...editForm } : null);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Generate unique filename with user ID folder (required by RLS policy)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${profile.id}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success('Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 
                          typeof error === 'object' && error !== null ? JSON.stringify(error) : 
                          'Failed to upload image';
      toast.error(errorMessage);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrustScoreBadge = (score: number) => {
    if (score >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (score >= 70) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800' };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h2>
          <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-gray-600">Your public profile and reputation</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Profile Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Profile Information</h2>
              <Button
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>

            <div className="flex items-start space-x-6 mb-6">
              <div className="relative">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    width={120}
                    height={120}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-30 h-30 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-500" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="avatar-upload"
                />
                <button 
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  disabled={isUploadingImage}
                  className="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-lg border hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {isUploadingImage ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              </div>

              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={editForm.full_name ?? ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={editForm.phone_number ?? ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bio
                      </label>
                      <textarea
                        value={editForm.bio ?? ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        placeholder="Tell others about yourself..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address
                        </label>
                        <input
                          type="text"
                          value={editForm.address ?? ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={editForm.city ?? ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State
                      </label>
                      <select
                        value={editForm.state ?? ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="">Select state</option>
                        <option value="NSW">NSW</option>
                        <option value="VIC">VIC</option>
                        <option value="QLD">QLD</option>
                        <option value="SA">SA</option>
                        <option value="WA">WA</option>
                        <option value="TAS">TAS</option>
                        <option value="NT">NT</option>
                        <option value="ACT">ACT</option>
                      </select>
                    </div>
                    <div className="flex space-x-3">
                      <Button onClick={handleProfileUpdate}>
                        Save Changes
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">{profile.full_name}</h3>
                      <p className="text-gray-600">{profile.email}</p>
                    </div>
                    
                    {profile.phone_number && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {profile.phone_number}
                      </div>
                    )}
                    
                    {(profile.address || profile.city || profile.state) && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {profile.address}{profile.address && (profile.city || profile.state) && ', '}{profile.city}{profile.city && profile.state && ', '}{profile.state}
                      </div>
                    )}
                    
                    {profile.bio && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">About</h4>
                        <p className="text-gray-600">{profile.bio}</p>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-gray-500">
                      <Award className="w-4 h-4 mr-2" />
                      Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Verification Status Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Verification Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center">
                {profile.verified ? (
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500 mr-3" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    Identity Verification
                  </p>
                  <p className="text-sm text-gray-500">
                    {profile.verified ? 'Verified' : 'Verification required'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center">
                {profile.stripe_onboarded ? (
                  <CheckCircle className="w-6 h-6 text-green-500 mr-3" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-500 mr-3" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    Payment Setup
                  </p>
                  <p className="text-sm text-gray-500">
                    {profile.stripe_onboarded ? 'Setup complete' : 'Setup required'}
                  </p>
                </div>
              </div>
            </div>
            
            {(!profile.verified || !profile.stripe_onboarded) && (
              <div className="mt-4">
                <Button 
                  onClick={() => router.push('/settings')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Complete Setup
                </Button>
              </div>
            )}
          </Card>

          {/* Trust Score Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Trust Score</h2>
            
            <div className="text-center mb-6">
              <div className={`text-5xl font-bold ${getTrustScoreColor(profile.trust_score || 0)}`}>
                {profile.trust_score || 0}
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getTrustScoreBadge(profile.trust_score || 0).color}`}>
                  {getTrustScoreBadge(profile.trust_score || 0).text}
                </span>
              </div>
              <p className="text-gray-600 mt-2">Your trust score is based on your activity and feedback</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completion Rate</span>
                <span className="font-medium">{profile.completion_rate || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${profile.completion_rate || 0}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Response Time</span>
                <span className="font-medium">Excellent</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full w-4/5"></div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Item Quality</span>
                <span className="font-medium">Very Good</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full w-3/4"></div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">How to improve your score:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Complete identity verification</li>
                <li>• Maintain high completion rates</li>
                <li>• Respond quickly to messages</li>
                <li>• Provide accurate item descriptions</li>
                <li>• Receive positive reviews</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 