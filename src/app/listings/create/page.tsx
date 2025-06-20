'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Upload, 
  X, 
  DollarSign, 
  MapPin, 
  Package, 
  Info,
  Camera,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import Image from 'next/image';

const categories = {
  'tools-diy': { 
    label: 'Tools & DIY', 
    icon: '🔧',
    subcategories: ['Power Tools', 'Hand Tools', 'Measuring Tools', 'Safety Equipment', 'Ladders & Scaffolding'] 
  },
  'electronics': { 
    label: 'Electronics', 
    icon: '📱',
    subcategories: ['Computers', 'Audio', 'Gaming', 'Smart Home', 'Tablets'] 
  },
  'cameras': { 
    label: 'Cameras', 
    icon: '📷',
    subcategories: ['DSLR', 'Mirrorless', 'Action Cameras', 'Lenses', 'Accessories'] 
  },
  'sports-outdoors': { 
    label: 'Sports & Outdoors', 
    icon: '🏃',
    subcategories: ['Camping', 'Cycling', 'Water Sports', 'Winter Sports', 'Fitness'] 
  },
  'event-party': { 
    label: 'Event & Party', 
    icon: '🎉',
    subcategories: ['Sound Systems', 'Lighting', 'Decorations', 'Furniture', 'Catering Equipment'] 
  },
  'instruments': { 
    label: 'Instruments', 
    icon: '🎸',
    subcategories: ['Guitars', 'Keyboards', 'Drums', 'Wind Instruments', 'Recording Equipment'] 
  },
  'automotive': { 
    label: 'Automotive', 
    icon: '🚗',
    subcategories: ['Car Care', 'Tools', 'Accessories', 'Bike Racks', 'Trailers'] 
  },
  'home-garden': { 
    label: 'Home & Garden', 
    icon: '🏡',
    subcategories: ['Gardening Tools', 'Lawn Care', 'Cleaning Equipment', 'Furniture', 'Appliances'] 
  },
  'appliances': { 
    label: 'Appliances', 
    icon: '🔌',
    subcategories: ['Kitchen', 'Laundry', 'Heating & Cooling', 'Small Appliances', 'Cleaning'] 
  },
  'other': { 
    label: 'Other', 
    icon: '📦',
    subcategories: ['Books', 'Games', 'Baby Items', 'Pet Supplies', 'Miscellaneous'] 
  }
};

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

const conditionOptions = [
  { value: 'new', label: 'New', description: 'Item is brand new, never used' },
  { value: 'like-new', label: 'Like New', description: 'Item is in excellent condition, minimal use' },
  { value: 'good', label: 'Good', description: 'Item shows normal wear but functions perfectly' },
  { value: 'fair', label: 'Fair', description: 'Item has noticeable wear but is still functional' }
];

const deliveryOptions = [
  { value: 'pickup', label: 'Pickup Only', description: 'Renter picks up from your location' },
  { value: 'delivery', label: 'Delivery Available', description: 'You can deliver within your area' },
  { value: 'shipping', label: 'Shipping', description: 'Can be shipped Australia-wide' }
];

// Schema for different steps
const stepSchemas = {
  1: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
    category: z.string().min(1, 'Please select a category'),
    subcategory: z.string().optional(),
  }),
  2: z.object({
    condition: z.string().min(1, 'Please select the item condition'),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional(),
  }),
  3: z.object({
    dailyRate: z.number().min(1, 'Daily rate must be at least $1').max(1000, 'Daily rate must be less than $1000'),
    weeklyRate: z.number().optional(),
    monthlyRate: z.number().optional(),
    depositAmount: z.number().min(0, 'Deposit amount must be at least $0'),
  }),
  4: z.object({
    location: z.string().min(2, 'Please enter your suburb/city'),
    state: z.string().min(1, 'Please select your state'),
    postcode: z.string().regex(/^[0-9]{4}$/, 'Please enter a valid Australian postcode'),
    deliveryMethods: z.array(z.string()).min(1, 'Please select at least one delivery method'),
  })
};

const fullSchema = z.object({
  ...stepSchemas[1].shape,
  ...stepSchemas[2].shape,
  ...stepSchemas[3].shape,
  ...stepSchemas[4].shape,
});

type ListingForm = z.infer<typeof fullSchema>;

const steps = [
  { id: 1, title: 'Basic Details', description: 'Tell us about your item' },
  { id: 2, title: 'Item Condition', description: 'Describe the condition and specifications' },
  { id: 3, title: 'Pricing', description: 'Set your rental rates' },
  { id: 4, title: 'Location & Delivery', description: 'Where and how will renters get the item' },
  { id: 5, title: 'Photos', description: 'Add photos to showcase your item' }
];

