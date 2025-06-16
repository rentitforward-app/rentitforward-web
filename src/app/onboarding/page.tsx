'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Phone, MapPin, FileText, Upload, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';

const australianStates = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' }
];

const profileCompletionSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone_number: z.string()
    .regex(/^(\+61|0)[2-9]\d{8}$/, 'Please enter a valid Australian phone number')
    .optional()
    .or(z.literal('')),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
  address: z.string().min(2, 'Please enter your address'),
  city: z.string().min(2, 'Please enter your city/suburb'),
  state: z.string().min(1, 'Please select your state'),
  postal_code: z.string().regex(/^[0-9]{4}$/, 'Please enter a valid Australian postcode'),
});

type ProfileCompletionForm = z.infer<typeof profileCompletionSchema>;

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProfileCompletionForm>({
    resolver: zodResolver(profileCompletionSchema),
  });

  // Check if user is authenticated and redirect if not
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Check if profile is already complete
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile && profile.full_name && profile.city && profile.state) {
        // Profile is already complete, redirect to dashboard
        router.push('/dashboard');
      }
    };

    checkProfile();
  }, [user, supabase, router]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;

    const fileExt = avatarFile.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, avatarFile);

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      toast.error('Failed to upload avatar');
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const onSubmit = async (data: ProfileCompletionForm) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Upload avatar if provided
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Update profile
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: data.full_name,
        phone_number: data.phone_number || null,
        bio: data.bio || null,
        address: data.address,
        city: data.city,
        state: data.state,
        postal_code: data.postal_code,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        console.error('Profile update error:', error);
        toast.error('Failed to update profile');
      } else {
        setStep(3); // Success step
        toast.success('Profile completed successfully!');
        
        // Redirect to dashboard after success
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#44D62C]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Welcome to Rent It Forward!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your profile has been set up successfully. You'll be redirected to your dashboard shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-8">
            <div className="flex justify-center">
              <div className="text-3xl font-bold text-[#44D62C]">
                Rent It Forward
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Complete your profile
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Help us get to know you better so you can start renting and sharing!
            </p>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#44D62C] h-2 rounded-full transition-all duration-300"
                  style={{ width: step === 1 ? '50%' : '100%' }}
                ></div>
              </div>
              <span className="ml-2 text-sm font-medium text-gray-500">
                Step {step} of 2
              </span>
            </div>
          </div>

          {step === 1 && (
            <form onSubmit={() => setStep(2)} className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Basic Information
              </h3>

              {/* Avatar Upload */}
              <div className="flex items-center space-x-6">
                <div className="shrink-0">
                  {avatarPreview ? (
                    <img className="h-16 w-16 object-cover rounded-full" src={avatarPreview} alt="Avatar preview" />
                  ) : (
                    <div className="h-16 w-16 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-8 w-8 text-gray-500" />
                    </div>
                  )}
                </div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('full_name')}
                    type="text"
                    className={`appearance-none block w-full px-3 py-2 pl-10 border ${
                      errors.full_name ? 'border-red-300' : 'border-gray-300'
                    } rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm`}
                    placeholder="Enter your full name"
                  />
                </div>
                {errors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>
                )}
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                  Phone Number (Optional)
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('phone_number')}
                    type="text"
                    className={`appearance-none block w-full px-3 py-2 pl-10 border ${
                      errors.phone_number ? 'border-red-300' : 'border-gray-300'
                    } rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm`}
                    placeholder="+61 400 000 000"
                  />
                </div>
                {errors.phone_number && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone_number.message}</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  Bio (Optional)
                </label>
                <div className="relative mt-1">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <textarea
                    {...register('bio')}
                    rows={3}
                    className={`appearance-none block w-full px-3 py-2 pl-10 border ${
                      errors.bio ? 'border-red-300' : 'border-gray-300'
                    } rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm`}
                    placeholder="Tell us a bit about yourself..."
                  />
                </div>
                {errors.bio && (
                  <p className="mt-1 text-sm text-red-600">{errors.bio.message}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
              >
                Continue
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Location Information
              </h3>

              {/* Address */}
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address *
                </label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('address')}
                    type="text"
                    className={`appearance-none block w-full px-3 py-2 pl-10 border ${
                      errors.address ? 'border-red-300' : 'border-gray-300'
                    } rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm`}
                    placeholder="Enter your street address"
                  />
                </div>
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              {/* City and State Row */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                    City/Suburb *
                  </label>
                  <input
                    {...register('city')}
                    type="text"
                    className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                      errors.city ? 'border-red-300' : 'border-gray-300'
                    } rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm`}
                    placeholder="Melbourne"
                  />
                  {errors.city && (
                    <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                    State *
                  </label>
                  <select
                    {...register('state')}
                    className={`mt-1 block w-full px-3 py-2 border ${
                      errors.state ? 'border-red-300' : 'border-gray-300'
                    } rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm`}
                  >
                    <option value="">Select state</option>
                    {australianStates.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  {errors.state && (
                    <p className="mt-1 text-sm text-red-600">{errors.state.message}</p>
                  )}
                </div>
              </div>

              {/* Postcode */}
              <div>
                <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                  Postcode *
                </label>
                <input
                  {...register('postal_code')}
                  type="text"
                  className={`mt-1 appearance-none block w-full px-3 py-2 border ${
                    errors.postal_code ? 'border-red-300' : 'border-gray-300'
                  } rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-[#44D62C] focus:border-[#44D62C] sm:text-sm`}
                  placeholder="3000"
                />
                {errors.postal_code && (
                  <p className="mt-1 text-sm text-red-600">{errors.postal_code.message}</p>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C]"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#44D62C] hover:bg-[#3AB827] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#44D62C] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Completing...' : 'Complete Profile'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 