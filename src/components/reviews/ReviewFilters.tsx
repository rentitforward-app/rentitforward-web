'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ReviewType,
  type ReviewFilter,
  ReviewFilterSchema
} from '@/shared';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ReviewFiltersProps {
  initialFilters?: Partial<ReviewFilter>;
  onFiltersChange: (filters: Partial<ReviewFilter>) => void;
  showUserFilters?: boolean;
  showListingFilters?: boolean;
  className?: string;
}

const filterFormSchema = z.object({
  searchText: z.string().optional(),
  type: z.nativeEnum(ReviewType).optional(),
  minRating: z.number().min(1).max(5).optional(),
  maxRating: z.number().min(1).max(5).optional(),
  hasComment: z.boolean().optional(),
  isPublic: z.boolean().optional(),
  sortBy: z.enum(['newest', 'oldest', 'rating_high', 'rating_low']).default('newest'),
});

type FilterFormData = z.infer<typeof filterFormSchema>;

export function ReviewFilters({
  initialFilters = {},
  onFiltersChange,
  showUserFilters = false,
  showListingFilters = false,
  className = '',
}: ReviewFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Partial<ReviewFilter>>(initialFilters);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FilterFormData>({
    resolver: zodResolver(filterFormSchema),
    defaultValues: {
      searchText: initialFilters.searchText || '',
      type: initialFilters.type,
      minRating: initialFilters.minRating,
      maxRating: initialFilters.maxRating,
      hasComment: initialFilters.hasComment,
      isPublic: initialFilters.isPublic,
      sortBy: initialFilters.sortBy || 'newest',
    },
  });

  const watchedValues = watch();

  const applyFilters = useCallback((data: FilterFormData) => {
    const filters: Partial<ReviewFilter> = {
      ...activeFilters,
      searchText: data.searchText || undefined,
      type: data.type,
      minRating: data.minRating,
      maxRating: data.maxRating,
      hasComment: data.hasComment,
      isPublic: data.isPublic,
      sortBy: data.sortBy,
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      const filterKey = key as keyof ReviewFilter;
      if (filters[filterKey] === undefined || filters[filterKey] === '') {
        delete filters[filterKey];
      }
    });

    setActiveFilters(filters);
    onFiltersChange(filters);
  }, [activeFilters, onFiltersChange]);

  const clearFilters = () => {
    const defaultFilters: Partial<ReviewFilter> = {
      sortBy: 'newest',
    };
    reset({
      searchText: '',
      type: undefined,
      minRating: undefined,
      maxRating: undefined,
      hasComment: undefined,
      isPublic: undefined,
      sortBy: 'newest',
    });
    setActiveFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (activeFilters.searchText) count++;
    if (activeFilters.type) count++;
    if (activeFilters.minRating || activeFilters.maxRating) count++;
    if (activeFilters.hasComment !== undefined) count++;
    if (activeFilters.isPublic !== undefined) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Quick Actions Row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Input */}
          <div className="flex-1 min-w-64">
            <div className="relative">
              <input
                {...register('searchText')}
                type="text"
                placeholder="Search reviews by keywords..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit(applyFilters)();
                  }
                }}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              {...register('sortBy')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => {
                setValue('sortBy', e.target.value as any);
                handleSubmit(applyFilters)();
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="rating_high">Highest Rated</option>
              <option value="rating_low">Lowest Rated</option>
            </select>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <span className="text-sm text-blue-600 font-medium">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              <svg className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Expanded Filters */}
        {isExpanded && (
          <form onSubmit={handleSubmit(applyFilters)} className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Review Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Type
                </label>
                <select
                  {...register('type')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  <option value={ReviewType.RENTER_TO_OWNER}>Renter to Owner</option>
                  <option value={ReviewType.OWNER_TO_RENTER}>Owner to Renter</option>
                </select>
              </div>

              {/* Rating Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating Range
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    {...register('minRating', { valueAsNumber: true })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Min</option>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <option key={rating} value={rating}>{rating}★</option>
                    ))}
                  </select>
                  <span className="text-gray-500">to</span>
                  <select
                    {...register('maxRating', { valueAsNumber: true })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Max</option>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <option key={rating} value={rating}>{rating}★</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Review Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review Content
                </label>
                <select
                  {...register('hasComment', {
                    setValueAs: (value) => value === '' ? undefined : value === 'true'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Reviews</option>
                  <option value="true">With Comments</option>
                  <option value="false">Rating Only</option>
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibility
                </label>
                <select
                  {...register('isPublic', {
                    setValueAs: (value) => value === '' ? undefined : value === 'true'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Reviews</option>
                  <option value="true">Public</option>
                  <option value="false">Private</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={clearFilters}
                className="text-gray-600"
              >
                Clear All Filters
              </Button>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsExpanded(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Quick Search Button (when collapsed) */}
        {!isExpanded && watchedValues.searchText && (
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit(applyFilters)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Search
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
} 