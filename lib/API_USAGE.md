# API Service Usage Examples

## Configuration
The API base URL is configured in `.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=https://5m0b1g8t-4000.euw.devtunnels.ms
```

## Import
```typescript
import { apiGet, apiPost, apiPut, apiDelete, apiPatch, apiUpload } from '@/lib/api-service';
```

## Usage Examples

### GET Request
```typescript
// Simple GET
const response = await apiGet('/users');

// GET with query parameters
const response = await apiGet('/users', {
  params: { page: 1, limit: 10 }
});

// GET with custom headers (e.g., authentication)
const response = await apiGet('/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### POST Request
```typescript
// POST with body
const response = await apiPost('/users', {
  body: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});

// POST with headers and params
const response = await apiPost('/orders', {
  headers: { 'Authorization': `Bearer ${token}` },
  params: { notify: true },
  body: { productId: 123, quantity: 2 }
});
```

### PUT Request
```typescript
// Update resource
const response = await apiPut('/users/123', {
  body: {
    name: 'Jane Doe',
    email: 'jane@example.com'
  }
});
```

### DELETE Request
```typescript
// Delete resource
const response = await apiDelete('/users/123');

// Delete with params
const response = await apiDelete('/users/123', {
  params: { force: true }
});
```

### PATCH Request
```typescript
// Partial update
const response = await apiPatch('/users/123', {
  body: { name: 'Updated Name' }
});
```

### File Upload
```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('description', 'Profile picture');

const response = await apiUpload('/upload', formData, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Response Handling
All methods return a standardized `ApiResponse` object:

```typescript
interface ApiResponse<T> {
  data?: T;      // Response data if successful
  error?: string; // Error message if failed
  status: number; // HTTP status code
}
```

### Example with TypeScript types:
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const { data, error, status } = await apiGet<User[]>('/users');

if (error) {
  console.error('Error:', error);
  // Handle error
} else {
  console.log('Users:', data);
  // Use data
}
```

## React Component Example
```typescript
'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '@/lib/api-service';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      const { data, error } = await apiGet('/users');
      
      if (error) {
        console.error('Failed to fetch users:', error);
      } else {
        setUsers(data || []);
      }
      
      setLoading(false);
    }

    fetchUsers();
  }, []);

  const handleCreateUser = async (userData) => {
    const { data, error } = await apiPost('/users', {
      body: userData
    });

    if (error) {
      alert('Error: ' + error);
    } else {
      alert('User created successfully!');
      setUsers([...users, data]);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {/* Your UI */}
    </div>
  );
}
```
