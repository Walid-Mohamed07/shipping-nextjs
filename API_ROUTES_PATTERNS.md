# API Routes Migration Patterns

## Templates and Examples

This document provides ready-to-use templates for updating the remaining API routes.

---

## Template 1: Simple GET All

**When to use**: Fetching all records without complex filtering

```typescript
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Model } from "@/lib/models";
import { handleError } from "@/lib/apiHelpers";

/**
 * @swagger
 * /api/endpoint:
 *   get:
 *     summary: Get all items
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
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return handleError(error, "Failed to fetch items");
  }
}
```

---

## Template 2: GET with ID

**When to use**: Fetching a single record by ID

```typescript
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Model } from "@/lib/models";
import { handleError, handleNotFound } from "@/lib/apiHelpers";

/**
 * @swagger
 * /api/endpoint/{id}:
 *   get:
 *     summary: Get item by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const item = await Model.findById(params.id);
    
    if (!item) {
      return handleNotFound("Item not found");
    }
    
    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    return handleError(error, "Failed to fetch item");
  }
}
```

---

## Template 3: POST Create

**When to use**: Creating new records

```typescript
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Model } from "@/lib/models";
import { handleError, handleValidationError } from "@/lib/apiHelpers";

/**
 * @swagger
 * /api/endpoint:
 *   post:
 *     summary: Create new item
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    // Validate required fields
    if (!body.requiredField) {
      return handleValidationError("requiredField is required");
    }
    
    const newItem = await Model.create(body);
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    return handleError(error, "Failed to create item");
  }
}
```

---

## Template 4: PUT Update

**When to use**: Updating existing records

```typescript
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Model } from "@/lib/models";
import { handleError, handleNotFound, handleValidationError } from "@/lib/apiHelpers";

/**
 * @swagger
 * /api/endpoint/{id}:
 *   put:
 *     summary: Update item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const body = await request.json();
    
    const item = await Model.findByIdAndUpdate(
      params.id,
      body,
      { new: true, runValidators: true }
    );
    
    if (!item) {
      return handleNotFound("Item not found");
    }
    
    return NextResponse.json(item, { status: 200 });
  } catch (error) {
    return handleError(error, "Failed to update item");
  }
}
```

---

## Template 5: DELETE

**When to use**: Deleting records

```typescript
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Model } from "@/lib/models";
import { handleError, handleNotFound } from "@/lib/apiHelpers";

/**
 * @swagger
 * /api/endpoint/{id}:
 *   delete:
 *     summary: Delete item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();
    const item = await Model.findByIdAndDelete(params.id);
    
    if (!item) {
      return handleNotFound("Item not found");
    }
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleError(error, "Failed to delete item");
  }
}
```

---

## Template 6: GET with Query Filtering

**When to use**: Filtering records by parameters

```typescript
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Model } from "@/lib/models";
import { handleError } from "@/lib/apiHelpers";

/**
 * @swagger
 * /api/endpoint:
 *   get:
 *     summary: Get items with filters
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const searchParams = request.nextUrl.searchParams;
    
    const query: any = {};
    
    if (searchParams.has("status")) {
      query.status = searchParams.get("status");
    }
    
    if (searchParams.has("userId")) {
      query.userId = searchParams.get("userId");
    }
    
    const items = await Model.find(query);
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    return handleError(error, "Failed to fetch items");
  }
}
```

---

## Template 7: Bulk Operations

**When to use**: Getting related data efficiently

```typescript
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Model1, Model2 } from "@/lib/models";
import { handleError } from "@/lib/apiHelpers";

export async function GET() {
  try {
    await connectDB();
    
    // Use Promise.all for parallel queries
    const [items1, items2] = await Promise.all([
      Model1.find(),
      Model2.find(),
    ]);
    
    return NextResponse.json(
      { items1, items2 },
      { status: 200 }
    );
  } catch (error) {
    return handleError(error, "Failed to fetch data");
  }
}
```