export default function CreateListingPage() {
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<ListingForm>({
    resolver: zodResolver(fullSchema),
    mode: 'onChange',
    defaultValues: {
      deliveryMethods: [],
      depositAmount: 0,
    }
  });

  const watchCategory = watch('category');
  
  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (watchCategory) {
      setValue('subcategory', ''); // Reset subcategory when category changes
    }
  }, [watchCategory, setValue]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login?redirectTo=/listings/create');
      return;
    }
    setUser(user);
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    const currentSchema = stepSchemas[currentStep as keyof typeof stepSchemas];
    if (!currentSchema) return true;

    const currentData = getValues();
    const result = currentSchema.safeParse(currentData);
    
    if (result.success) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      return true;
    } else {
      // Trigger validation for current step fields
      const stepFields = Object.keys(currentSchema.shape);
      await trigger(stepFields as any);
      return false;
    }
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    // Validate file size and type
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast.error(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast.error(`File ${file.name} is not a supported image format.`);
        return false;
      }
      return true;
    });

    setImages([...images, ...validFiles]);

    // Create preview URLs
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreview(imagePreview.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    const uploadPromises = images.map(async (image, index) => {
      const fileName = `${Date.now()}-${index}-${image.name}`;
      const { data, error } = await supabase.storage
        .from('listing-images')
        .upload(fileName, image);

      if (error) {
        console.error('Error uploading image:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      return publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  const handleDeliveryMethodChange = (method: string, checked: boolean) => {
    const currentMethods = getValues('deliveryMethods') || [];
    if (checked) {
      setValue('deliveryMethods', [...currentMethods, method]);
    } else {
      setValue('deliveryMethods', currentMethods.filter(m => m !== method));
    }
    trigger('deliveryMethods');
  };

  const onSubmit = async (data: ListingForm) => {
    if (images.length === 0) {
      toast.error('Please add at least one image');
      setCurrentStep(5);
      return;
    }

    setIsLoading(true);
    try {
      // Upload images
      const imageUrls = await uploadImages();

      // Create listing
      const { data: listing, error } = await supabase
        .from('listings')
        .insert({
          owner_id: user.id,
          title: data.title,
          description: data.description,
          category: data.category,
          subcategory: data.subcategory || null,
          daily_rate: data.dailyRate,
          weekly_rate: data.weeklyRate || null,
          monthly_rate: data.monthlyRate || null,
          deposit_amount: data.depositAmount,
          images: imageUrls,
          location: data.location,
          state: data.state,
          postcode: data.postcode,
          condition: data.condition,
          brand: data.brand || null,
          model: data.model || null,
          year: data.year || null,
          delivery_methods: data.deliveryMethods,
          is_available: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating listing:', error);
        toast.error('Failed to create listing. Please try again.');
        return;
      }

      toast.success('Listing created successfully!');
      router.push(`/listings/${listing.id}`);
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="py-8">
        <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">List Your Item</h1>
          <p className="text-gray-600">Share your items with the community and earn money</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-col items-center relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                  currentStep === step.id 
                    ? 'bg-green-500 text-white border-green-500' 
                    : completedSteps.has(step.id)
                    ? 'bg-green-100 text-green-600 border-green-500'
                    : 'bg-white text-gray-400 border-gray-300'
                }`}>
                  {completedSteps.has(step.id) ? <Check className="w-5 h-5" /> : step.id}
                </div>
                <div className="mt-2 text-center">
                  <p className={`text-sm font-medium ${
                    currentStep === step.id ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-400 hidden sm:block">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card className="p-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Basic Details */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <Package className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900">Tell us about your item</h2>
                  <p className="text-gray-600">Give your item a great title and description</p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Title *
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    placeholder="e.g. Professional DSLR Camera with Lens Kit"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    placeholder="Describe your item in detail. Include what's included, any special features, and what it's perfect for..."
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Category *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(categories).map(([key, category]) => (
                      <label key={key} className="relative">
                        <input
                          {...register('category')}
                          type="radio"
                          value={key}
                          className="sr-only"
                        />
                        <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors text-center ${
                          watchCategory === key 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}>
                          <div className="text-2xl mb-2">{category.icon}</div>
                          <div className="text-sm font-medium">{category.label}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {errors.category && (
                    <p className="mt-2 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.category.message}
                    </p>
                  )}
                </div>

                {/* Subcategory */}
                {watchCategory && categories[watchCategory as keyof typeof categories] && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subcategory (Optional)
                    </label>
                    <select
                      {...register('subcategory')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Select subcategory (optional)</option>
                      {categories[watchCategory as keyof typeof categories].subcategories.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                                 )}
               </div>
             )}

             {/* Step 2: Item Condition */}
             {currentStep === 2 && (
               <div className="space-y-6">
                 <div className="text-center mb-6">
                   <Info className="w-12 h-12 text-green-500 mx-auto mb-4" />
                   <h2 className="text-2xl font-bold text-gray-900">Item Condition & Details</h2>
                   <p className="text-gray-600">Help renters know what to expect</p>
                 </div>

                 {/* Condition */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-3">
                     Condition *
                   </label>
                   <div className="space-y-3">
                     {conditionOptions.map((option) => (
                       <label key={option.value} className="flex items-start space-x-3">
                         <input
                           {...register('condition')}
                           type="radio"
                           value={option.value}
                           className="mt-1 text-green-600 focus:ring-green-500"
                         />
                         <div>
                           <div className="font-medium text-gray-900">{option.label}</div>
                           <div className="text-sm text-gray-500">{option.description}</div>
                         </div>
                       </label>
                     ))}
                   </div>
                   {errors.condition && (
                     <p className="mt-2 text-sm text-red-600 flex items-center">
                       <AlertCircle className="w-4 h-4 mr-1" />
                       {errors.condition.message}
                     </p>
                   )}
                 </div>

                 {/* Brand & Model */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Brand (Optional)
                     </label>
                     <input
                       {...register('brand')}
                       type="text"
                       placeholder="e.g. Canon, Apple, Bosch"
                       className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Model (Optional)
                     </label>
                     <input
                       {...register('model')}
                       type="text"
                       placeholder="e.g. EOS R5, iPhone 14, DCS391"
                       className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                     />
                   </div>
                 </div>

                 {/* Year */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Year (Optional)
                   </label>
                   <input
                     {...register('year', { valueAsNumber: true })}
                     type="number"
                     min="1950"
                     max={new Date().getFullYear()}
                     placeholder="e.g. 2023"
                     className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                   />
                 </div>
               </div>
             )}

             {/* Step 3: Pricing */}
             {currentStep === 3 && (
               <div className="space-y-6">
                 <div className="text-center mb-6">
                   <DollarSign className="w-12 h-12 text-green-500 mx-auto mb-4" />
                   <h2 className="text-2xl font-bold text-gray-900">Set Your Rental Rates</h2>
                   <p className="text-gray-600">Choose competitive rates to attract renters</p>
                 </div>

                 {/* Daily Rate */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Daily Rate * (AUD)
                   </label>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                     <input
                       {...register('dailyRate', { valueAsNumber: true })}
                       type="number"
                       min="1"
                       max="1000"
                       step="0.01"
                       placeholder="25.00"
                       className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                         errors.dailyRate ? 'border-red-300' : 'border-gray-300'
                       }`}
                     />
                   </div>
                   {errors.dailyRate && (
                     <p className="mt-1 text-sm text-red-600 flex items-center">
                       <AlertCircle className="w-4 h-4 mr-1" />
                       {errors.dailyRate.message}
                     </p>
                   )}
                 </div>

                 {/* Optional Rates */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Weekly Rate (Optional)
                     </label>
                     <div className="relative">
                       <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                       <input
                         {...register('weeklyRate', { valueAsNumber: true })}
                         type="number"
                         min="1"
                         step="0.01"
                         placeholder="150.00"
                         className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                       />
                     </div>
                     <p className="mt-1 text-xs text-gray-500">Usually 20-30% off daily rate</p>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Monthly Rate (Optional)
                     </label>
                     <div className="relative">
                       <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                       <input
                         {...register('monthlyRate', { valueAsNumber: true })}
                         type="number"
                         min="1"
                         step="0.01"
                         placeholder="500.00"
                         className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                       />
                     </div>
                     <p className="mt-1 text-xs text-gray-500">Usually 40-50% off daily rate</p>
                   </div>
                 </div>

                 {/* Deposit */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     Security Deposit (AUD)
                   </label>
                   <div className="relative">
                     <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                     <input
                       {...register('depositAmount', { valueAsNumber: true })}
                       type="number"
                       min="0"
                       step="0.01"
                       placeholder="100.00"
                       className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                         errors.depositAmount ? 'border-red-300' : 'border-gray-300'
                       }`}
                     />
                   </div>
                   <p className="mt-1 text-xs text-gray-500">
                     Refundable deposit to protect against damage. Usually 20-50% of item value.
                   </p>
                   {errors.depositAmount && (
                     <p className="mt-1 text-sm text-red-600 flex items-center">
                       <AlertCircle className="w-4 h-4 mr-1" />
                       {errors.depositAmount.message}
                     </p>
                   )}
                 </div>
               </div>
             )}

             {/* Step 4: Location & Delivery */}
             {currentStep === 4 && (
               <div className="space-y-6">
                 <div className="text-center mb-6">
                   <MapPin className="w-12 h-12 text-green-500 mx-auto mb-4" />
                   <h2 className="text-2xl font-bold text-gray-900">Location & Delivery</h2>
                   <p className="text-gray-600">Where can renters find your item?</p>
                 </div>

                 {/* Location */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Suburb/City *
                     </label>
                     <input
                       {...register('location')}
                       type="text"
                       placeholder="e.g. Bondi Beach"
                       className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                         errors.location ? 'border-red-300' : 'border-gray-300'
                       }`}
                     />
                     {errors.location && (
                       <p className="mt-1 text-sm text-red-600 flex items-center">
                         <AlertCircle className="w-4 h-4 mr-1" />
                         {errors.location.message}
                       </p>
                     )}
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       Postcode *
                     </label>
                     <input
                       {...register('postcode')}
                       type="text"
                       maxLength={4}
                       placeholder="2026"
                       className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                         errors.postcode ? 'border-red-300' : 'border-gray-300'
                       }`}
                     />
                     {errors.postcode && (
                       <p className="mt-1 text-sm text-red-600 flex items-center">
                         <AlertCircle className="w-4 h-4 mr-1" />
                         {errors.postcode.message}
                       </p>
                     )}
                   </div>
                 </div>

                 {/* State */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                     State *
                   </label>
                   <select
                     {...register('state')}
                     className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                       errors.state ? 'border-red-300' : 'border-gray-300'
                     }`}
                   >
                     <option value="">Select your state</option>
                     {australianStates.map((state) => (
                       <option key={state.code} value={state.code}>
                         {state.name}
                       </option>
                     ))}
                   </select>
                   {errors.state && (
                     <p className="mt-1 text-sm text-red-600 flex items-center">
                       <AlertCircle className="w-4 h-4 mr-1" />
                       {errors.state.message}
                     </p>
                   )}
                 </div>

                 {/* Delivery Methods */}
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-3">
                     Delivery Options *
                   </label>
                   <div className="space-y-3">
                     {deliveryOptions.map((option) => (
                       <label key={option.value} className="flex items-start space-x-3">
                         <input
                           type="checkbox"
                           onChange={(e) => handleDeliveryMethodChange(option.value, e.target.checked)}
                           className="mt-1 text-green-600 focus:ring-green-500"
                         />
                         <div>
                           <div className="font-medium text-gray-900">{option.label}</div>
                           <div className="text-sm text-gray-500">{option.description}</div>
                         </div>
                       </label>
                     ))}
                   </div>
                   {errors.deliveryMethods && (
                     <p className="mt-2 text-sm text-red-600 flex items-center">
                       <AlertCircle className="w-4 h-4 mr-1" />
                       {errors.deliveryMethods.message}
                     </p>
                   )}
                 </div>
               </div>
             )}

             {/* Step 5: Photos */}
             {currentStep === 5 && (
               <div className="space-y-6">
                 <div className="text-center mb-6">
                   <Camera className="w-12 h-12 text-green-500 mx-auto mb-4" />
                   <h2 className="text-2xl font-bold text-gray-900">Add Photos</h2>
                   <p className="text-gray-600">Great photos help your item get rented faster</p>
                 </div>

                 {/* Photo Upload */}
                 <div>
                   <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
                     <input
                       type="file"
                       id="image-upload"
                       multiple
                       accept="image/*"
                       onChange={handleImageChange}
                       className="hidden"
                     />
                     <label htmlFor="image-upload" className="cursor-pointer">
                       <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                       <p className="text-lg font-medium text-gray-900 mb-2">
                         Click to upload photos
                       </p>
                       <p className="text-sm text-gray-500">
                         Upload up to 10 photos. JPEG, PNG, WebP up to 10MB each.
                       </p>
                     </label>
                   </div>
                   
                   <div className="mt-4 text-sm text-gray-600">
                     <p><strong>Tips for great photos:</strong></p>
                     <ul className="list-disc pl-5 mt-2 space-y-1">
                       <li>Take photos in good lighting</li>
                       <li>Show the item from multiple angles</li>
                       <li>Include any accessories or parts</li>
                       <li>Highlight any wear or damage honestly</li>
                     </ul>
                   </div>
                 </div>

                 {/* Image Preview */}
                 {imagePreview.length > 0 && (
                   <div>
                     <h3 className="text-lg font-medium text-gray-900 mb-4">
                       Photos ({imagePreview.length}/10)
                     </h3>
                     <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                       {imagePreview.map((preview, index) => (
                         <div key={index} className="relative group">
                           <div className="aspect-square relative overflow-hidden rounded-lg">
                             <Image
                               src={preview}
                               alt={`Preview ${index + 1}`}
                               fill
                               className="object-cover"
                             />
                           </div>
                           <button
                             type="button"
                             onClick={() => removeImage(index)}
                             className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                           >
                             <X className="w-4 h-4" />
                           </button>
                           {index === 0 && (
                             <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                               Main
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             )}

             {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <div>
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={previousStep}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
              </div>
              
              <div>
                {currentStep < 5 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading || images.length === 0}
                    className="min-w-32"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Listing'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
} 