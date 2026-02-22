# MongoDB Migration Guide

## Overview

This guide explains how to migrate all API routes from JSON file storage to MongoDB using Mongoose.

## Setup Instructions

### 1. Environment Variables

Your `.env` file already contains the MongoDB credentials:

### 2. Seed Initial Data

To migrate your existing JSON data to MongoDB:

```bash
npx tsx lib/seed.ts
```

This will:

- Connect to MongoDB
- Clear existing collections
- Import all data from JSON files into MongoDB

### 3. Update API Routes - Pattern

#### Before (Using JSON Files):

```typescript
import fs from "fs";
import path from "path";

export async function GET() {
  const dataPath = path.join(process.cwd(), "data", "filename.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  return NextResponse.json(data);
}
```

#### After (Using MongoDB):

```typescript
import { connectDB } from "@/lib/db";
import { Model } from "@/lib/models";

/**
 * @swagger
 * /api/endpoint:
 *   get:
 *     summary: Description
 *     tags:
 *       - Category
 *     responses:
 *       200:
 *         description: Success
 */
export async function GET() {
  try {
    await connectDB();
    const items = await Model.find();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

## Common CRUD Operations

### GET All

```typescript
const items = await Model.find();
```

### GET by ID

```typescript
const item = await Model.findById(id);
// or
const item = await Model.findOne({ field: value });
```

### POST (Create)

```typescript
const newItem = await Model.create(body);
```

### PUT (Update)

```typescript
const updated = await Model.findByIdAndUpdate(id, body, { new: true });
```

### DELETE

```typescript
await Model.findByIdAndDelete(id);
```

### Query with Filters

```typescript
const filtered = await Model.find({
  userId: userId,
  status: "active",
});
```

## Routes to Update

### Priority 1 (Critical - Already Updated)

- ✅ `/api/auth/login`
- ✅ `/api/auth/signup`
- ✅ `/api/warehouses`

### Priority 2 (High - Important Features)

- `/api/requests` - Main business logic
- `/api/requests/[id]`
- `/api/requests/[id]/submit-offer`
- `/api/requests/manage`
- `/api/admin/orders`
- `/api/admin/requests`
- `/api/company/requests`
- `/api/company/ongoing`
- `/api/company/accept-offer`

### Priority 3 (Medium)

- `/api/admin/vehicles`
- `/api/admin/vehicles-rules`
- `/api/admin/users`
- `/api/admin/companies`
- `/api/admin/assignments`
- `/api/admin/audit-logs`
- `/api/company/warehouses`
- `/api/user/addresses`
- `/api/messages`
- `/api/messages/[id]`

### Priority 4 (Lower)

- `/api/driver/orders`
- `/api/company/profile`
- `/api/company/assign-warehouse`
- `/api/reverse-geocode`
- `/api/upload/media`

## Field Mapping

### User

- `id` → `_id` (MongoDB ObjectId)
- All other fields remain the same

### Requests

- Normalize query parameters from multiple JSON files
- Use MongoDB's `$lookup` for joins if needed

### Messages

- `id` → `_id`
- All datetime fields stored as Date type

## Important Notes

1. **Generate new IDs**: MongoDB uses `_id` by default. When returning data to clients, include it as `id`:

   ```typescript
   const items = await Model.find();
   return NextResponse.json({
     items: items.map((item) => ({
       ...item.toObject(),
       id: item._id,
     })),
   });
   ```

2. **Timestamps**: Mongoose automatically handles `createdAt` and `updatedAt`

3. **Validation**: Add proper validation before saving:

   ```typescript
   if (!email || !password) {
     return handleValidationError("Missing required fields");
   }
   ```

4. **Error Handling**: Always use try-catch and proper error messages

## Testing with Swagger

1. Start the development server:

   ```bash
   npm run dev
   ```

2. Visit Swagger UI:

   ```
   http://localhost:3000/swagger
   ```

3. Test endpoints directly from the UI

## Migration Checklist

- [ ] Install dependencies
- [ ] Create database connection utility
- [ ] Create Mongoose models
- [ ] Seed database with existing JSON data
- [ ] Update auth routes
- [ ] Update warehouse routes
- [ ] Update request routes
- [ ] Update admin routes
- [ ] Update company routes
- [ ] Update messaging routes
- [ ] Update vehicle routes
- [ ] Update user routes
- [ ] Add Swagger documentation to all routes
- [ ] Test all endpoints
- [ ] Remove data/ folder (after verification)

## Helper Functions

Use error handling helpers from `@/lib/apiHelpers`:

```typescript
import {
  handleError,
  handleValidationError,
  handleNotFound,
  handleUnauthorized,
  handleForbidden,
} from "@/lib/apiHelpers";

// Usage
if (!item) return handleNotFound("Item not found");
if (!userId) return handleValidationError("User ID required");
```

## Common Issues

### Issue: Model not found

**Solution**: Ensure you're importing from `@/lib/models`

### Issue: Connection timeout

**Solution**: Check MongoDB URI in `.env` and verify network connection

### Issue: Duplicate key error

**Solution**: Drop the collection and re-seed: `db.collection.drop()`

### Issue: Field undefined

**Solution**: Check field names match schema definition

## Support

For more information on Mongoose, visit: https://mongoosejs.com/docs/guide.html