---

## Route Updates Priority List

### Routes to Update (by priority)

#### Priority 1: Core Features
- `/api/admin/vehicles` → VehicleController
- `/api/admin/vehicle-rules` → VehicleRuleController
- `/api/admin/users` → AdminUserController
- `/api/admin/companies` → CompanyController
- `/api/admin/assignments` → AssignmentController
- `/api/admin/audit-logs` → AuditLogController

#### Priority 2: Company Features
- `/api/company/warehouses` → CompanyWarehouseController
- `/api/company/profile` → CompanyProfileController
- `/api/company/requests` → CompanyRequestController
- `/api/company/ongoing` → OngoingDeliveriesController
- `/api/company/accept-offer` → OfferController
- `/api/company/assign-warehouse` → WarehouseAssignmentController

#### Priority 3: User Features
- `/api/user/addresses` → AddressController
- `/api/driver/orders` → DriverOrderController

#### Priority 4: Utility Routes
- `/api/messages/[id]` → MessageDetailController
- `/api/reverse-geocode` → GeocodingController
- `/api/upload/media` → FileUploadController

---

## Admin Vehicles Example

Here's a complete example for admin vehicles:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Vehicle } from "@/lib/models";
import { handleError, handleValidationError, handleNotFound } from "@/lib/apiHelpers";

/**
 * @swagger
 * /api/admin/vehicles:
 *   get:
 *     summary: Get all vehicles
 *     tags:
 *       - Admin
 *   post:
 *     summary: Create vehicle
 */
export async function GET() {
  try {
    await connectDB();
    const vehicles = await Vehicle.find();
    return NextResponse.json({ vehicles }, { status: 200 });
  } catch (error) {
    return handleError(error, "Failed to fetch vehicles");
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    
    if (!body.plateNumber) {
      return handleValidationError("plateNumber is required");
    }
    
    const newVehicle = await Vehicle.create(body);
    return NextResponse.json(newVehicle, { status: 201 });
  } catch (error) {
    return handleError(error, "Failed to create vehicle");
  }
}
```

---

## Common Query Patterns

### Count Documents
```typescript
const count = await Model.countDocuments(query);
```

### Find with Sorting
```typescript
const items = await Model.find().sort({ createdAt: -1 }).limit(10);
```

### Find with Pagination
```typescript
const page = parseInt(searchParams.get("page") || "1");
const limit = parseInt(searchParams.get("limit") || "10");
const skip = (page - 1) * limit;

const items = await Model.find()
  .skip(skip)
  .limit(limit)
  .sort({ createdAt: -1 });

const total = await Model.countDocuments();
```

### Conditional Updates
```typescript
const updated = await Model.findByIdAndUpdate(
  id,
  { $set: updates },
  { new: true }
);
```

---

## Testing Your Routes

### Using Swagger UI
1. Start: `npm run dev`
2. Open: `http://localhost:3000/swagger`
3. Test endpoints directly

### Using curl
```bash
curl -X GET http://localhost:3000/api/endpoint
curl -X POST http://localhost:3000/api/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```

### Using Postman
1. Create requests for each endpoint
2. Use variables for base URL and IDs
3. Test all CRUD operations

---

## Testing Checklist

For each route update:
- [ ] Replace all `fs.readFileSync` with mongoose queries
- [ ] Update all error handling to use helper functions
- [ ] Add Swagger JSDoc comments
- [ ] Test GET (list and by ID)
- [ ] Test POST (create with valid and invalid data)
- [ ] Test PUT (update with valid and invalid data)
- [ ] Test DELETE
- [ ] Verify error handling
- [ ] Check response format matches expectations

---

## Next Steps

1. Use these templates to update remaining routes
2. Run the seed command: `npm run seed`
3. Test all endpoints via Swagger UI
4. Verify no breaking changes
5. Deploy when all tests pass
