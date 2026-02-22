# SSG/ISR & Caching Strategy Guide

This document outlines the caching and performance optimization strategy for the Shipping Application.

## Architecture Overview

This application primarily uses **client-side rendering (`"use client"`)** for interactive features like forms, filters, and real-time updates. Due to this architecture, traditional **SSG/ISR (Static Site Generation / Incremental Static Regeneration)** at the page level is not applicable for most routes.

Instead, performance optimization focuses on:

1. **API-Level Caching** - Cache API responses at the server
2. **Client-Side Caching** - Browser and React caching strategies
3. **Skeleton Loaders** - Smooth loading states while data fetches
4. **Selective Static Generation** - For non-interactive pages only

## Strategy by Page Type

### 1. **Client-Interactive Pages** (Majority of App)

Pages using `"use client"` for interactivity:

- **Company Requests** (`/company/requests`) - Filters, bidding, dynamic content
- **Admin Dashboard** (`/admin/dashboard`) - Real-time statistics
- **Driver Orders** (`/driver/orders`) - Order management
- **My Requests** (`/my-requests`) - User shipment tracking
- **Messages** (`/messages`, `/messages/[id]`) - Interactive messaging
- **Company Inbox** (`/company/inbox`) - Message management
- **User Profile** (`/profile/*`) - Profile editing and management
- **Warehouses** (`/company/warehouses`) - CRUD operations
- **Request Details** (`/request/[id]`) - Live tracking and interaction
- **New Request** (`/new-request`) - Form submission

**Strategy**: Use **API-level caching** with `next/cache` tags for these pages.

### 2. **Potential Static Pages** (Best Practices)

Pages that could benefit from static generation:

- **Home Page** (`/`) - Could be static or cached
- **Login Page** (`/login`) - Could be static
- **Signup Page** (`/signup`) - Could be static
- **API Docs** (`/api-docs`) - Static documentation

**Note**: These pages currently use `"use client"` but could be refactored to server components for static generation if needed.

## Caching Strategy: API-Level Approach

Since pages fetch data client-side, implement caching at the API layer:

```typescript
// Example API route with caching headers
export async function GET(request: Request) {
  const data = await fetchData();

  const response = new Response(JSON.stringify(data), {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Content-Type": "application/json",
    },
  });

  return response;
}
```

**Cache Durations by Data Type**:

- **Real-time data** (live tracking): `no-cache`
- **Frequently updated** (messages, requests): `s-maxage=60` (1 minute)
- **Moderately stable** (user profile): `s-maxage=3600` (1 hour)
- **Rarely changed** (lookup data): `s-maxage=86400` (24 hours)

## Performance Benefits

- **Faster Perceived Load Time**: Skeleton loaders show immediate feedback
- **Reduced Server Load**: API-level caching prevents redundant queries
- **Better UX**: Smooth transitions between loading and loaded states
- **Flexible Caching**: Client and API-level strategies can be independently tuned

## Client-Side Caching Strategies

### 1. **React Query / SWR-Style Caching**

Use React Query (TanStack Query) for intelligent client-side caching:

```typescript
import { useQuery } from "@tanstack/react-query";

const { data: requests, isLoading } = useQuery({
  queryKey: ["company-requests"],
  queryFn: () => fetch("/api/company/requests").then((r) => r.json()),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 30 * 60 * 1000, // 30 minutes
});
```

### 2. **Browser Local Storage**

Cache non-sensitive data:

```typescript
localStorage.setItem("userPreferences", JSON.stringify(data));
const savedFilters = localStorage.getItem("requestFilters");
```

### 3. **Service Worker** (Optional)

Implement for offline capability and background sync

## Cache Invalidation Strategy

Invalidate caches after data mutations:

```typescript
// After successful API mutation
await queryClient.invalidateQueries({ queryKey: ["requests"] });

// Or use cache tags
await revalidateTag("requests");
```

## Monitoring & Key Metrics

Monitor these metrics to optimize cache strategy:

1. **API Response Times**
   - Cached responses: < 50ms
   - Database queries: 100-500ms

2. **Cache Hit Rate**
   - Target: > 85% for API endpoints
   - Lower hit rates suggest shorter stale times needed

3. **Time to First Byte (TTFB)**
   - Cached pages: ~100-200ms
   - Dynamic pages: 300-1000ms

## Migration Path to SSG/ISR

If you want to implement true SSG/ISR in the future:

1. **Refactor non-interactive pages to server components** ✅ COMPLETED
   - Removed `"use client"` from pages that don't need it
   - Pages like `/` `/login` `/signup` are now server components
   - Interactive forms extracted as client components

2. **Add `revalidate` configuration** ✅ COMPLETED
   - Home page: `revalidate = 60` (1 minute) - user-specific content
   - Login page: `revalidate = 3600` (1 hour) - static form layout
   - Signup page: `revalidate = 3600` (1 hour) - static form layout
   - API Docs: `revalidate = 3600` (1 hour) - static documentation

3. **Hydration Mismatch Handling** ✅ COMPLETED
   - Added `suppressHydrationWarning` to forms to handle browser extensions
   - Form autofill libraries (password managers) add temporary attributes
   - These warnings are suppressed since they don't affect functionality

4. **Use dynamic routes with `generateStaticParams`** (Optional)
   ```typescript
   export async function generateStaticParams() {
     const ids = await getIds();
     return ids.map((id) => ({ id }));
   }
   ```

## Implementation Details

### Server Components with Client Forms
Pages are now server components that render client components for interactivity:
- Server renders static HTML for initial load
- Client components hydrate with interactive state
- `suppressHydrationWarning` suppresses benign attribute mismatches from external scripts

## Current Architecture Summary

✅ **Skeleton Loaders**: Professional loading states across all pages
✅ **API-Level Caching**: Server-side response caching
✅ **Client-Side Caching**: Browser and React Query caching
✅ **Dynamic Features**: Full client interactivity with `"use client"`
✅ **SSG/ISR**: Implemented for static pages (Home, Login, Signup, API Docs)
✅ **Hydration Handling**: Benign hydration mismatches suppressed from form autofill
