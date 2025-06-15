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
  Camera
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';

const categories = {
  'tools-diy': { label: 'Tools & DIY', subcategories: ['Power Tools', 'Hand Tools', 'Measuring Tools', 'Safety Equipment', 'Ladders & Scaffolding'] },
  'electronics': { label: 'Electronics', subcategories: ['Computers', 'Audio', 'Gaming', 'Smart Home', 'Tablets'] },
  'cameras': { label: 'Cameras', subcategories: ['DSLR', 'Mirrorless', 'Action Cameras', 'Lenses', 'Accessories'] },
  'sports-outdoors': { label: 'Sports & Outdoors', subcategories: ['Camping', 'Cycling', 'Water Sports', 'Winter Sports', 'Fitness'] },
  'event-party': { label: 'Event & Party', subcategories: ['Sound Systems', 'Lighting', 'Decorations', 'Furniture', 'Catering Equipment'] },
  'instruments': { label: 'Instruments', subcategories: ['Guitars', 'Keyboards', 'Drums', 'Wind Instruments', 'Recording Equipment'] },
  'automotive': { label: 'Automotive', subcategories: ['Car Care', 'Tools', 'Accessories', 'Bike Racks', 'Trailers'] },
  'home-garden': { label: 'Home & Garden', subcategories: ['Gardening Tools', 'Lawn Care', 'Cleaning Equipment', 'Furniture', 'Appliances'] },
  'appliances': { label: 'Appliances', subcategories: ['Kitchen', 'Laundry', 'Heating & Cooling', 'Small Appliances', 'Cleaning'] },
  'other': { label: 'Other', subcategories: ['Books', 'Games', 'Baby Items', 'Pet Supplies', 'Miscellaneous'] }
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

const listingSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters').max(2000, 'Description must be less than 2000 characters'),
  category: z.string().min(1, 'Please select a category'),
  subcategory: z.string().optional(),
  dailyRate: z.number().min(1, 'Daily rate must be at least $1').max(1000, 'Daily rate must be less than $1000'),
  weeklyRate: z.number().optional(),
  monthlyRate: z.number().optional(),
  depositAmount: z.number().min(0, 'Deposit amount must be at least $0'),
  location: z.string().min(2, 'Please enter your suburb/city'),
  state: z.string().min(1, 'Please select your state'),
  postcode: z.string().regex(/^[0-9]{4}$/, 'Please enter a valid Australian postcode'),
  condition: z.string().min(1, 'Please select the item condition'),
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  deliveryMethods: z.array(z.string()).min(1, 'Please select at least one delivery method'),
});

type ListingForm = z.infer<typeof listingSchema>;

export default function CreateListingPage() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ListingForm>({
    resolver: zodResolver(listingSchema),
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
      setSelectedCategory(watchCategory);
      setValue('subcategory', ''); // Reset subcategory when category changes
    }
  }, [watchCategory, setValue]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
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

  const onSubmit = async (data: ListingForm) => {
    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setIsLoading(true);
    try {
      // Upload images
      const imageUrls = await uploadImages();

      // Create listing
      const { error } = await supabase
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
          features: [],
          rules: [],
          tags: [],
          is_available: true,
        });

      if (error) {
        toast.error('Failed to create listing. Please try again.');
        console.error('Error creating listing:', error);
        return;
      }

      toast.success('Listing created successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating listing:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliveryMethodChange = (method: string, checked: boolean) => {
    const currentMethods = watch('deliveryMethods') || [];
    if (checked) {
      setValue('deliveryMethods', [...currentMethods, method]);
    } else {
      setValue('deliveryMethods', currentMethods.filter(m => m !== method));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">List Your Item</h1>
            <p className="text-gray-600 mt-2">
              Share your items with the community and start earning money!
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Info className="h-5 w-5 mr-2" />
                Basic Information
              </h2>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  {...register('title')}
                  type="text"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] ${
                    errors.title ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Professional DSLR Camera Canon EOS 5D"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] ${
                    errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Describe your item in detail. Include its condition, what's included, and any special features..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Category and Subcategory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    {...register('category')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] ${
                      errors.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Category</option>
                    {Object.entries(categories).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategory
                  </label>
                  <select
                    {...register('subcategory')}
                    disabled={!selectedCategory}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] disabled:bg-gray-100"
                  >
                    <option value="">Select Subcategory</option>
                    {selectedCategory && categories[selectedCategory as keyof typeof categories]?.subcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Photos
              </h2>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="images" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Click to upload images
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        Maximum 10 images, up to 10MB each
                      </span>
                    </label>
                    <input
                      id="images"
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Image Preview */}
              {imagePreview.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {imagePreview.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pricing */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Pricing
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Rate (AUD) *
                  </label>
                  <input
                    {...register('dailyRate', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] ${
                      errors.dailyRate ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.dailyRate && (
                    <p className="mt-1 text-sm text-red-600">{errors.dailyRate.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weekly Rate (AUD)
                  </label>
                  <input
                    {...register('weeklyRate', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C]"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rate (AUD)
                  </label>
                  <input
                    {...register('monthlyRate', { valueAsNumber: true })}
                    type="number"
                    min="1"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Deposit (AUD) *
                </label>
                <input
                  {...register('depositAmount', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  step="0.01"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] ${
                    errors.depositAmount ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                />
                {errors.depositAmount && (
                  <p className="mt-1 text-sm text-red-600">{errors.depositAmount.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Security deposit to protect against damage or loss
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Location
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suburb/City *
                  </label>
                  <input
                    {...register('location')}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] ${
                      errors.location ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Sydney"
                  />
                  {errors.location && (
                    <p className="mt-1 text-sm text-red-600">{errors.location.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <select
                    {...register('state')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] ${
                      errors.state ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select State</option>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Postcode *
                  </label>
                  <input
                    {...register('postcode')}
                    type="text"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] ${
                      errors.postcode ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="2000"
                  />
                  {errors.postcode && (
                    <p className="mt-1 text-sm text-red-600">{errors.postcode.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Item Details */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Item Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Condition *
                  </label>
                  <select
                    {...register('condition')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C] ${
                      errors.condition ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Condition</option>
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                  {errors.condition && (
                    <p className="mt-1 text-sm text-red-600">{errors.condition.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand
                  </label>
                  <input
                    {...register('brand')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C]"
                    placeholder="e.g., Canon"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <input
                    {...register('model')}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C]"
                    placeholder="e.g., EOS 5D Mark IV"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year
                  </label>
                  <input
                    {...register('year', { valueAsNumber: true })}
                    type="number"
                    min="1900"
                    max={new Date().getFullYear()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#44D62C]"
                    placeholder="2023"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Options */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Delivery Options *
              </h2>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    onChange={(e) => handleDeliveryMethodChange('pickup', e.target.checked)}
                    className="h-4 w-4 text-[#44D62C] focus:ring-[#44D62C] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Pickup only</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    onChange={(e) => handleDeliveryMethodChange('delivery', e.target.checked)}
                    className="h-4 w-4 text-[#44D62C] focus:ring-[#44D62C] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">I can deliver</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    onChange={(e) => handleDeliveryMethodChange('both', e.target.checked)}
                    className="h-4 w-4 text-[#44D62C] focus:ring-[#44D62C] border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Both pickup and delivery</span>
                </label>
              </div>
              {errors.deliveryMethods && (
                <p className="mt-1 text-sm text-red-600">{errors.deliveryMethods.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-[#44D62C] text-white rounded-md hover:bg-[#3AB827] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Listing...' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 