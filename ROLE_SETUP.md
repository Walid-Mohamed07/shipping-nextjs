# User Roles Implementation - Setup Guide

## Overview

The shipping app now includes three user roles with distinct features and permissions:

### 1. **CLIENT**

Clients are end-users who want to ship packages.

**Features:**

- Create new shipping requests via the form (From, To, Item, Category, Estimated Time)
- View all their requests in a dashboard
- Track individual request details and status (Order Status + Delivery Status)
- Monitor shipment progress with a visual timeline

**Demo Login:**

- Email: `john@example.com`
- Password: `hashed_password_123`

**Routes:**

- `/` - Home page
- `/my-requests` - View all requests
- `/request/[id]` - View request details
- `/new-request` - Create new request

---

### 2. **ADMIN**

Admins manage orders and assign them to drivers and vehicles.

**Features:**

- **Order Management Tab:**
  - View all pending orders from clients
  - Accept or reject orders
  - See order details (client info, route, item, category)
- **Assignment Tab:**
  - Assign accepted orders to available drivers
  - Assign vehicles to orders
  - Set estimated delivery times
  - View all active assignments
  - Track which driver/vehicle is handling which shipment

**Demo Login:**

- Email: `admin@example.com`
- Password: `admin_password_123`

**Routes:**

- `/admin/dashboard` - Admin dashboard with two tabs

**Available Resources:**

- Vehicles: 4 vehicles (2 Box Trucks, 2 Cargo Vans)
- Drivers: 2 drivers available for assignment

---

### 3. **DRIVER**

Drivers see their assigned orders and delivery details.

**Features:**

- View all orders assigned to them
- See complete shipment details:
  - Client information and contact details
  - Package contents and category
  - Pickup and delivery locations
  - Assigned vehicle with license plate
  - Estimated delivery date and time
- Organized card-based interface for easy reference

**Demo Login:**

- Email: `driver1@example.com` (Mike Johnson)
- Password: `driver_password_123`

Alternative driver:

- Email: `driver2@example.com` (Sarah Williams)
- Password: `driver_password_456`

**Routes:**

- `/driver/orders` - View all assigned orders

---

## Data Structure

### User Roles Added to Users Data

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "password": "password",
  "name": "User Name",
  "role": "client|admin|driver", // New field
  "createdAt": "ISO-date"
}
```

### Request Status Fields Updated

Requests now track both order and delivery status:

```json
{
  "id": "REQ-001",
  "userId": "1",
  "from": "United States",
  "to": "Canada",
  "item": "Electronics Package",
  "category": "Electronics",
  "estimatedTime": "5-7 days",
  "orderStatus": "Pending|Accepted|Rejected", // Admin manages this
  "deliveryStatus": "Pending|In Transit|Delivered|Cancelled", // Updates based on assignment
  "createdAt": "ISO-date",
  "updatedAt": "ISO-date"
}
```

### Vehicles Data Structure

```json
{
  "id": "VEH-001",
  "name": "Box Truck A",
  "type": "Box Truck",
  "capacity": "5000 kg",
  "plateNumber": "ABC-1234",
  "status": "Available|In Use",
  "createdAt": "ISO-date"
}
```

### Assignments Data Structure

```json
{
  "id": "ASSIGN-001",
  "requestId": "REQ-001",
  "driverId": "driver-001",
  "vehicleId": "VEH-003",
  "status": "Assigned",
  "assignedAt": "ISO-date",
  "estimatedDelivery": "ISO-date"
}
```

---

## API Routes

### Authentication

- `POST /api/auth/login` - Login user (returns user with role)
- `POST /api/auth/signup` - Register new user (creates as client role)

### Admin Routes

- `GET /api/admin/orders` - Get all orders with enriched user data
- `PUT /api/admin/orders` - Accept/reject order
- `GET /api/admin/resources` - Get available vehicles and drivers
- `POST /api/admin/assign` - Create assignment (order → driver + vehicle)
- `GET /api/admin/assign` - Get all assignments with enriched data

### Driver Routes

- `GET /api/driver/orders?driverId=XXX` - Get orders assigned to driver

### Client Routes

- Existing `/api/requests` routes for creating and fetching requests

---

## Component Hierarchy

### Admin Dashboard Components

- `AdminOrdersTab` - Manage pending orders (accept/reject)
- `AdminAssignmentTab` - Assign orders to drivers and vehicles

### Updated Components

- `Header` - Now shows role-based navigation links
- `my-requests` page - Updated to display order and delivery status separately
- `request/[id]` page - Shows both order status and delivery status badges

---

## Workflow Example

### Complete Shipping Workflow:

1. **Client Creates Request**
   - Navigate to `/new-request`
   - Fill form with shipment details
   - Request created with `orderStatus: "Pending"`

2. **Admin Reviews & Accepts**
   - Navigate to `/admin/dashboard`
   - View pending orders in "Order Management" tab
   - Click "Accept" to change `orderStatus` to "Accepted"

3. **Admin Assigns to Driver**
   - Switch to "Assign Orders" tab
   - Select the accepted order
   - Select available driver
   - Select available vehicle
   - Set estimated delivery date
   - Click "Assign Order"
   - `deliveryStatus` changes to "In Transit"

4. **Driver Views Assignment**
   - Navigate to `/driver/orders`
   - See the assigned shipment with all details
   - Can reference client info, package details, vehicle, estimated delivery

5. **Client Tracks Shipment**
   - Navigate to `/my-requests`
   - Click on request to view details
   - See visual timeline showing delivery progress
   - View both Order Status (Accepted) and Delivery Status (In Transit)

---

## Navigation Based on Role

When users log in, the Header component automatically shows role-appropriate navigation:

- **Client**: "My Requests" link
- **Admin**: "Dashboard" link
- **Driver**: "My Orders" link

The user's role is also displayed next to their name in the header.

---

## Testing the App

To fully test all roles:

1. **Test as Client:**
   - Login with john@example.com
   - Create a new request
   - View your requests
   - Check request details

2. **Test as Admin:**
   - Login with admin@example.com
   - Review pending orders
   - Accept some orders
   - Assign to drivers and vehicles
   - View active assignments

3. **Test as Driver:**
   - Login with driver1@example.com
   - See all assignments
   - View detailed shipment information

---
