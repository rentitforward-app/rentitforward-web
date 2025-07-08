'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Phone, MapPin, FileText, Upload, CheckCircle, ArrowRight, ArrowLeft, Gift, Shield, Camera } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { VerificationDashboard } from '@/components/VerificationDashboard';

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

// Step 1: Basic Info Schema
const basicInfoSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must be under 500 characters').optional(),
});

// Step 2: Location Schema
const locationSchema = z.object({
  address: z.string().min(2, 'Please enter your address'),
  city: z.string().min(2, 'Please enter your city/suburb'),
  state: z.string().min(1, 'Please select your state'),
  postal_code: z.string().regex(/^[0-9]{4}$/, 'Please enter a valid Australian postcode'),
  phone_number: z.string()
    .regex(/^(\+61|0)[2-9]\d{8}$/, 'Please enter a valid Australian phone number')
    .optional()
    .or(z.literal('')),
});

// Step 3: Referral Schema
const referralSchema = z.object({
  referral_code: z.string().optional(),
});

// Combined schema for final submission
const completeProfileSchema = basicInfoSchema.merge(locationSchema).merge(referralSchema);

type BasicInfoForm = z.infer<typeof basicInfoSchema>;
type LocationForm = z.infer<typeof locationSchema>;
type ReferralForm = z.infer<typeof referralSchema>;
type CompleteProfileForm = z.infer<typeof completeProfileSchema>;

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [formData, setFormData] = useState<Partial<CompleteProfileForm>>({});
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();

  // Individual step forms
  const basicInfoForm = useForm<BasicInfoForm>({
    resolver: zodResolver(basicInfoSchema),
  });

  const locationForm = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
  });

  const referralForm = useForm<ReferralForm>({
    resolver: zodResolver(referralSchema),
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

  const validateReferralCode = async (code: string): Promise<boolean> => {
    if (!code.trim()) return true; // Empty code is valid (optional)

    setIsValidatingReferral(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('referral_code', code.toUpperCase())
        .single();

      if (error || !data) {
        toast.error('Invalid referral code');
        return false;
      }

      toast.success(`Referral code valid! Referred by ${data.full_name}`);
      return true;
    } catch (error) {
      console.error('Referral validation error:', error);
      toast.error('Could not validate referral code');
      return false;
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      const isValid = await basicInfoForm.trigger();
      if (isValid) {
        const data = basicInfoForm.getValues();
        setFormData(prev => ({ ...prev, ...data }));
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      const isValid = await locationForm.trigger();
      if (isValid) {
        const data = locationForm.getValues();
        setFormData(prev => ({ ...prev, ...data }));
        setCurrentStep(3);
      }
    } else if (currentStep === 3) {
      const isValid = await referralForm.trigger();
      if (isValid) {
        const data = referralForm.getValues();
        setFormData(prev => ({ ...prev, ...data }));
        setCurrentStep(4); // Move to verification step
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    // Validate referral code if provided
    const referralData = referralForm.getValues();
    if (referralData.referral_code && referralData.referral_code.trim()) {
      const isValidReferral = await validateReferralCode(referralData.referral_code);
      if (!isValidReferral) return;
    }

    setIsLoading(true);
    try {
      // Upload avatar if provided
      let avatarUrl = null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Combine all form data
      const completeData = {
        ...formData,
        ...referralData,
      };

      // Generate unique referral code for this user
      const generateReferralCode = () => {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
      };

      // Update profile
      const profileData = {
        id: user.id,
        email: user.email,
        full_name: completeData.full_name,
        phone_number: completeData.phone_number || null,
        bio: completeData.bio || null,
        address: completeData.address,
        city: completeData.city,
        state: completeData.state,
        postal_code: completeData.postal_code,
        avatar_url: avatarUrl,
        referral_code: generateReferralCode(),
        referred_by: completeData.referral_code ? completeData.referral_code.toUpperCase() : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) {
        console.error('Profile update error:', error);
        toast.error('Failed to update profile');
      } else {
        setCurrentStep(4); // Success step
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

  // Success step
  if (currentStep === 4) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">
              Welcome to Rent It Forward!
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Your profile has been set up successfully. You'll be redirected to your dashboard shortly.
            </p>
            <div className="animate-pulse">
              <div className="h-2 bg-green-200 rounded-full">
                <div className="h-2 bg-green-500 rounded-full w-full"></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 shadow-lg">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
              <span className="text-sm text-gray-500">Step {currentStep} of 3</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <User className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Tell us about yourself</h2>
                <p className="text-gray-600">Let's start with some basic information</p>
              </div>

              <form className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="w-24 h-24 rounded-full object-cover border-4 border-green-100"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-100">
                        <User className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <label
                      htmlFor="avatar"
                      className="absolute bottom-0 right-0 bg-green-500 text-white p-2 rounded-full cursor-pointer hover:bg-green-600 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                    </label>
                    <input
                      id="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-gray-500">Optional: Upload a profile picture</p>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    {...basicInfoForm.register('full_name')}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter your full name"
                  />
                  {basicInfoForm.formState.errors.full_name && (
                    <p className="mt-2 text-sm text-red-600">
                      {basicInfoForm.formState.errors.full_name.message}
                    </p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio (Optional)
                  </label>
                  <textarea
                    {...basicInfoForm.register('bio')}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Tell others a bit about yourself..."
                  />
                  {basicInfoForm.formState.errors.bio && (
                    <p className="mt-2 text-sm text-red-600">
                      {basicInfoForm.formState.errors.bio.message}
                    </p>
                  )}
                </div>
              </form>

              <div className="flex justify-end">
                <Button
                  onClick={handleNextStep}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <MapPin className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Where are you located?</h2>
                <p className="text-gray-600">This helps us connect you with nearby items</p>
              </div>

              <form className="space-y-6">
                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street Address *
                  </label>
                  <input
                    {...locationForm.register('address')}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="123 Main Street"
                  />
                  {locationForm.formState.errors.address && (
                    <p className="mt-2 text-sm text-red-600">
                      {locationForm.formState.errors.address.message}
                    </p>
                  )}
                </div>

                {/* City and State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City/Suburb *
                    </label>
                    <input
                      {...locationForm.register('city')}
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Sydney"
                    />
                    {locationForm.formState.errors.city && (
                      <p className="mt-2 text-sm text-red-600">
                        {locationForm.formState.errors.city.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <select
                      {...locationForm.register('state')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select state</option>
                      {australianStates.map((state) => (
                        <option key={state.code} value={state.code}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                    {locationForm.formState.errors.state && (
                      <p className="mt-2 text-sm text-red-600">
                        {locationForm.formState.errors.state.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Postcode and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postcode *
                    </label>
                    <input
                      {...locationForm.register('postal_code')}
                      type="text"
                      maxLength={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="2000"
                    />
                    {locationForm.formState.errors.postal_code && (
                      <p className="mt-2 text-sm text-red-600">
                        {locationForm.formState.errors.postal_code.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number (Optional)
                    </label>
                    <input
                      {...locationForm.register('phone_number')}
                      type="tel"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="+61 4xx xxx xxx"
                    />
                    {locationForm.formState.errors.phone_number && (
                      <p className="mt-2 text-sm text-red-600">
                        {locationForm.formState.errors.phone_number.message}
                      </p>
                    )}
                  </div>
                </div>
              </form>

              <div className="flex justify-between">
                <Button
                  onClick={handlePrevStep}
                  variant="outline"
                  className="flex items-center px-6 py-3"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={handleNextStep}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Referral */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Gift className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Got a referral code?</h2>
                <p className="text-gray-600">Enter it here to get bonus rewards (optional)</p>
              </div>

              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referral Code (Optional)
                  </label>
                  <input
                    {...referralForm.register('referral_code')}
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 uppercase"
                    placeholder="ABC123"
                    onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    }}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Enter the referral code from a friend to get bonus points!
                  </p>
                </div>
              </form>

              <div className="flex justify-between">
                <Button
                  onClick={handlePrevStep}
                  variant="outline"
                  className="flex items-center px-6 py-3"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={handleNextStep}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Next Step
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: ID Verification */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Shield className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Verify your identity</h2>
                <p className="text-gray-600">
                  Complete ID verification to start sharing items or access premium features
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">Why verify your identity?</p>
                    <ul className="space-y-1 text-blue-800">
                      <li>• Build trust with other users</li>
                      <li>• Access premium features and higher rental limits</li>
                      <li>• Secure payment processing</li>
                      <li>• Enhanced account protection</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Verification Dashboard Component */}
              <VerificationDashboard className="max-w-4xl mx-auto" />

              <div className="flex justify-between pt-6">
                <Button
                  onClick={handlePrevStep}
                  variant="outline"
                  className="flex items-center px-6 py-3"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-top-transparent mr-2" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
} 