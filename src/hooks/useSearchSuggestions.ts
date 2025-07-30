'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Simple local types
interface SearchSuggestion {
  text: string;
  type: 'category' | 'item' | 'brand' | 'query' | 'location';
  count?: number;
  icon?: string;
}

interface UseSearchSuggestionsOptions {
  debounceDelay?: number;
  maxSuggestions?: number;
  minChars?: number;
  enableHistory?: boolean;
}

interface SearchSuggestionsResult {
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  error: string | null;
  clearHistory: () => void;
}

// Mock suggestions for demo
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
];

export function useSearchSuggestions(
  query: string,
  options: UseSearchSuggestionsOptions = {}
): SearchSuggestionsResult {
  const {
    debounceDelay = 300,
    maxSuggestions = 8,
    minChars = 2,
    enableHistory = true,
  } = options;

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout>();

  // Search history management
  const getSearchHistory = useCallback((): string[] => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('search_history') || '[]');
      } catch {
        return [];
      }
    }
    return [];
  }, []);

  const saveToHistory = useCallback((searchQuery: string) => {
    if (typeof window !== 'undefined' && searchQuery.trim()) {
      try {
        const history = getSearchHistory();
        const newHistory = [searchQuery, ...history.filter(h => h !== searchQuery)].slice(0, 10);
        localStorage.setItem('search_history', JSON.stringify(newHistory));
      } catch (error) {
        console.warn('Failed to save search history:', error);
      }
    }
  }, [getSearchHistory]);

  const clearHistory = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('search_history');
      } catch (error) {
        console.warn('Failed to clear search history:', error);
      }
    }
  }, []);

  // Generate suggestions
  const generateSuggestions = useCallback(async (searchQuery: string): Promise<SearchSuggestion[]> => {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (!normalizedQuery || normalizedQuery.length < minChars) {
      return [];
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Filter mock suggestions
    const filtered = MOCK_SUGGESTIONS.filter(suggestion =>
      suggestion.text.toLowerCase().includes(normalizedQuery)
    );

    // Add recent searches if enabled
    let historySuggestions: SearchSuggestion[] = [];
    if (enableHistory) {
      const history = getSearchHistory();
      historySuggestions = history
        .filter(search => search.toLowerCase().includes(normalizedQuery))
        .map(search => ({
          text: search,
          type: 'query' as const,
          icon: '🕒'
        }));
    }

    // Combine and limit results
    const combined = [...historySuggestions, ...filtered].slice(0, maxSuggestions);
    return combined;
  }, [minChars, enableHistory, getSearchHistory, maxSuggestions]);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(async () => {
      if (query.length >= minChars) {
        setIsLoading(true);
        setError(null);
        
        try {
          const results = await generateSuggestions(query);
          setSuggestions(results);
        } catch (err) {
          setError('Failed to fetch suggestions');
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setSuggestions([]);
        setIsLoading(false);
      }
    }, debounceDelay);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, debounceDelay, minChars, generateSuggestions]);

  // Save search to history when needed
  const saveSearch = useCallback((searchQuery: string) => {
    saveToHistory(searchQuery);
  }, [saveToHistory]);

  return {
    suggestions,
    isLoading,
    error,
    clearHistory,
  };
}

// Export types for convenience
export type { SearchSuggestion, UseSearchSuggestionsOptions, SearchSuggestionsResult };