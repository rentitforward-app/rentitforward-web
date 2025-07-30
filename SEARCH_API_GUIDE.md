# 🔍 Search API Implementation Guide

## Current Status: MOCK DATA (Ready to Use)

Your predictive search is currently working with **mock data** - no API setup required!

## 🎯 How to Test Current Implementation

### Web (http://localhost:3000):
- Type in the search box: `cam`, `drill`, `lap`, `can`
- See instant suggestions from mock data

### Mobile:
- Use search on Home or Browse tabs
- Same mock suggestions will appear

## 🚀 Upgrade to Real API (Optional)

If you want suggestions from your actual database instead of mock data:

### Step 1: Database Setup (Optional)
Add a search analytics table to track popular searches:

```sql
-- Optional: Track search analytics
CREATE TABLE search_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast searching
CREATE INDEX idx_search_analytics_query ON search_analytics(query);
CREATE INDEX idx_search_analytics_count ON search_analytics(count DESC);
```

### Step 2: Switch to Real API

#### For Web:
1. Open `src/components/AuthenticatedLayout.tsx`
2. Comment out the `EnhancedPredictiveSearch` component
3. Uncomment the `RealAPIPredictiveSearch` component

```tsx
// BEFORE (Mock Data)
<EnhancedPredictiveSearch ... />

// AFTER (Real API)
<RealAPIPredictiveSearch useRealAPI={true} ... />
```

#### For Mobile:
1. Open mobile screen files (Home, Browse)
2. Replace `PredictiveSearchInput` with `RealAPIPredictiveSearchInput`

```tsx
// BEFORE (Mock Data)
<PredictiveSearchInput ... />

// AFTER (Real API)
<RealAPIPredictiveSearchInput useRealAPI={true} ... />
```

### Step 3: Configure API Endpoint

The real API endpoint is already created at:
- `src/app/api/search/suggestions/route.ts`

It automatically queries your existing `listings` table for:
- ✅ Categories from real listings
- ✅ Listing titles matching search
- ✅ Popular searches (if analytics table exists)

### Step 4: Test Real API

1. Ensure you have listings in your database
2. Search will return suggestions based on actual data
3. Fallback to mock data if API fails

## 🔧 API Endpoints Created

### GET `/api/search/suggestions?q=search_term`

**Response:**
```json
{
  "suggestions": [
    {
      "text": "Electronics",
      "type": "category", 
      "count": 45,
      "icon": "📱"
    },
    {
      "text": "iPhone 13",
      "type": "item",
      "count": 3,
      "icon": "🔍"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 📊 What Gets Suggested

### Mock Data:
- Fixed list of common items and categories
- Always shows the same suggestions

### Real API:
- ✅ **Categories** from your actual listings
- ✅ **Item titles** that match the search
- ✅ **Popular searches** (if tracking enabled)
- ✅ **Live counts** of available items

## ⚡ Performance Features

- ✅ **Debouncing** (300ms delay)
- ✅ **Caching** (automatic browser caching)
- ✅ **Error handling** (falls back to mock data)
- ✅ **Loading states** (spinner while fetching)

## 🎛️ Toggle Between Mock and Real

Both components support a `useRealAPI` prop:

```tsx
// Use mock data (default)
<PredictiveSearch useRealAPI={false} />

// Use real API
<PredictiveSearch useRealAPI={true} />
```

## 🔍 Why Start with Mock Data?

- ✅ **Works immediately** - No setup required
- ✅ **Demonstrates functionality** - Users can see how it works
- ✅ **No dependencies** - Doesn't break if API is down
- ✅ **Fast development** - Can design UI without backend

## 📈 When to Switch to Real API?

Switch when you want:
- Suggestions based on actual inventory
- Dynamic category suggestions
- Popular search tracking
- Personalized suggestions
- Real-time availability counts

---

**Current Status: Mock data is working perfectly! 🎉**

Switch to real API whenever you're ready for database-driven suggestions.