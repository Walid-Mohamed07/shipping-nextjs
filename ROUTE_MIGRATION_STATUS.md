# API Route Migration Status

## ✅ Completed Routes (13/31)

### Auth Routes (2/2)

- ✅ `POST /api/auth/login` - MongoDB
- ✅ `POST /api/auth/signup` - MongoDB

### Request Management Routes (3/6)

- ✅ `GET|POST /api/requests` - MongoDB with complex filtering
- ❌ `GET /api/requests/[id]` - Partial update needed
- ❌ `GET|POST /api/requests/[id]/submit-offer` - Todo
- ❌ `GET|POST /api/requests/manage` - Todo

### Admin Routes (3/10)

- ✅ `POST /api/admin/assign` - MongoDB
- ✅ `GET|PUT /api/admin/requests` - MongoDB
- ✅ `GET|POST /api/admin/users` - MongoDB
- ❌ `GET /api/admin/vehicle-rules` - Todo
- ❌ `GET|POST /api/admin/vehicles` - Todo
- ❌ `GET /api/admin/warehouse` - Todo
- ❌ `GET /api/admin/audit-logs` - Todo
- ❌ `GET /api/admin/companies` - Todo
- ❌ `GET /api/admin/orders` - Todo
- ❌ `GET /api/admin/resources` - Todo
- ❌ `GET /api/admin/requests/[id]` - Todo

### Company Routes (4/6)

- ✅ `GET|POST /api/company/warehouses` - MongoDB
- ✅ `GET|POST /api/company/requests` - MongoDB
- ✅ `GET|PUT /api/company/profile` - MongoDB
- ✅ `GET /api/company/ongoing` - MongoDB
- ❌ `POST /api/company/accept-offer` - Todo
- ❌ `POST /api/company/assign-warehouse` - Todo

### Driver Routes (1/1)

- ✅ `GET /api/driver/orders` - MongoDB

### Message Routes (1/2)

- ✅ `GET|POST /api/messages` - MongoDB
- ❌ `GET /api/messages/[id]` - Todo

### User/Utility Routes (0/5)

- ❌ `GET|POST /api/user/addresses` - Todo
- ❌ `POST /api/reverse-geocode` - Todo
- ❌ `POST /api/upload/media` - Todo
- ❌ `GET /api/api-docs` - Already done (Swagger JSON)

## Migration Pattern

All routes follow this MongoDB pattern:

```typescript
import { connectDB, handleError } from "@/lib/db";
import { Model } from "@/lib/models";

/**
 * @swagger
 * /api/route:
 *   get:
 *     summary: Description
 *     tags: [Category]
 *     responses:
 *       200:
 *         description: Success
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const data = await Model.find({}).lean();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return handleError(error);
  }
}
```

## Remaining Work

- Update 18 remaining routes using MongoDB pattern
- Add Swagger JSDoc to all endpoints
- Test all endpoints via Swagger UI at `/swagger`
- Verify no breaking changes with existing client code

## Next Steps

1. Quick-update utility routes (reverse-geocode, upload/media, addresses) - Simple pass-through
2. Finish admin routes batch
3. Finish company routes batch
4. Test everything via Swagger UI
