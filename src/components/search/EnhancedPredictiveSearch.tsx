'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, TrendingUp, Tag, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Local types for predictive search
type SearchSuggestionType = 'category' | 'item' | 'brand' | 'query' | 'location';

interface SearchSuggestion {
  text: string;
  type: SearchSuggestionType;
  category?: string;
  count?: number;
  icon?: string;
  score?: number;
}

// Mock data for suggestions
const MOCK_SUGGESTIONS: SearchSuggestion[] = [
  { text: 'Camera', type: 'category', count: 45, icon: '📷' },
  { text: 'Cameras & Photography Gear', type: 'category', count: 45, icon: '📷' },
  { text: 'Drill', type: 'item', count: 23, icon: '🔧' },
  { text: 'Power Drill', type: 'item', count: 23, icon: '🔧' },
  { text: 'Laptop', type: 'category', count: 67, icon: '💻' },
  { text: 'Gaming Laptop', type: 'item', count: 67, icon: '💻' },
  { text: 'Canon', type: 'brand', count: 12, icon: '📸' },
  { text: 'Canon Camera', type: 'item', count: 12, icon: '📸' },
  { text: 'Power Tools', type: 'category', count: 34, icon: '⚡' },
  { text: 'Tools & DIY Equipment', type: 'category', count: 34, icon: '⚡' },
  { text: 'Electronics', type: 'category', count: 89, icon: '🔌' },
  { text: 'Electronics & Gadgets', type: 'category', count: 89, icon: '🔌' },
  { text: 'Professional Camera Equipment', type: 'category', count: 25, icon: '📸' },
  { text: 'Cordless Drill', type: 'item', count: 15, icon: '🔧' },
];

interface EnhancedPredictiveSearchProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  showPopularOnFocus?: boolean;
  enableHistory?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EnhancedPredictiveSearch({
  placeholder = 'Search for items, categories or locations...',
  onSearch,
  onSuggestionSelect,
  showPopularOnFocus = true,
  enableHistory = true,
  size = 'md',
  className
}: EnhancedPredictiveSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // State
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  // Local search history management
  const saveSearch = useCallback((searchQuery: string) => {
    if (typeof window !== 'undefined' && searchQuery.trim()) {
      const history = JSON.parse(localStorage.getItem('search_history') || '[]');
      const newHistory = [searchQuery, ...history.filter((h: string) => h !== searchQuery)].slice(0, 10);
      localStorage.setItem('search_history', JSON.stringify(newHistory));
    }
  }, []);

  const getRecentSearches = useCallback((): string[] => {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('search_history') || '[]');
    }
    return [];
  }, []);

  // Simple local suggestion generation
  const getLocalSuggestions = useCallback((searchQuery: string): SearchSuggestion[] => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (!normalizedQuery) {
      if (showPopularOnFocus) {
        return MOCK_SUGGESTIONS.slice(0, 6);
      }
      return [];
    }
    
    // Filter mock suggestions based on query
    const filtered = MOCK_SUGGESTIONS.filter(suggestion =>
      suggestion.text.toLowerCase().includes(normalizedQuery)
    );

    // Add recent searches that match
    const recentSearches = enableHistory ? getRecentSearches()
      .filter(search => search.toLowerCase().includes(normalizedQuery))
      .map(search => ({
        text: search,
        type: 'query' as SearchSuggestionType,
        icon: '🕒'
      })) : [];

    // Combine and limit results
    return [...recentSearches, ...filtered].slice(0, 8);
  }, [showPopularOnFocus, enableHistory, getRecentSearches]);

  // Debounced suggestion fetching
  const fetchSuggestions = useCallback(
    async (searchQuery: string) => {
      setIsLoading(true);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        const localSuggestions = getLocalSuggestions(searchQuery);
        setSuggestions(localSuggestions);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [getLocalSuggestions]
  );

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isOpen) {
        fetchSuggestions(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen, fetchSuggestions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    
    if (value.length >= 2 || (value.length === 0 && showPopularOnFocus)) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (query.length >= 2 || showPopularOnFocus) {
      setIsOpen(true);
      fetchSuggestions(query);
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    // Delay to allow for suggestion clicks
    setTimeout(() => setIsOpen(false), 150);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setIsOpen(false);
    saveSearch(suggestion.text);
    
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
    } else if (onSearch) {
      onSearch(suggestion.text);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsOpen(false);
      saveSearch(query.trim());
      
      if (onSearch) {
        onSearch(query.trim());
      } else {
        router.push(`/browse?search=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else if (query.trim()) {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for suggestion type
  const getSuggestionIcon = (suggestion: SearchSuggestion) => {
    if (suggestion.icon) return suggestion.icon;
    
    switch (suggestion.type) {
      case 'category': return <Tag className="w-4 h-4" />;
      case 'item': return <Search className="w-4 h-4" />;
      case 'brand': return <TrendingUp className="w-4 h-4" />;
      case 'location': return <MapPin className="w-4 h-4" />;
      case 'query': return <Clock className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg'
  };

  return (
    <div className={cn('relative w-full', className)}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              'w-full pl-9 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all',
              sizeClasses[size]
            )}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {isLoading && suggestions.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
              <p className="mt-2 text-sm">Finding suggestions...</p>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              {!query && showPopularOnFocus && (
                <div className="px-3 py-2 text-xs text-gray-500 font-medium border-b border-gray-100">
                  Popular searches
                </div>
              )}
              {query && enableHistory && suggestions.some(s => s.type === 'query') && (
                <div className="px-3 py-2 text-xs text-gray-500 font-medium border-b border-gray-100">
                  Recent searches
                </div>
              )}
              
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.text}-${index}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={cn(
                    'px-3 py-2 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0',
                    selectedIndex === index
                      ? 'bg-green-50 text-green-900'
                      : 'hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 text-gray-400">
                      {getSuggestionIcon(suggestion)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {suggestion.text}
                      </div>
                      {suggestion.count && (
                        <div className="text-xs text-gray-500">
                          {suggestion.count} items
                        </div>
                      )}
                    </div>
                    {suggestion.type === 'query' && (
                      <div className="text-xs text-gray-400">Recent</div>
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No suggestions found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}