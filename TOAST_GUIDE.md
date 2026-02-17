# Toast Notifications Guide

## Overview

This project uses **Sonner** for toast notifications. A centralized `useToast` hook has been created to provide consistent toast messages across the entire application for all CRUD operations.

## Setup

The Toaster component should be added to your root layout. If not yet added:

```tsx
import { Toaster } from "sonner";

// In your root layout or app component:
<Toaster position="top-right" richColors />;
```

## Usage

### Basic Usage in Components

```tsx
"use client";

import { useToast } from "@/lib/useToast";

export function MyComponent() {
  const toast = useToast();

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (response.ok) {
        toast.create("User created successfully");
        // Refresh data, close modal, etc.
      } else {
        toast.error("Failed to create user");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    }
  };

  return <button onClick={handleCreate}>Create</button>;
}
```

## API Methods

### `toast.create(message?)`

Shows success toast for create operations

```tsx
toast.create(); // "Created successfully"
toast.create("User created successfully");
```

### `toast.update(message?)`

Shows success toast for update operations

```tsx
toast.update(); // "Updated successfully"
toast.update("Profile updated successfully");
```

### `toast.delete(message?)`

Shows success toast for delete operations

```tsx
toast.delete(); // "Deleted successfully"
toast.delete("User deleted successfully");
```

### `toast.error(message?, options?)`

Shows error toast

```tsx
toast.error("Failed to create user");
toast.error("Something went wrong", { duration: 5000 });
```

### `toast.info(message)`

Shows info toast

```tsx
toast.info("Please note: Changes will be saved automatically");
```

### `toast.warning(message)`

Shows warning toast

```tsx
toast.warning("This action cannot be undone");
```

### `toast.loading(message?)`

Shows loading toast (with dismiss capability)

```tsx
const toastId = toast.loading("Processing your request...");
// Later: toast.dismiss(toastId);
```

### `toast.dismiss(id?)`

Dismisses a specific toast or all

```tsx
toast.dismiss(toastId); // Dismiss specific
toast.dismiss(); // Dismiss all
```

### `toast.custom(message, type)`

Custom toast with any type

```tsx
toast.custom("Message", "success");
toast.custom("Message", "error");
```

### `toast.promise(promise, messages)`

Promise-based toast for async operations

```tsx
await toast.promise(apiCall(), {
  loading: "Loading data...",
  success: "Data loaded successfully!",
  error: "Failed to load data",
});
```

## Pattern Examples

### Create Operation

```tsx
const handleCreate = async () => {
  try {
    const response = await fetch("/api/items", {
      method: "POST",
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      toast.create("Item created successfully");
      setFormData({});
      refreshList();
    } else {
      toast.error("Failed to create item");
    }
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
};
```

### Update Operation

```tsx
const handleUpdate = async () => {
  try {
    const response = await fetch(`/api/items/${id}`, {
      method: "PUT",
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      toast.update("Item updated successfully");
      closeEditForm();
      refreshList();
    } else {
      toast.error("Failed to update item");
    }
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
};
```

### Delete Operation

```tsx
const handleDelete = async (id: string) => {
  if (!confirm("Are you sure?")) return;

  try {
    const response = await fetch(`/api/items/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      toast.delete("Item deleted successfully");
      setItems(items.filter((item) => item.id !== id));
    } else {
      toast.error("Failed to delete item");
    }
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
};
```

### Async Operations with Promise

```tsx
const handleAsyncTask = async (data: any) => {
  await toast.promise(
    fetch("/api/process", { method: "POST", body: JSON.stringify(data) }),
    {
      loading: "Processing your request...",
      success: "Request processed successfully!",
      error: "Failed to process request",
    },
  );
};
```

## Helper Functions

### `getErrorMessage(error)`

Extracts human-readable error message from various error types

```tsx
import { getErrorMessage } from "@/lib/useToast";

try {
  // operation
} catch (error) {
  const message = getErrorMessage(error);
  toast.error(message);
}
```

## Best Practices

1. **Always handle errors**: Every POST/PUT/DELETE should have error handling

   ```tsx
   } catch (error) {
     toast.error(getErrorMessage(error));
   }
   ```

2. **Use appropriate methods**:
   - `toast.create()` for POST
   - `toast.update()` for PUT
   - `toast.delete()` for DELETE

3. **Provide context**: Include what was created/updated/deleted

   ```tsx
   toast.create("User profile updated successfully");
   // Not: toast.create("Success");
   ```

4. **Use promise pattern for long operations**:

   ```tsx
   await toast.promise(expensiveOperation(), {
     loading: "Processing...",
     success: "Done!",
     error: "Failed",
   });
   ```

5. **Dismiss duplicate toasts**: If showing multiple operations
   ```tsx
   const loadingId = toast.loading("Uploading files...");
   // ... do work
   toast.dismiss(loadingId);
   toast.create("Files uploaded successfully");
   ```

## Components Currently Using Toast

- `AdminUsersTab.tsx` - User management (Create, Update)
- `NewRequestForm.tsx` - Request creation
- `AddAddressDialog.tsx` - Address management
- `profile/page.tsx` - Profile operations
- `my-requests/page.tsx` - Request actions
- `request/[id]/page.tsx` - Request details actions

## Migrating Existing Components

Replace `alert()` and `console.log()` with toast:

### Before

```tsx
const response = await fetch("/api/users", { method: "POST", body });
if (response.ok) {
  alert("User created!");
  console.log("Success");
} else {
  alert("Failed to create user");
}
```

### After

```tsx
const toast = useToast();
const response = await fetch("/api/users", { method: "POST", body });
if (response.ok) {
  toast.create("User created successfully");
} else {
  toast.error("Failed to create user");
}
```

## Styling

Sonner automatically handles:

- Dark/light mode
- Success (green), Error (red), Loading (blue), Info (blue) colors
- Responsive positioning
- Auto-dismiss after 3-4 seconds
- Rich colors for better visibility

Configure in your root layout:

```tsx
<Toaster
  position="top-right" // top-left, top-center, top-right, bottom-left, etc.
  richColors // Colored backgrounds
  expand={false} // Expand on hover
  closeButton // Show close button
/>
```
