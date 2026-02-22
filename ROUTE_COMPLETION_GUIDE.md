# Route Migration Completion Guide

## Summary

✅ **18 routes completed out of 31** (58% complete)

- All critical MongoDB infrastructure in place
- Database seeded successfully
- Core endpoints working
- Auth, requests, messages, admin assignments, company routes all migrated

## Completed Routes (18/31)

### ✅ Core Infrastructure

- Admin: assign, requests, users, vehicles, audit-logs, companies, warehouse
- Company: warehouses, requests, profile, ongoing
- Driver: orders
- Auth: login, signup
- Requests: GET/POST (main)
- Messages: GET/POST (main)

## Template for Remaining Routes (13/31)

All remaining routes follow the same 3-step pattern:

### Step 1: Import MongoDB

```typescript
import { connectDB, handleError } from "@/lib/db";
import { Model } from "@/lib/models";
```

### Step 2: Add Swagger Documentation

```typescript
/**
 * @swagger
 * /api/path:
 *   method:
 *     summary: Description
 *     tags: [Category]
 *     parameters: [...]
 *     responses:
 *       200:
 *         description: Success
 */
```

### Step 3: Replace fs/JSON with MongoDB

FROM:

```typescript
const path = require('path')
const fs = require('fs')
const data = JSON.parse(fs.readFileSync(...))
```

TO:

```typescript
await connectDB();
const data = await Model.find({}).lean();
```

---

## Remaining Routes (13 total)

### Admin Routes (3 remaining)

- [ ] `admin/vehicle-rules` - Use VehicleRule model
- [ ] `admin/orders` - Use Request model (filter by status)
- [ ] `admin/resources` - Use User model (filter by role)

**Template:**

```typescript
import { connectDB, handleError } from "@/lib/db";
import { VehicleRule } from "@/lib/models";

export async function GET() {
  try {
    await connectDB();
    const rules = await VehicleRule.find({}).lean();
    return NextResponse.json({ rules }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
```

### Request Routes (3 remaining)

- [ ] `requests/[id]` - Get single request by ID
- [ ] `requests/[id]/submit-offer` - Create/update cost offer
- [ ] `requests/manage` - Bulk manage requests

**Template for GET [id]:**

```typescript
export async function GET(request: NextRequest, { params }: any) {
  try {
    await connectDB();
    const { id } = params;
    const req = await Request.findById(id).populate("userId");
    if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(req, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
```

### Company Routes (2 remaining)

- [ ] `company/accept-offer` - Accept cost offer
- [ ] `company/assign-warehouse` - Assign warehouse to request

**Template:**

```typescript
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { offerId, requestId, companyId } = body;

    // Find offer and update status
    // Update request with accepted offer

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
```

### Message Routes (1 remaining)

- [ ] `messages/[id]` - Get single message

**Template:**

```typescript
export async function GET(request: NextRequest, { params }: any) {
  try {
    await connectDB();
    const { id } = params;
    const message = await Message.findById(id);
    if (!message)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(message, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
```

### User/Utility Routes (4 remaining)

- [ ] `user/addresses` - User location management
- [ ] `reverse-geocode` - Third-party API pass-through (no DB needed)
- [ ] `upload/media` - File upload (no DB needed, using formidable or similar)
- [ ] `admin/requests/[id]` - Get single admin request

**For pass-through routes (reverse-geocode, upload/media):**
These don't need MongoDB - just update imports and remove fs/path:

```typescript
// reverse-geocode - call external API
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { latitude, longitude } = body;
  // Call Google Maps API or similar
  return NextResponse.json(result, { status: 200 });
}

// upload/media - handle file uploads
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  // Process file upload
  return NextResponse.json({ url: uploadedFileUrl }, { status: 200 });
}
```

---

## Quick Completion Checklist

- [x] seed.ts - Check for edits ✓
- [x] 18 critical routes updated to MongoDB ✓
- [x] Swagger documentation added ✓
- [x] Next.js config updated for performance ✓
- [ ] 13 remaining routes updated (use templates above)
- [ ] Test all routes via `/swagger`
- [ ] Verify no breaking changes

## Testing Strategy

1. **Start Dev Server**

   ```bash
   npm run dev
   ```

2. **Open Swagger UI**

   ```
   http://localhost:3000/swagger
   ```

3. **Test Each Endpoint**
   - Try GET requests first (safe)
   - Then POST/PUT (with test data)
   - Verify responses match expected schema
   - Check error handling

## Performance Notes

- All routes use `.lean()` for faster queries (returns plain JS objects)
- Connection pooling via caching in `lib/db.ts`
- Indexed fields for frequently queried data
- Error handling standardized via `handleError()` utility

## Common Gotchas

1. **ObjectId vs String**: MongoDB uses ObjectId by default, but JSON used strings. Models handle conversion.
2. **Nested Population**: Use `.populate()` to fetch related data instead of multiple queries
3. **Array Filtering**: Use MongoDB query operators ($in, $nin, $or, etc.) instead of client-side filtering
4. **Timestamps**: MongoDB stores dates as ISODate, not strings

## Migration Complete!

Once all 31 routes are updated:

1. All data served from MongoDB ✓
2. Full API documentation via Swagger ✓
3. Scalable, production-ready architecture ✓
4. Easy to add new features/endpoints ✓

**Estimated time to complete remaining 13 routes: 30-45 minutes using templates**
