# API Caching Implementation Guide

Since this application primarily uses client-side rendering (`"use client"`), implement caching at the **API level** instead of page level.

## Quick Setup

### 1. Add Cache Headers to API Routes

```typescript
// /app/api/requests/route.ts
export async function GET(request: Request) {
  // Fetch data
  const data = await db.requests.findMany();

  // Return with cache headers
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      // Recommended: 5-minute cache for this endpoint
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
```

### 2. Cache Duration Recommendations

| Endpoint Type | Duration         | Example                                     |
| ------------- | ---------------- | ------------------------------------------- |
| Live tracking | `no-cache`       | `/api/request/[id]/tracking`                |
| Messages      | `s-maxage=60`    | `/api/messages`, `/api/inbox`               |
| User requests | `s-maxage=300`   | `/api/my-requests`, `/api/company/requests` |
| User profile  | `s-maxage=3600`  | `/api/user/profile`                         |
| Lookup data   | `s-maxage=86400` | `/api/categories`, `/api/countries`         |

### 3. Cache Invalidation After Updates

```typescript
// /app/api/requests/create/route.ts
import { revalidateTag } from "next/cache";

export async function POST(request: Request) {
  const data = await request.json();

  // Create the request
  const newRequest = await db.requests.create(data);

  // Invalidate related caches
  // Note: Tag-based revalidation requires tagging in GET requests first
  revalidateTag("requests");

  return new Response(JSON.stringify(newRequest), { status: 201 });
}
```

### 4. Client-Side Caching with React Query (Optional but Recommended)

Install React Query if not already present:

```bash
npm install @tanstack/react-query
```

Setup:

```typescript
// /app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes default
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

Use in layout:

```typescript
// /app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

Use in components:

```typescript
import { useQuery } from '@tanstack/react-query';

export function MyComponent() {
  const { data, isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: () => fetch('/api/requests').then(r => r.json()),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return <RequestCardSkeleton count={3} />;
  }

  return <RequestList data={data} />;
}
```

## Cache Headers Explained

```
'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
```

- `public`: Cache can be stored by any cache
- `s-maxage=300`: Cache for 5 minutes on server
- `stale-while-revalidate=600`: Serve stale content for 10 minutes while revalidating in background

## Best Practices

1. **Set appropriate cache durations** based on how frequently data changes
2. **Invalidate on mutations** to keep data fresh
3. **Use React Query** for client-side caching and deduplication
4. **Monitor cache hit rates** via server logs
5. **Use compression** (gzip) for faster transfers
6. **Return only necessary fields** from API endpoints

## Troubleshooting

**Cache not working?**

- Check if `s-maxage` is set (not `max-age` alone)
- Verify request goes through caching layer
- Check server logs for cache headers

**Stale data showing?**

- Reduce cache duration (lower `s-maxage`)
- Implement client-side invalidation on mutations
- Use `stale-while-revalidate` for smooth updates

**High cache hit rate needed?**

- Increase `staleTime` in React Query
- Increase `s-maxage` on API routes
- Use background revalidation with `stale-while-revalidate`
