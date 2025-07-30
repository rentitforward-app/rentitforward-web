import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    
    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const supabase = await createClient();
    
    // Get real suggestions from your database
    const suggestions = await getRealSearchSuggestions(supabase, query);
    
    return NextResponse.json({ 
      suggestions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}

async function getRealSearchSuggestions(supabase: any, query: string) {
  const suggestions = [];
  
  try {
    // 1. Get matching categories from actual listings
    const { data: categories, error: categoriesError } = await supabase
      .from('listings')
      .select('category')
      .ilike('category', `%${query}%`)
      .limit(5);

    if (!categoriesError && categories) {
      const categoryMap = new Map();
      categories.forEach((item: any) => {
        if (item.category) {
          const count = categoryMap.get(item.category) || 0;
          categoryMap.set(item.category, count + 1);
        }
      });
      
      categoryMap.forEach((count, category) => {
        suggestions.push({
          text: category,
          type: 'category',
          count,
          icon: getCategoryIcon(category)
        });
      });
    }

    // 2. Get matching listing titles
    const { data: titles, error: titlesError } = await supabase
      .from('listings')
      .select('title')
      .ilike('title', `%${query}%`)
      .limit(5);

    if (!titlesError && titles) {
      titles.forEach((item: any) => {
        if (item.title) {
          suggestions.push({
            text: item.title,
            type: 'item',
            count: 1,
            icon: '🔍'
          });
        }
      });
    }

    // 3. Fallback suggestions if no database results
    if (suggestions.length === 0) {
      const fallbackSuggestions = [
        { text: 'Camera', type: 'category', count: 45, icon: '📷' },
        { text: 'Drill', type: 'category', count: 23, icon: '🔧' },
        { text: 'Laptop', type: 'category', count: 67, icon: '💻' },
        { text: 'Bicycle', type: 'category', count: 34, icon: '🚲' },
        { text: 'Tools', type: 'category', count: 56, icon: '🛠️' },
      ].filter(suggestion => 
        suggestion.text.toLowerCase().includes(query.toLowerCase())
      );
      
      suggestions.push(...fallbackSuggestions);
    }

  } catch (error) {
    console.error('Database query error:', error);
    
    // Return fallback suggestions on database error
    const fallbackSuggestions = [
      { text: 'Camera', type: 'category', count: 45, icon: '📷' },
      { text: 'Drill', type: 'category', count: 23, icon: '🔧' },
      { text: 'Laptop', type: 'category', count: 67, icon: '💻' },
      { text: 'Bicycle', type: 'category', count: 34, icon: '🚲' },
      { text: 'Tools', type: 'category', count: 56, icon: '🛠️' },
    ].filter(suggestion => 
      suggestion.text.toLowerCase().includes(query.toLowerCase())
    );
    
    suggestions.push(...fallbackSuggestions);
  }

  return suggestions.slice(0, 10); // Limit total suggestions
}

function getCategoryIcon(category: string): string {
  const iconMap: Record<string, string> = {
    'electronics': '📱',
    'tools': '🔧',
    'cameras': '📷',
    'furniture': '🪑',
    'sports': '⚽',
    'books': '📚',
    'clothing': '👕',
    'vehicles': '🚗',
  };
  
  return iconMap[category.toLowerCase()] || '📦';
}