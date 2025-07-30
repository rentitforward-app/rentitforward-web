'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useRealSearchSuggestions } from '@/hooks/useRealSearchSuggestions';

interface SearchSuggestion {
  text: string;
  type: 'category' | 'item' | 'popular' | 'recent';
  count?: number;
  icon?: string;
}

interface RealAPIPredictiveSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  useRealAPI?: boolean; // Toggle between real API and mock data
  variant?: 'default' | 'homepage'; // New prop for different styling variants
}

export function RealAPIPredictiveSearch({
  onSearch,
  placeholder = "Search for items...",
  className = "",
  useRealAPI = false,
  variant = 'default'
}: RealAPIPredictiveSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use real API only when user is typing (not on empty focus)
  const { suggestions: realSuggestions, loading } = useRealSearchSuggestions(
    useRealAPI && query.length > 0 ? query : ''
  );

  // Popular searches shown when search bar is focused but empty
  const popularSearches: SearchSuggestion[] = [
    { text: 'Camera', type: 'popular', count: 245, icon: '📷' },
    { text: 'Drill', type: 'popular', count: 189, icon: '🔧' },
    { text: 'Laptop', type: 'popular', count: 167, icon: '💻' },
    { text: 'Car', type: 'popular', count: 134, icon: '🚗' },
    { text: 'Bicycle', type: 'popular', count: 98, icon: '🚲' },
    { text: 'Guitar', type: 'popular', count: 87, icon: '🎸' },
    { text: 'Tools', type: 'popular', count: 76, icon: '🔨' },
    { text: 'Tent', type: 'popular', count: 65, icon: '⛺' },
  ];

  // Mock suggestions for fallback (when not using real API)
  const mockSuggestions: SearchSuggestion[] = [
    { text: 'Camera', type: 'category', count: 45, icon: '📷' },
    { text: 'Canon Camera', type: 'item', count: 12, icon: '📷' },
    { text: 'Drill', type: 'category', count: 23, icon: '🔧' },
    { text: 'Power Drill', type: 'item', count: 8, icon: '🔧' },
    { text: 'Laptop', type: 'category', count: 67, icon: '💻' },
  ].filter(suggestion => 
    suggestion.text.toLowerCase().includes(query.toLowerCase())
  );

  const getFilteredSuggestions = () => {
    // If search is empty, show popular searches
    if (query.length === 0) {
      return popularSearches.slice(0, 6);
    }
    
    // If using real API and user is typing, show real suggestions
    if (useRealAPI && query.length > 0) {
      return realSuggestions;
    }
    
    // Fallback to mock suggestions (filtered by query)
    return mockSuggestions;
  };

  const filteredSuggestions = getFilteredSuggestions().slice(0, 8);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true); // Always show suggestions when typing
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true); // Show popular searches on focus
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setIsOpen(false);
    onSearch?.(suggestion.text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(filteredSuggestions[selectedIndex]);
        } else {
          setIsOpen(false);
          onSearch?.(query);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const getSuggestionTypeLabel = (type: string) => {
    switch (type) {
      case 'category': return 'Category';
      case 'item': return 'Item';
      case 'popular': return 'Popular';
      case 'recent': return 'Recent';
      default: return '';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Different styling based on variant
  const renderSearchInput = () => {
    if (variant === 'homepage') {
      return (
        <div className="relative bg-white rounded-full p-1 sm:p-2 shadow-lg">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className="w-full pl-4 sm:pl-6 pr-24 sm:pr-32 py-2 sm:py-3 text-base sm:text-lg rounded-full border-0 focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-500"
          />
          <button 
            type="button"
            onClick={() => onSearch?.(query)}
            className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 bg-green-500 hover:bg-green-600 text-white px-4 sm:px-8 py-1.5 sm:py-2.5 rounded-full transition-colors duration-200"
          >
            {useRealAPI && loading ? (
              <div className="animate-spin h-4 w-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              <Search className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>
        </div>
      );
    }

    // Default variant
    return (
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {useRealAPI && loading ? (
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          ) : (
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>
    );
  };

  // Render modal-like dropdown that always appears under search box
  const renderDropdown = () => {
    if (!isOpen || filteredSuggestions.length === 0) return null;
    
    return (
      <div 
        className="absolute z-[99999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto"
        style={{ 
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 9999999,
          maxHeight: '16rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          isolation: 'isolate'
        }}>
          <div className="p-2">
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
              {query.length === 0 ? (
                <>
                  <span>🔥 Popular Searches</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                    Trending
                  </span>
                </>
              ) : (
                <>
                  <span>💡 Suggestions</span>
                  {useRealAPI && (
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                      Real-time
                    </span>
                  )}
                </>
              )}
            </div>
            
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.text}-${suggestion.type}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors ${
                  index === selectedIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{suggestion.icon}</span>
                    <div>
                      <div className="font-medium text-gray-900">{suggestion.text}</div>
                      <div className="text-xs text-gray-500">
                        {getSuggestionTypeLabel(suggestion.type)}
                        {suggestion.count && ` • ${suggestion.count} items`}
                      </div>
                    </div>
                  </div>
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {renderSearchInput()}
      {renderDropdown()}
    </div>
  );
}