'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  AlertCircle,
  HelpCircle,
  Map,
  Search,
  Navigation
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createClient } from '@/lib/supabase/client';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import Image from 'next/image';

// Declare Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

const categories = {
  'tools-diy-equipment': { 
    label: 'Tools & DIY Equipment'
  },
  'cameras-photography-gear': { 
    label: 'Cameras & Photography Gear'
  },
  'event-party-equipment': { 
    label: 'Event & Party Equipment'
  },
  'camping-outdoor-gear': { 
    label: 'Camping & Outdoor Gear'
  },
  'tech-electronics': { 
    label: 'Tech & Electronics'
  },
  'vehicles-transport': { 
    label: 'Vehicles & Transport'
  },
  'home-garden-appliances': { 
    label: 'Home & Garden Appliances'
  },
  'sports-fitness-equipment': { 
    label: 'Sports & Fitness Equipment'
  },
  'musical-instruments-gear': { 
    label: 'Musical Instruments & Gear'
  },
  'costumes-props': { 
    label: 'Costumes & Props'
  },
  'maker-craft-supplies': { 
    label: 'Maker & Craft Supplies'
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
    condition: z.string().min(1, 'Please select the item condition'),
    brand: z.string().min(1, 'Please enter the brand'),
    model: z.string().min(1, 'Please enter the model'),
    year: z.number().min(1950, 'Please enter a valid year').max(new Date().getFullYear(), 'Year cannot be in the future'),
  }),
  2: z.object({
    dailyRate: z.number().min(1, 'Daily rate must be at least $1').max(1000, 'Daily rate must be less than $1000'),
    hourlyRate: z.union([z.number(), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
    weeklyRate: z.union([z.number(), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
    monthlyRate: z.union([z.number(), z.nan()]).optional().transform(val => isNaN(val as number) ? undefined : val),
    depositAmount: z.number().min(0, 'Deposit amount must be at least $0'),
    availabilityType: z.enum(['always', 'partial'], { required_error: 'Please select availability type' }),
    availableFrom: z.string().optional(),
    availableTo: z.string().optional(),
    insuranceEnabled: z.boolean().optional(),
  }),
  3: z.object({
    unitNumber: z.string().optional(),
    streetNumber: z.string().min(1, 'Please enter the street number'),
    streetName: z.string().min(2, 'Please enter the street name'),
    suburb: z.string().min(2, 'Please enter your suburb/city'),
    state: z.string().min(1, 'Please select your state'),
    postcode: z.string().regex(/^[0-9]{4}$/, 'Please enter a valid Australian postcode'),
    deliveryMethods: z.array(z.string()).optional(),
  })
};

const fullSchema = z.object({
  ...stepSchemas[1].shape,
  ...stepSchemas[2].shape,
  ...stepSchemas[3].shape,
});

type ListingForm = z.infer<typeof fullSchema>;

const steps = [
  { id: 1, title: 'Basic Details', description: 'Tell us about your item, condition, and photos' },
  { id: 2, title: 'Pricing & Availability', description: 'Set your rental rates and availability' },
  { id: 3, title: 'Location & Delivery', description: 'Where and how will renters get the item' }
];

function CreateListingContent() {
  const [user, setUser] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [editingListing, setEditingListing] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedDeliveryMethods, setSelectedDeliveryMethods] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: -33.8688, lng: 151.2093 }); // Default to Sydney
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    clearErrors,
    formState: { errors },
  } = useForm<ListingForm>({
    resolver: zodResolver(fullSchema),
    mode: 'onChange',
    defaultValues: {
      deliveryMethods: [],
      depositAmount: 0,
      insuranceEnabled: false,
      brand: '',
      model: '',
      availabilityType: 'always',
      availableFrom: '',
      availableTo: '',
    }
  });

  const watchCategory = watch('category');
  const watchAvailabilityType = watch('availabilityType');

  // Helper function to get field names for each step
  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 1:
        return ['title', 'description', 'category', 'condition', 'brand', 'model', 'year'];
      case 2:
        return ['dailyRate', 'hourlyRate', 'weeklyRate', 'monthlyRate', 'depositAmount', 'availabilityType', 'availableFrom', 'availableTo', 'insuranceEnabled'];
      case 3:
        return ['unitNumber', 'streetNumber', 'streetName', 'suburb', 'state', 'postcode', 'deliveryMethods'];
      default:
        return [];
    }
  };

  // Helper function to get errors for current step only
  const getCurrentStepErrors = () => {
    const stepFields = getStepFields(currentStep);
    const stepErrors: any = {};
    stepFields.forEach(field => {
      if (errors[field as keyof typeof errors]) {
        stepErrors[field] = errors[field as keyof typeof errors];
      }
    });
    return stepErrors;
  };
  
  useEffect(() => {
    checkUser();
    checkEditMode();
  }, []);

  const checkEditMode = async () => {
    const editId = searchParams.get('edit');
    if (editId) {
      setIsEditMode(true);
      await loadExistingListing(editId);
    }
  };

  const loadExistingListing = async (listingId: string) => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId)
        .single();

      if (error || !data) {
        toast.error('Failed to load listing for editing');
        router.push('/listings');
        return;
      }

      setEditingListing(data);
      
      // Pre-populate form with existing data
      setValue('title', data.title);
      setValue('description', data.description);
      setValue('category', data.category);
      setValue('condition', data.condition);
      setValue('dailyRate', data.price_per_day);
      setValue('hourlyRate', data.price_hourly);
      setValue('weeklyRate', data.price_weekly);
      setValue('monthlyRate', data.monthly_rate);
      setValue('depositAmount', data.deposit);
      setValue('brand', data.brand || '');
      setValue('model', data.model || '');
      setValue('year', data.year || new Date().getFullYear());
      setValue('availableFrom', data.available_from ? data.available_from.split('T')[0] : '');
      setValue('availableTo', data.available_to ? data.available_to.split('T')[0] : '');
      setValue('insuranceEnabled', data.insurance_enabled || false);
      
      // Set availability type based on whether dates are set
      setValue('availabilityType', (data.available_from || data.available_to) ? 'partial' : 'always');
      
      // Parse address for location fields
      if (data.address) {
        const addressParts = data.address.split(',');
        const fullAddress = addressParts[0]?.trim() || '';
        
        // Try to parse the address components
        const addressRegex = /^(?:(\d+[A-Za-z]?|Unit\s+\w+)\s+)?(\d+)\s+(.+)$/;
        const match = fullAddress.match(addressRegex);
        
        if (match) {
          setValue('unitNumber', match[1] || '');
          setValue('streetNumber', match[2] || '');
          setValue('streetName', match[3] || '');
        } else {
          // Fallback: split by spaces and try to identify parts
          const parts = fullAddress.split(' ');
          if (parts.length >= 2) {
            setValue('streetNumber', parts[0] || '');
            setValue('streetName', parts.slice(1).join(' ') || '');
          }
        }
        
        setValue('suburb', data.city || '');
        setValue('state', data.state || '');
        setValue('postcode', data.postal_code || '');
      }

      // Set delivery methods from features if available (excluding pickup since it's always available)
      const deliveryMethods = [];
      if (data.features?.includes('delivery')) deliveryMethods.push('delivery');
      if (data.features?.includes('shipping')) deliveryMethods.push('shipping');
      setValue('deliveryMethods', deliveryMethods);
      setSelectedDeliveryMethods(deliveryMethods);

      // Load existing features (filter out delivery methods)
      if (data.features && data.features.length > 0) {
        const itemFeatures = data.features.filter((feature: string) => 
          !['pickup', 'delivery', 'shipping'].includes(feature)
        );
        setFeatures(itemFeatures);
      }

      // Load existing images as preview URLs
      if (data.images && data.images.length > 0) {
        setImagePreview(data.images);
      }
    } catch (error) {
      console.error('Error loading listing:', error);
      toast.error('Failed to load listing for editing');
      router.push('/listings');
    }
  };



  useEffect(() => {
    if (watchAvailabilityType === 'always') {
      setValue('availableFrom', ''); // Clear date fields when switching to always available
      setValue('availableTo', '');
    }
  }, [watchAvailabilityType, setValue]);

  // Clear ALL errors when step changes
  useEffect(() => {
    clearErrors();
  }, [currentStep, clearErrors]);

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

    try {
    const currentData = getValues();
    
    // Extract only the fields for the current step
    const stepFields = getStepFields(currentStep);
    const stepData: any = {};
    stepFields.forEach(field => {
      stepData[field] = currentData[field as keyof typeof currentData];
    });
    
    // For step 2, handle NaN values in optional rate fields
    if (currentStep === 2) {
      if (isNaN(stepData.hourlyRate as number)) stepData.hourlyRate = undefined;
      if (isNaN(stepData.weeklyRate as number)) stepData.weeklyRate = undefined;
      if (isNaN(stepData.monthlyRate as number)) stepData.monthlyRate = undefined;
    }
    
    const result = currentSchema.safeParse(stepData);
    
    // Additional validation for step 1: check minimum photos
    if (currentStep === 1 && imagePreview.length < 3) {
      toast.error('Please add at least 3 photos before continuing');
      return false;
    }
    
    if (result.success) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      return true;
    } else {
        console.log('Mobile validation error for step', currentStep, ':', result.error.issues);
      
      // Trigger validation for current step fields to show inline errors
        // Add delay for mobile devices to handle keyboard hiding
        setTimeout(async () => {
      await trigger(stepFields as any);
        }, 100);
        
        return false;
      }
    } catch (error) {
      console.error('Error during step validation:', error);
      toast.error('Validation error. Please check your inputs and try again.');
      return false;
    }
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 3) {
      // Clear ALL errors before moving to next step
      clearErrors();
      
      setCurrentStep(currentStep + 1);
      
      // Clear errors again after step change (in next tick)
      setTimeout(() => {
        clearErrors();
      }, 0);
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      // Clear ALL errors before moving to previous step
      clearErrors();
      
      setCurrentStep(currentStep - 1);
      
      // Clear errors again after step change (in next tick)
      setTimeout(() => {
        clearErrors();
      }, 0);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    // Validate file types first
    const validFiles = files.filter(file => {
      // Check original file size to prevent browser memory issues
      if (file.size > 50 * 1024 * 1024) { // 50MB original limit
        toast.error(`${file.name} is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please choose a smaller image.`);
        return false;
      }
      
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a supported format. Use JPEG, PNG, or WebP.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    // Show processing message for mobile users
    const processingToast = toast.loading(`Processing ${validFiles.length} image${validFiles.length > 1 ? 's' : ''}...`);

    try {
      // Compress and resize each image
      const compressedFiles = await Promise.all(
        validFiles.map(async (file) => {
          try {
            const compressedFile = await compressAndResizeImage(file);
            
            // Log compression results for debugging
            console.log(`Compressed ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
            
            // Final size check after compression
            if (compressedFile.size > 5 * 1024 * 1024) { // 5MB limit after compression
              toast.error(`${file.name} is still too large after compression. Try a different image.`);
              return null;
            }
            
            return compressedFile;
          } catch (error) {
            console.error(`Error compressing ${file.name}:`, error);
            toast.error(`Failed to process ${file.name}. Please try again.`);
            return null;
          }
        })
      );

      // Filter out failed compressions
      const successfullyCompressed = compressedFiles.filter(file => file !== null) as File[];
      
      if (successfullyCompressed.length === 0) {
        toast.dismiss(processingToast);
        toast.error('No images were successfully processed');
        return;
      }

      setImages([...images, ...successfullyCompressed]);

      // Create preview URLs with error handling for mobile
      successfullyCompressed.forEach((file, index) => {
        try {
      const reader = new FileReader();
      reader.onload = (e) => {
            if (e.target?.result) {
              const target = e.target;
              setImagePreview(prev => [...prev, target.result as string]);
            }
          };
          reader.onerror = () => {
            console.error(`Failed to read file: ${file.name}`);
            toast.error(`Failed to preview ${file.name}.`);
      };
      reader.readAsDataURL(file);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          toast.error(`Failed to process ${file.name}. Please try again.`);
        }
      });

      toast.dismiss(processingToast);
      toast.success(`${successfullyCompressed.length} image${successfullyCompressed.length > 1 ? 's' : ''} processed and optimized!`);
      
    } catch (error) {
      toast.dismiss(processingToast);
      console.error('Error processing images:', error);
      toast.error('Failed to process images. Please try again.');
    }

    // Clear the input so the same files can be selected again if needed
    e.target.value = '';
  };

  // Image compression and resizing function
  const compressAndResizeImage = (file: File): Promise<File> => {
    return new Promise<File>((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new (window.Image || Image)();
      
      img.onload = () => {
        // Set maximum dimensions (good for listing photos)
        const MAX_WIDTH = 1920;
        const MAX_HEIGHT = 1080;
        const QUALITY = 0.8; // 80% quality
        
        let { width, height } = img;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }
        }
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress image
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Create a new file with compressed data
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg', // Convert all to JPEG for better compression
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file); // Fallback to original if compression fails
            }
          },
          'image/jpeg',
          QUALITY
        );
      };
      
      img.onerror = () => {
        resolve(file); // Fallback to original if loading fails
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreview(imagePreview.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    try {
    const uploadPromises = images.map(async (image, index) => {
        try {
          // Final size check (should be unnecessary now due to compression, but good safeguard)
          if (image.size > 5 * 1024 * 1024) {
            throw new Error(`Image ${image.name} is too large (max 5MB after compression)`);
          }

          const fileName = `${Date.now()}-${index}-${image.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          // Use a longer timeout for mobile network issues since images are now optimized
          const uploadPromise = supabase.storage
        .from('listing-images')
        .upload(fileName, image);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Upload timeout - please check your connection')), 45000)
          );

          const { data, error } = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Failed to upload ${image.name}: ${error.message}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      return publicUrl;
        } catch (imageError) {
          console.error(`Error uploading image ${index}:`, imageError);
          throw imageError;
        }
    });

    return Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error in uploadImages:', error);
      throw new Error('Failed to upload images. Please check your connection and try again.');
    }
  };

  const handleDeliveryMethodChange = (method: string, checked: boolean) => {
    const currentMethods = getValues('deliveryMethods') || [];
    let newMethods;
    
    if (checked) {
      newMethods = [...currentMethods, method];
      setSelectedDeliveryMethods(prev => [...prev, method]);
    } else {
      newMethods = currentMethods.filter(m => m !== method);
      setSelectedDeliveryMethods(prev => prev.filter(m => m !== method));
    }
    
    setValue('deliveryMethods', newMethods);
    trigger('deliveryMethods');
  };

  const addFeature = () => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleFeatureKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFeature();
    }
  };

  // Location and geocoding functions
  const geocodeAddress = async (address: string) => {
    try {
      // Load Google Maps if not already loaded
      if (!window.google || !window.google.maps) {
        await loadGoogleMaps();
      }

      // Use frontend Google Places API for autocomplete
      if (window.google && window.google.maps) {
        console.log('🎯 Using frontend Google Places API for:', address);
        return await getPlaceSuggestions(address);
      } else {
        console.log('⚠️ Google Maps not available, skipping autocomplete');
        // Return empty suggestions if Google Maps isn't available
        return { success: true, suggestions: [] };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      // Return empty suggestions on error instead of throwing
      return { success: true, suggestions: [] };
    }
  };

  // Function to dynamically load Google Maps API
  const loadGoogleMaps = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      // Check if script is already loading
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
        return;
      }

      // Create and load script
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      console.log('🔑 Google Maps API Key available:', !!apiKey);
      
      if (!apiKey) {
        reject(new Error('Google Maps API key not found'));
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('✅ Google Maps API loaded successfully');
        resolve();
      };
      
      script.onerror = () => {
        console.error('❌ Failed to load Google Maps API');
        reject(new Error('Failed to load Google Maps'));
      };

      document.head.appendChild(script);
    });
  };

  // Frontend Google Places autocomplete function
  const getPlaceSuggestions = async (input: string): Promise<any> => {
    return new Promise((resolve) => {
      if (!window.google || !window.google.maps) {
        resolve({ success: false, error: 'Google Maps not loaded' });
        return;
      }

      const service = new window.google.maps.places.AutocompleteService();
      
      service.getPlacePredictions(
        {
          input: input,
          types: ['address'],
          componentRestrictions: { country: 'au' },
        },
        (predictions: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            // Get detailed info for each prediction
            const detailedSuggestions = predictions.slice(0, 5).map((prediction: any) => ({
              description: prediction.description,
              place_id: prediction.place_id,
              structured_formatting: prediction.structured_formatting,
              types: prediction.types,
            }));
            
            resolve({
              success: true,
              suggestions: detailedSuggestions,
            });
          } else {
            console.log('Places service status:', status);
            resolve({
              success: false,
              error: `Places service error: ${status}`,
            });
          }
        }
      );
    });
  };

  const handleAddressSearch = async (query: string) => {
    if (query.length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsLoadingLocation(true);
      console.log('🔍 Searching for address:', query);
      
      const response = await geocodeAddress(query);
      console.log('📝 Search response:', response);
      
      if (response.success && response.suggestions && response.suggestions.length > 0) {
        console.log('✅ Found suggestions:', response.suggestions.length);
        setAddressSuggestions(response.suggestions);
        setShowSuggestions(true);
      } else {
        console.log('ℹ️ No suggestions found');
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Address search error:', error);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const selectAddressSuggestion = async (suggestion: any) => {
    setSearchAddress(suggestion.description);
    setShowSuggestions(false);
    setIsLoadingLocation(true);
    
    try {
      // Get detailed place information using place ID
      if (window.google && window.google.maps && suggestion.place_id) {
        const service = new window.google.maps.places.PlacesService(
          document.createElement('div')
        );
        
        service.getDetails(
          {
            placeId: suggestion.place_id,
            fields: ['address_components', 'geometry', 'formatted_address'],
          },
          (place: any, status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
              // Set coordinates
              if (place.geometry && place.geometry.location) {
                const lat = typeof place.geometry.location.lat === 'function' 
                  ? place.geometry.location.lat() 
                  : place.geometry.location.lat;
                const lng = typeof place.geometry.location.lng === 'function' 
                  ? place.geometry.location.lng() 
                  : place.geometry.location.lng;
                
                setSelectedLocation({ lat, lng });
                setMapCenter({ lat, lng });
              }
              
              // Parse address components and fill form
              const components = place.address_components || [];
              fillAddressFields(components, place.formatted_address || suggestion.description);
              
              toast.success('Address selected and location set!');
              setIsLoadingLocation(false);
            } else {
              console.error('Failed to get place details:', status);
              toast.error('Failed to get address details');
              setIsLoadingLocation(false);
            }
          }
        );
      } else {
        // Fallback for suggestions that already have full data
        const coords = suggestion.geometry?.location;
        if (coords) {
          setSelectedLocation({ lat: coords.lat, lng: coords.lng });
          setMapCenter({ lat: coords.lat, lng: coords.lng });
          
          const components = suggestion.address_components || [];
          fillAddressFields(components, suggestion.formatted_address || suggestion.description);
          
          toast.success('Address selected and location set!');
        }
        setIsLoadingLocation(false);
      }
    } catch (error) {
      console.error('Error processing address selection:', error);
      toast.error('Failed to process address selection');
      setIsLoadingLocation(false);
    }
  };

  const fillAddressFields = (components: any[], fullAddress: string) => {
    // Parse Google Places address components
    let streetNumber = '';
    let streetName = '';
    let suburb = '';
    let state = '';
    let postcode = '';

    components.forEach((component: any) => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        streetNumber = component.long_name;
      } else if (types.includes('route')) {
        streetName = component.long_name;
      } else if (types.includes('locality') || types.includes('sublocality')) {
        suburb = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        // Convert state name to code
        const stateMapping: { [key: string]: string } = {
          'New South Wales': 'NSW',
          'Victoria': 'VIC',
          'Queensland': 'QLD',
          'Western Australia': 'WA',
          'South Australia': 'SA',
          'Tasmania': 'TAS',
          'Australian Capital Territory': 'ACT',
          'Northern Territory': 'NT'
        };
        state = stateMapping[component.long_name] || component.short_name;
      } else if (types.includes('postal_code')) {
        postcode = component.long_name;
      }
    });

    // Set form values
    if (streetNumber) setValue('streetNumber', streetNumber);
    if (streetName) setValue('streetName', streetName);
    if (suburb) setValue('suburb', suburb);
    if (state) setValue('state', state);
    if (postcode) setValue('postcode', postcode);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by this browser');
      return;
    }

    setIsLoadingLocation(true);
    toast.loading('Getting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedLocation({ lat: latitude, lng: longitude });
        setMapCenter({ lat: latitude, lng: longitude });
        setIsLoadingLocation(false);
        toast.dismiss();
        toast.success('Location found! You can adjust it on the map if needed.');
      },
      (error) => {
        setIsLoadingLocation(false);
        toast.dismiss();
        console.error('Geolocation error:', error);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location access denied. Please enter address manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('Unable to get location.');
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  };

  const handleMapClick = (event: any) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    setSelectedLocation({ lat, lng });
    
    // Reverse geocode to get address
    reverseGeocode(lat, lng);
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const response = await fetch('/api/geocoding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coordinates: { lat, lng } }),
      });

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      
      if (data.success && data.address) {
        setSearchAddress(data.address.formatted_address);
        fillAddressFields(data.address.address_components || [], data.address.formatted_address);
        toast.success('Address updated from map location!');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      toast.error('Could not get address for this location');
    }
  };



  // Handle whole number input (remove decimals)
  const handleWholeNumberInput = (e: React.FormEvent<HTMLInputElement>, fieldName: string) => {
    const input = e.currentTarget;
    const value = input.value;
    
    // Remove any decimal points and everything after them
    const wholeNumber = value.split('.')[0];
    
    if (value !== wholeNumber) {
      input.value = wholeNumber;
      setValue(fieldName as any, parseInt(wholeNumber) || 0);
    }
  };

  const onSubmit = async (data: ListingForm) => {
    // Check if we have at least 3 images (either new uploads or existing previews)
    if (imagePreview.length < 3) {
      toast.error('Please add at least 3 images');
      setCurrentStep(1); // Go back to first step where photos are now located
      return;
    }
    
    // Clean up optional number fields (convert NaN to undefined)
    const cleanedData = { ...data };
    if (isNaN(cleanedData.hourlyRate as number)) cleanedData.hourlyRate = undefined;
    if (isNaN(cleanedData.weeklyRate as number)) cleanedData.weeklyRate = undefined;
    if (isNaN(cleanedData.monthlyRate as number)) cleanedData.monthlyRate = undefined;

    // Validate the complete form data
    const fullValidation = fullSchema.safeParse(cleanedData);
    if (!fullValidation.success) {
      
      // Find the first error and redirect to the appropriate step
      const firstError = fullValidation.error.issues[0];
      const fieldName = firstError.path[0] as string;
      
      // Determine which step contains the error and redirect there
      if (['title', 'description', 'category', 'condition', 'brand', 'model', 'year'].includes(fieldName)) {
        setCurrentStep(1);
      } else if (['dailyRate', 'hourlyRate', 'weeklyRate', 'monthlyRate', 'depositAmount', 'availabilityType', 'availableFrom', 'availableTo', 'insuranceEnabled'].includes(fieldName)) {
        setCurrentStep(2);
      } else if (['unitNumber', 'streetNumber', 'streetName', 'suburb', 'state', 'postcode', 'deliveryMethods'].includes(fieldName)) {
        setCurrentStep(3);
      }
      
      // Trigger validation to show inline errors
      await trigger();
      
      toast.error('Please fix the form errors before submitting');
      return;
    }

    setIsLoading(true);
    try {
      // Upload new images if any
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages();
      }

      // For edit mode, combine new images with existing ones
      let finalImageUrls: string[] = imageUrls;
      if (isEditMode) {
        finalImageUrls = [...imagePreview.filter(url => typeof url === 'string'), ...imageUrls];
      }

      // Handle availability dates based on availability type
      const availableFromDate = cleanedData.availabilityType === 'partial' && cleanedData.availableFrom 
        ? new Date(cleanedData.availableFrom) 
        : null;
      const availableToDate = cleanedData.availabilityType === 'partial' && cleanedData.availableTo 
        ? new Date(cleanedData.availableTo) 
        : null;

      // Use selected coordinates or default to Sydney
      const finalLat = selectedLocation?.lat ?? -33.8688;
      const finalLng = selectedLocation?.lng ?? 151.2093;

      // Prepare features array including delivery methods and user-added features
      // Always include pickup, plus any additional delivery methods
      const finalFeatures = ['pickup', ...(cleanedData.deliveryMethods || []), ...features];

      if (isEditMode && editingListing) {
        // Prepare the listing data for API call
        const listingPayload = {
            title: cleanedData.title,
            description: cleanedData.description,
            category: cleanedData.category,
            price_per_day: cleanedData.dailyRate,
            price_hourly: cleanedData.hourlyRate || null,
            price_weekly: cleanedData.weeklyRate || null,
            deposit: cleanedData.depositAmount,
            condition: cleanedData.condition,
            brand: cleanedData.brand,
            model: cleanedData.model,
            year: cleanedData.year,
          images: finalImageUrls,
          address: {
            unitNumber: cleanedData.unitNumber || '',
            streetNumber: cleanedData.streetNumber,
            streetName: cleanedData.streetName,
            suburb: cleanedData.suburb,
            state: cleanedData.state,
            postcode: cleanedData.postcode
          },
          city: cleanedData.suburb,
          state: cleanedData.state,
          postal_code: cleanedData.postcode,
          coordinates: {
            latitude: finalLat,
            longitude: finalLng
          },
            features: finalFeatures,
            available_from: availableFromDate?.toISOString() || null,
            available_to: availableToDate?.toISOString() || null,
            pickup_available: true,
            delivery_available: cleanedData.deliveryMethods?.includes('delivery') || false,
            insurance_enabled: cleanedData.insuranceEnabled || false,
        };

        // Update existing listing via API
        try {
          const response = await fetch(`/api/listings/${editingListing.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(listingPayload),
          });

          const result = await response.json();

          if (!response.ok) {
            console.error('API error updating listing:', result);
            throw new Error(result.error || result.details || 'Failed to update listing');
        }

        toast.success('Listing updated successfully!');
        router.push(`/listings/${editingListing.id}`);
        } catch (apiError) {
          console.error('Error calling update API:', apiError);
          toast.error(`Failed to update listing: ${apiError instanceof Error ? apiError.message : 'Please try again.'}`);
          return;
        }
      } else {
        // Prepare the listing data for API call
        const listingPayload = {
            title: cleanedData.title,
            description: cleanedData.description,
            category: cleanedData.category,
            price_per_day: cleanedData.dailyRate,
            price_hourly: cleanedData.hourlyRate || null,
            price_weekly: cleanedData.weeklyRate || null,
            deposit: cleanedData.depositAmount,
            condition: cleanedData.condition,
            brand: cleanedData.brand,
            model: cleanedData.model,
            year: cleanedData.year,
          images: finalImageUrls,
          address: {
            unitNumber: cleanedData.unitNumber || '',
            streetNumber: cleanedData.streetNumber,
            streetName: cleanedData.streetName,
            suburb: cleanedData.suburb,
            state: cleanedData.state,
            postcode: cleanedData.postcode
          },
          city: cleanedData.suburb,
          state: cleanedData.state,
          postal_code: cleanedData.postcode,
          coordinates: {
            latitude: finalLat,
            longitude: finalLng
          },
            features: finalFeatures,
            available_from: availableFromDate?.toISOString() || null,
            available_to: availableToDate?.toISOString() || null,
            pickup_available: true,
            delivery_available: cleanedData.deliveryMethods?.includes('delivery') || false,
            insurance_enabled: cleanedData.insuranceEnabled || false,
        };

        // Create new listing via API (mobile-friendly)
        try {
          console.log('Creating listing via API with payload:', listingPayload);

          const response = await fetch('/api/listings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(listingPayload),
          });

          const result = await response.json();

          if (!response.ok) {
            console.error('API error creating listing:', result);
            throw new Error(result.error || result.details || 'Failed to create listing');
          }

          if (!result?.listing?.id) {
            console.error('No listing ID returned from API');
            throw new Error('Invalid response from server');
        }

        toast.success('Listing created successfully! Your listing is awaiting admin approval.');
          router.push(`/listings/${result.listing.id}`);
        } catch (apiError) {
          console.error('Error calling create API:', apiError);
          toast.error(`Failed to create listing: ${apiError instanceof Error ? apiError.message : 'Please check your connection and try again.'}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error creating/updating listing:', error);
      
      if (error instanceof Error) {
        toast.error(`Failed to save listing: ${error.message}`);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Map Component for Location Picking
  const LocationPickerMap = () => {
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);

    useEffect(() => {
      // Load Google Maps API
      if (typeof window !== 'undefined' && !(window as any).google) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initializeMap;
        document.head.appendChild(script);
      } else if ((window as any).google) {
        initializeMap();
      }
    }, []);

    const initializeMap = () => {
      const mapElement = document.getElementById('location-picker-map');
      if (!mapElement || !(window as any).google) return;

      const googleMap = new (window as any).google.maps.Map(mapElement, {
        center: mapCenter,
        zoom: 15,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      setMap(googleMap);

      // Add click listener
      googleMap.addListener('click', (event: any) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        
        // Update marker position
        if (marker) {
          marker.setPosition({ lat, lng });
        } else {
          const newMarker = new (window as any).google.maps.Marker({
            position: { lat, lng },
            map: googleMap,
            draggable: true,
            title: 'Item Location'
          });
          
          // Add drag listener
          newMarker.addListener('dragend', (event: any) => {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();
            setSelectedLocation({ lat: newLat, lng: newLng });
            reverseGeocode(newLat, newLng);
          });
          
          setMarker(newMarker);
        }
        
        setSelectedLocation({ lat, lng });
        reverseGeocode(lat, lng);
      });

      // Add existing location marker if available
      if (selectedLocation) {
        const existingMarker = new (window as any).google.maps.Marker({
          position: selectedLocation,
          map: googleMap,
          draggable: true,
          title: 'Item Location'
        });
        
        existingMarker.addListener('dragend', (event: any) => {
          const newLat = event.latLng.lat();
          const newLng = event.latLng.lng();
          setSelectedLocation({ lat: newLat, lng: newLng });
          reverseGeocode(newLat, newLng);
        });
        
        setMarker(existingMarker);
      }
    };

    useEffect(() => {
      if (map && selectedLocation) {
        map.setCenter(selectedLocation);
        
        if (marker) {
          marker.setPosition(selectedLocation);
        } else {
          const newMarker = new (window as any).google.maps.Marker({
            position: selectedLocation,
            map: map,
            draggable: true,
            title: 'Item Location'
          });
          
          newMarker.addListener('dragend', (event: any) => {
            const newLat = event.latLng.lat();
            const newLng = event.latLng.lng();
            setSelectedLocation({ lat: newLat, lng: newLng });
            reverseGeocode(newLat, newLng);
          });
          
          setMarker(newMarker);
        }
      }
    }, [selectedLocation, map]);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Pick Location on Map</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <Navigation className="w-4 h-4 mr-1" />
              {isLoadingLocation ? 'Getting...' : 'My Location'}
            </button>
            <button
              type="button"
              onClick={() => setShowMap(false)}
              className="flex items-center px-3 py-1 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 mr-1" />
              Close Map
            </button>
          </div>
        </div>
        
        <div className="relative">
          <div 
            id="location-picker-map" 
            className="w-full h-96 rounded-lg border border-gray-300"
          />
          
          {selectedLocation && (
            <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border">
              <p className="text-sm font-medium text-gray-900">Selected Location:</p>
              <p className="text-xs text-gray-600">
                {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
              </p>
              <p className="text-xs text-green-600 mt-1">
                ✓ Click or drag marker to adjust
              </p>
            </div>
          )}
        </div>
        
        <p className="text-sm text-gray-600">
          Click anywhere on the map to set the location, or drag the marker to adjust it.
        </p>
      </div>
    );
  };

  // Photo Requirements Modal Component
  const PhotoRequirementsModal = () => {
    if (!showPhotoModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Photo Requirements & Tips</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Photo Requirements */}
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-medium text-red-800 mb-3">Photo Requirements:</h4>
                <ul className="list-disc pl-5 space-y-1 text-red-700 text-sm">
                  <li>Upload 3-10 photos (JPEG, PNG, WebP up to 10MB each)</li>
                  <li>First photo will be your main listing photo</li>
                  <li>📱 Images are automatically optimized for mobile users</li>
                </ul>
              </div>

              {/* Automatic Optimization */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-medium text-blue-800 mb-3">✨ Automatic Optimization:</h4>
                <ul className="list-disc pl-5 space-y-1 text-blue-700 text-sm">
                  <li>Large images are automatically resized to 1920x1080</li>
                  <li>File sizes are compressed to reduce upload time</li>
                  <li>Perfect quality maintained for listing photos</li>
                </ul>
              </div>

              {/* Tips for great photos */}
              <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                <h4 className="font-medium text-green-800 mb-3">Tips for great photos:</h4>
                <ul className="list-disc pl-5 space-y-1 text-green-700 text-sm">
                  <li>Take photos in good lighting</li>
                  <li>Show the item from multiple angles</li>
                  <li>Include any accessories or parts</li>
                  <li>Highlight any wear or damage honestly</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPhotoModal(false)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isEditMode ? 'Edit Your Listing' : 'List Your Item'}
          </h1>
          <p className="text-gray-600">
            {isEditMode ? 'Update your listing details' : 'Share your items with the community and earn money'}
          </p>
          

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
                {/* Photos Section - Moved to Top */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Camera className="w-5 h-5 mr-2 text-green-500" />
                      Add Photos *
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(true)}
                      className="flex items-center px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      <HelpCircle className="w-4 h-4 mr-1" />
                      Photo Tips
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Add at least 3 photos to showcase your item</p>

                  {/* Photo Grid Upload */}
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                    {/* Render uploaded photos */}
                    {imagePreview.map((preview, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square relative overflow-hidden rounded-lg border-2 border-gray-200 bg-gray-50">
                          <Image
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            fill
                            className="object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {index === 0 && (
                            <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1 py-0.5 rounded">
                              Main
                </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add photo slots */}
                    {Array.from({ length: Math.max(0, 10 - imagePreview.length) }).map((_, index) => {
                      const isFirstEmpty = imagePreview.length === 0 && index === 0;
                      return (
                        <label
                          key={`empty-${index}`}
                          htmlFor="image-upload"
                          className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-gray-50"
                        >
                          {isFirstEmpty ? (
                            <Camera className="w-8 h-8 text-gray-400" />
                          ) : (
                            <div className="w-8 h-8 text-gray-400 flex items-center justify-center text-2xl font-light">
                              +
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    id="image-upload"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  


                  {imagePreview.length < 3 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm text-amber-800 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Please add at least 3 photos to continue ({imagePreview.length}/3)
                      </p>
                    </div>
                  )}
                </div>

                {/* Item Details Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Item Details</h3>

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                          {...register('category')}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      errors.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select a category</option>
                    {Object.entries(categories).map(([key, category]) => (
                      <option key={key} value={key}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.category.message}
                    </p>
                  )}
                </div>

                {/* Subcategory */}


                {/* Item Condition Section */}
                <div className="border-t pt-6 mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Info className="w-5 h-5 mr-2 text-green-500" />
                    Item Condition & Details
                  </h3>

                 {/* Condition */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                     Condition *
                   </label>
                    <select
                           {...register('condition')}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.condition ? 'border-red-300' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select condition</option>
                      {conditionOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} - {option.description}
                        </option>
                     ))}
                    </select>
                   {errors.condition && (
                     <p className="mt-2 text-sm text-red-600 flex items-center">
                       <AlertCircle className="w-4 h-4 mr-1" />
                       {errors.condition.message}
                     </p>
                   )}
                 </div>

                 {/* Brand & Model */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                        Brand *
                     </label>
                     <input
                       {...register('brand')}
                       type="text"
                       placeholder="e.g. Canon, Apple, Bosch"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          errors.brand ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.brand && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.brand.message}
                        </p>
                      )}
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                        Model *
                     </label>
                     <input
                       {...register('model')}
                       type="text"
                       placeholder="e.g. EOS R5, iPhone 14, DCS391"
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                          errors.model ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {errors.model && (
                        <p className="mt-1 text-sm text-red-600 flex items-center">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          {errors.model.message}
                        </p>
                      )}
                   </div>
                 </div>

                 {/* Year */}
                  <div className="mb-6">
                   <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year *
                   </label>
                   <input
                     {...register('year', { valueAsNumber: true })}
                     type="number"
                     min="1950"
                     max={new Date().getFullYear()}
                     placeholder="e.g. 2023"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.year ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.year && (
                      <p className="mt-1 text-sm text-red-600 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.year.message}
                      </p>
                    )}
                 </div>

                 {/* Features Section */}
                 <div className="border-t pt-6 mt-8">
                   <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                     <Check className="w-5 h-5 mr-2 text-green-500" />
                     Features
                   </h3>
                   <p className="text-sm text-gray-600 mb-4">
                     Add specific features that make your item special (optional)
                   </p>

                   {/* Add Feature Input */}
                   <div className="flex gap-2 mb-4">
                     <input
                       type="text"
                       value={newFeature}
                       onChange={(e) => setNewFeature(e.target.value)}
                       onKeyPress={handleFeatureKeyPress}
                       placeholder="e.g. Turbocharged engine, Premium audio, Digital display"
                       className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                     />
                     <Button
                       type="button"
                       onClick={addFeature}
                       disabled={!newFeature.trim() || features.includes(newFeature.trim())}
                       variant="outline"
                       className="px-4"
                     >
                       Add
                     </Button>
                   </div>

                   {/* Features List */}
                   {features.length > 0 && (
                     <div className="space-y-2">
                       <p className="text-sm font-medium text-gray-700">Added Features:</p>
                       <div className="flex flex-wrap gap-2">
                         {features.map((feature, index) => (
                           <div
                             key={index}
                             className="inline-flex items-center px-3 py-1 bg-green-50 border border-green-200 rounded-full text-sm text-green-800"
                           >
                             <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                             {feature}
                             <button
                               type="button"
                               onClick={() => removeFeature(index)}
                               className="ml-2 w-4 h-4 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full"
                             >
                               <X className="w-3 h-3" />
                             </button>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                   {features.length === 0 && (
                     <div className="text-sm text-gray-500 italic">
                       No features added yet. Features help renters understand what makes your item special.
                     </div>
                   )}

                   <div className="mt-4 text-sm text-gray-600">
                     <p><strong>Examples of good features:</strong></p>
                     <ul className="list-disc pl-5 mt-2 space-y-1">
                       <li>Technical specifications (e.g., "4K recording", "Bluetooth enabled")</li>
                       <li>Premium upgrades (e.g., "Premium leather seats", "Professional grade")</li>
                       <li>Special capabilities (e.g., "Waterproof", "Noise cancelling")</li>
                       <li>Included accessories (e.g., "Includes carrying case", "Extra batteries")</li>
                     </ul>
                   </div>
                 </div>
                </div>
                </div>

               </div>
             )}

             {/* Step 2: Pricing & Availability */}
             {currentStep === 2 && (
               <div className="space-y-6">
                 {/* Pricing Section */}
                 <div className="space-y-6">
                   <h3 className="text-lg font-semibold text-gray-900 mb-4">Rental Rates</h3>

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
                         step="1"
                         placeholder="25"
                         onInput={(e) => handleWholeNumberInput(e, 'dailyRate')}
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

                   {/* Hourly and Optional Rates */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Hourly Rate (Optional)
                       </label>
                       <div className="relative">
                         <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                                                <input
                         {...register('hourlyRate', { valueAsNumber: true })}
                         type="number"
                         min="1"
                         step="1"
                         placeholder="5"
                         onInput={(e) => handleWholeNumberInput(e, 'hourlyRate')}
                         className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                       />
                       </div>
                       <p className="mt-1 text-xs text-gray-500">For short-term rentals</p>
                     </div>
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
                           step="10"
                           placeholder="150"
                           onInput={(e) => handleWholeNumberInput(e, 'weeklyRate')}
                         className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                       />
                     </div>
                       <p className="mt-1 text-xs text-gray-500">Usually 20-30% discount from daily rate</p>
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
                           step="10"
                           placeholder="500"
                           onInput={(e) => handleWholeNumberInput(e, 'monthlyRate')}
                         className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                       />
                     </div>
                       <p className="mt-1 text-xs text-gray-500">Usually 40-50% discount from daily rate</p>
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
                         step="10"
                         placeholder="100"
                         onInput={(e) => handleWholeNumberInput(e, 'depositAmount')}
                       className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                         errors.depositAmount ? 'border-red-300' : 'border-gray-300'
                       }`}
                     />
                   </div>
                   <p className="mt-1 text-xs text-gray-500">
                       Refundable deposit to protect against damage. Usually $50-$500 based on item value.
                   </p>
                   {errors.depositAmount && (
                     <p className="mt-1 text-sm text-red-600 flex items-center">
                       <AlertCircle className="w-4 h-4 mr-1" />
                       {errors.depositAmount.message}
                     </p>
                   )}
                 </div>
               </div>

                                  {/* Availability Section */}
                 <div className="border-t pt-6 mt-8">
                   <h3 className="text-lg font-semibold text-gray-900 mb-4">Availability</h3>
                   
                   {/* Availability Type Selector */}
                   <div className="mb-6">
                     <label className="block text-sm font-medium text-gray-700 mb-3">
                       Availability Type *
                     </label>
                     <div className="space-y-2">
                       <label className="flex items-start space-x-3">
                         <input
                           {...register('availabilityType')}
                           type="radio"
                           value="always"
                           className="mt-1 text-green-600 focus:ring-green-500"
                         />
                         <div>
                           <div className="font-medium text-gray-900">Always Available</div>
                           <div className="text-sm text-gray-500">Item is available for rent at any time</div>
                         </div>
                       </label>
                       
                       <label className="flex items-start space-x-3">
                         <input
                           {...register('availabilityType')}
                           type="radio"
                           value="partial"
                           className="mt-1 text-green-600 focus:ring-green-500"
                         />
                         <div>
                           <div className="font-medium text-gray-900">Partial Available</div>
                           <div className="text-sm text-gray-500">Item is only available during specific date ranges</div>
                         </div>
                       </label>
                     </div>
                     {errors.availabilityType && (
                       <p className="mt-2 text-sm text-red-600 flex items-center">
                         <AlertCircle className="w-4 h-4 mr-1" />
                         {errors.availabilityType.message}
                       </p>
                     )}
                   </div>
                   
                   {/* Date Range Selection - Only show when partial availability is selected */}
                   {watchAvailabilityType === 'partial' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Available From (Optional)
                         </label>
                         <input
                           {...register('availableFrom')}
                           type="date"
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                         />
                         <p className="mt-1 text-xs text-gray-500">When is your item first available?</p>
                 </div>
                       <div>
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Available Until (Optional)
                         </label>
                         <input
                           {...register('availableTo')}
                           type="date"
                           className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                         />
                         <p className="mt-1 text-xs text-gray-500">When will you stop renting this item?</p>
                       </div>
                     </div>
                   )}

                   {/* Insurance Option */}
                   <div>
                     <label className="flex items-center space-x-3">
                       <input
                         {...register('insuranceEnabled')}
                         type="checkbox"
                         className="text-green-600 focus:ring-green-500"
                       />
                       <div>
                         <div className="font-medium text-gray-900">Enable Insurance Option</div>
                         <div className="text-sm text-gray-500">Allow renters to purchase insurance to cover potential damage</div>
                       </div>
                     </label>
                   </div>
                 </div>
               </div>
             )}

             {/* Step 3: Location & Delivery */}
             {currentStep === 3 && (
               <div className="space-y-6">
                 {/* Enhanced Address Search */}
                 <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                   <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                     <MapPin className="w-5 h-5 mr-2 text-green-500" />
                     Find Your Address
                   </h3>
                   <p className="text-sm text-gray-600 mb-4">
                     Search for your address to auto-fill location details, or pick it on the map.
                   </p>
                   
                   {/* Address Search Input */}
                   <div className="relative mb-4">
                     <div className="relative">
                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                       <input
                         type="text"
                         value={searchAddress}
                         onChange={(e) => {
                           setSearchAddress(e.target.value);
                           handleAddressSearch(e.target.value);
                         }}
                         placeholder="Start typing your address... e.g. 123 Collins Street, Melbourne"
                         className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                       />
                       {isLoadingLocation && (
                         <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                           <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                         </div>
                       )}
                     </div>
                     
                     {/* Address Suggestions */}
                     {showSuggestions && addressSuggestions.length > 0 && (
                       <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                         {addressSuggestions.map((suggestion, index) => (
                           <button
                             key={index}
                             type="button"
                             onClick={() => selectAddressSuggestion(suggestion)}
                             className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                           >
                             <div className="font-medium text-gray-900">{suggestion.formatted_address}</div>
                             {suggestion.description && (
                               <div className="text-sm text-gray-600">{suggestion.description}</div>
                             )}
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                   
                   {/* Location Action Buttons */}
                   <div className="flex flex-wrap gap-3">
                     <button
                       type="button"
                       onClick={() => setShowMap(!showMap)}
                       className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                     >
                       <Map className="w-4 h-4 mr-2" />
                       {showMap ? 'Hide Map' : 'Show Map'}
                     </button>
                     
                     <button
                       type="button"
                       onClick={getCurrentLocation}
                       disabled={isLoadingLocation}
                       className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                     >
                       <Navigation className="w-4 h-4 mr-2" />
                       {isLoadingLocation ? 'Getting Location...' : 'Use My Location'}
                     </button>
                     
                     {selectedLocation && (
                       <div className="flex items-center px-3 py-2 bg-green-100 text-green-800 rounded-lg">
                         <Check className="w-4 h-4 mr-2" />
                         Location Set
                       </div>
                     )}
                   </div>
                 </div>
                 
                 {/* Map Component */}
                 {showMap && (
                   <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                     <LocationPickerMap />
                   </div>
                 )}

                 {/* Item Location for Pickup */}
                 <div>
                   <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Details</h3>
                   <p className="text-sm text-gray-600 mb-4">
                     {selectedLocation 
                       ? "Confirm your address details below (auto-filled from your selection):" 
                       : "Enter your address manually if you prefer:"}
                   </p>
                   
                   {/* Unit Number and Street Number */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                     <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                         Unit Number (Optional)
                     </label>
                     <input
                         {...register('unitNumber')}
                       type="text"
                         placeholder="e.g. 5A, Unit 12"
                         className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                       />
                       <p className="mt-1 text-xs text-gray-500">Apartment, unit, suite, etc.</p>
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Street Number *
                       </label>
                       <input
                         {...register('streetNumber')}
                         type="text"
                         placeholder="e.g. 123"
                       className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                           errors.streetNumber ? 'border-red-300' : 'border-gray-300'
                       }`}
                     />
                       {errors.streetNumber && (
                       <p className="mt-1 text-sm text-red-600 flex items-center">
                         <AlertCircle className="w-4 h-4 mr-1" />
                           {errors.streetNumber.message}
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

                   {/* Street Name and Suburb */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Street Name *
                       </label>
                       <input
                         {...register('streetName')}
                         type="text"
                         placeholder="e.g. Campbell Parade"
                         className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                           errors.streetName ? 'border-red-300' : 'border-gray-300'
                         }`}
                       />
                       {errors.streetName && (
                         <p className="mt-1 text-sm text-red-600 flex items-center">
                           <AlertCircle className="w-4 h-4 mr-1" />
                           {errors.streetName.message}
                         </p>
                       )}
                     </div>
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Suburb/City *
                       </label>
                       <input
                         {...register('suburb')}
                         type="text"
                         placeholder="e.g. Bondi Beach"
                         className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                           errors.suburb ? 'border-red-300' : 'border-gray-300'
                         }`}
                       />
                       {errors.suburb && (
                         <p className="mt-1 text-sm text-red-600 flex items-center">
                           <AlertCircle className="w-4 h-4 mr-1" />
                           {errors.suburb.message}
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
                 </div>

                 {/* Additional Delivery Options */}
                 <div className="border-t pt-6">
                   <h3 className="text-lg font-semibold text-gray-900 mb-2">Additional Delivery Options</h3>
                   <p className="text-sm text-gray-600 mb-4">Select any additional delivery services you can provide (optional):</p>
                   
                   <div className="space-y-3">
                     <label className="flex items-start space-x-3">
                         <input
                           type="checkbox"
                         value="delivery"
                         checked={selectedDeliveryMethods.includes('delivery')}
                         onChange={(e) => handleDeliveryMethodChange('delivery', e.target.checked)}
                           className="mt-1 text-green-600 focus:ring-green-500"
                         />
                         <div>
                         <div className="font-medium text-gray-900">Delivery Available</div>
                         <div className="text-sm text-gray-500">You can deliver within your area</div>
                         </div>
                       </label>
                     
                     <label className="flex items-start space-x-3">
                     <input
                         type="checkbox"
                         value="shipping"
                         checked={selectedDeliveryMethods.includes('shipping')}
                         onChange={(e) => handleDeliveryMethodChange('shipping', e.target.checked)}
                         className="mt-1 text-green-600 focus:ring-green-500"
                       />
                       <div>
                         <div className="font-medium text-gray-900">Shipping</div>
                         <div className="text-sm text-gray-500">Can be shipped Australia-wide</div>
                       </div>
                     </label>
                   </div>
                   
                   <p className="mt-3 text-xs text-gray-500">
                     Note: Pickup is always available. These are additional services you can offer.
                   </p>
                   </div>
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
                {currentStep < 3 ? (
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
                    disabled={isLoading || imagePreview.length < 3}
                    className="min-w-32"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        {isEditMode ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      isEditMode ? 'Update Listing' : 'Create Listing'
                    )}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>
        </div>
      </div>
      
      {/* Photo Requirements Modal */}
      <PhotoRequirementsModal />
    </AuthenticatedLayout>
  );
}

export default function CreateListingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <CreateListingContent />
    </Suspense>
  );
} 