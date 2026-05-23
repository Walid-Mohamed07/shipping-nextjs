# ShipHub - Global Shipping Made Easy

[![Next.js](https://img.shields.io/badge/Next.js-v16-black?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-9.2-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/)

> A comprehensive shipping and logistics management platform with real-time tracking, multi-role support, and intelligent assignment systems.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [User Roles & Permissions](#user-roles--permissions)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Real-Time System](#real-time-system)
- [Authentication & Security](#authentication--security)
- [Components](#components)
- [Hooks](#hooks)
- [Activity Logging](#activity-logging)
- [Caching Strategy](#caching-strategy)
- [Demo Accounts](#demo-accounts)
- [Scripts](#scripts)
- [Contributing](#contributing)

---

## Overview

**ShipHub** is a full-stack shipping and logistics management platform built with Next.js 16 and React 19. It enables clients to create shipping requests, drivers to submit competitive offers, and administrators to manage the entire logistics workflow with real-time updates.

### Key Highlights

- 🚀 **Modern Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- 📦 **MongoDB Backend**: Mongoose ODM with 11 data models
- 🔄 **Real-Time Updates**: Server-Sent Events (SSE) for live data synchronization
- 👥 **Multi-Role System**: 6 distinct user roles with specific permissions
- 🗺️ **Interactive Maps**: Leaflet integration for location selection and tracking
- 📱 **Responsive Design**: Mobile-first UI with Radix UI components
- 📊 **API Documentation**: Swagger/OpenAPI integration
- 🔐 **Secure Authentication**: JWT-based auth with HTTP-only cookies

---

## Features

### For Clients
- Create shipping requests with detailed item information
- Upload media files for items (images, documents)
- Track shipment status in real-time
- View and accept offers from shipping drivers
- Manage saved addresses
- View complete activity history for each request
- Real-time notifications for offer updates

### For Drivers
- Browse available shipping requests
- Submit competitive cost offers with comments
- Manage warehouse inventory
- Track ongoing shipments
- Assign source and destination warehouses
- Update delivery status
- View driver performance metrics

### For Administrators
- Complete dashboard with multiple management tabs
- User management (CRUD operations)
- Driver management and approval
- Vehicle fleet management
- Vehicle rules configuration
- Order assignment to drivers
- Audit logging system
- Performance metrics and analytics
- Interactive shipments map
- Override assignments capability

### For Drivers
- View assigned orders
- Access shipment details and routes
- Update delivery status
- View vehicle assignments

### General Features
- 🔔 Real-time notifications via SSE
- 💬 In-app messaging system
- 🗺️ Interactive map-based location picker
- 📱 Fully responsive design
- 🎨 Dark/Light theme support
- 🔍 Swagger API documentation
- ⚡ Skeleton loaders for smooth UX
- 📧 Toast notifications (Sonner)

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.6 | React framework with App Router |
| React | 19.2.0 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.1.9 | Styling |
| Radix UI | Latest | Accessible UI primitives |
| Lucide React | 0.454.0 | Icons |
| React Hook Form | 7.60.0 | Form management |
| Zod | 3.25.76 | Schema validation |
| React Leaflet | 5.0.0 | Interactive maps |
| Recharts | 2.15.4 | Data visualization |
| Sonner | 1.7.4 | Toast notifications |
| date-fns | 4.1.0 | Date utilities |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| MongoDB | Latest | Database |
| Mongoose | 9.2.1 | ODM |
| JWT | 9.0.3 | Authentication |
| bcryptjs | 3.0.3 | Password hashing |
| Swagger | 6.2.8 | API documentation |

### Development
| Technology | Purpose |
|------------|---------|
| pnpm | Package manager |
| ESLint | Code linting |
| PostCSS | CSS processing |
| Turbopack | Development bundler |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │   React 19   │ │  Tailwind    │ │  Radix UI    │ │   Leaflet   │ │
│  │  Components  │ │     CSS      │ │  Components  │ │    Maps     │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          CONTEXT LAYER                               │
│  ┌─────────────────────────────┐ ┌─────────────────────────────────┐│
│  │       AuthContext           │ │       RealTimeContext           ││
│  │   (JWT Authentication)      │ │   (SSE Event Subscriptions)     ││
│  └─────────────────────────────┘ └─────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP ROUTER                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │   Pages      │ │  API Routes  │ │   Layouts    │ │   Loading   │ │
│  │  (Client)    │ │  (Server)    │ │   States     │ │   States    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API LAYER                                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │    Auth      │ │   Requests   │ │   Admin      │ │   Driver   │ │
│  │   Routes     │ │    Routes    │ │   Routes     │ │   Routes    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │   Driver     │ │  Messages    │ │  Warehouses  │ │  Real-Time  │ │
│  │   Routes     │ │   Routes     │ │   Routes     │ │   Events    │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    Mongoose ODM                                  ││
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         ││
│  │  │ User   │ │Request │ │Driver │ │Vehicle │ │Message │ ...     ││
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘         ││
│  └─────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    MongoDB Atlas                                 ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
shipping-nextjs/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles
│   │
│   ├── admin/                   # Admin pages
│   │   ├── dashboard/           # Admin dashboard
│   │   └── request/             # Admin request management
│   │
│   ├── api/                     # API routes
│   │   ├── admin/               # Admin API endpoints
│   │   │   ├── assign/          # Order assignment
│   │   │   ├── audit-logs/      # Audit logging
│   │   │   ├── drivers/       # Driver management
│   │   │   ├── metrics/         # Performance metrics
│   │   │   ├── orders/          # Order management
│   │   │   ├── requests/        # Request management
│   │   │   ├── resources/       # Resources API
│   │   │   ├── users/           # User management
│   │   │   ├── vehicle-rules/   # Vehicle rules
│   │   │   ├── vehicles/        # Vehicle management
│   │   │   └── warehouse/       # Warehouse management
│   │   │
│   │   ├── auth/                # Authentication
│   │   │   ├── login/           # Login endpoint
│   │   │   └── signup/          # Registration endpoint
│   │   │
│   │   ├── driver/             # Driver API endpoints
│   │   │   ├── accept-offer/    # Accept client offers
│   │   │   ├── assign-warehouse/# Warehouse assignment
│   │   │   ├── delivery-status/ # Delivery status updates
│   │   │   ├── ongoing/         # Ongoing shipments
│   │   │   ├── profile/         # Driver profile
│   │   │   ├── requests/        # Available requests
│   │   │   └── warehouses/      # Driver warehouses
│   │   │
│   │   ├── driver/              # Driver API endpoints
│   │   ├── messages/            # Messaging system
│   │   ├── realtime/            # SSE events endpoint
│   │   ├── requests/            # Request CRUD operations
│   │   ├── user/                # User API endpoints
│   │   ├── warehouses/          # Warehouses API
│   │   ├── upload/              # File uploads
│   │   ├── api-docs/            # Swagger JSON endpoint
│   │   ├── mapbox-search/       # Mapbox geocoding
│   │   ├── nominatim-search/    # Nominatim geocoding
│   │   └── reverse-geocode/     # Reverse geocoding
│   │
│   ├── driver/                 # Driver pages
│   │   ├── inbox/               # Driver inbox
│   │   ├── ongoing/             # Ongoing shipments
│   │   ├── requests/            # Available requests
│   │   └── warehouses/          # Warehouse management
│   │
│   ├── components/              # App components
│   │   ├── loaders/             # Skeleton loaders
│   │   ├── home/                # Home page components
│   │   ├── Header.tsx           # Navigation header
│   │   ├── Footer.tsx           # Page footer
│   │   ├── AuthGuard.tsx        # Route protection
│   │   ├── LiveTrackingMap.tsx  # Real-time map
│   │   ├── LocationMapPicker.tsx# Location selection
│   │   └── Admin*.tsx           # Admin tab components
│   │
│   ├── context/                 # React contexts
│   │   ├── AuthContext.tsx      # Authentication state
│   │   └── RealTimeContext.tsx  # SSE subscriptions
│   │
│   ├── driver/                  # Driver pages
│   │   └── orders/              # Driver orders
│   │
│   ├── hooks/                   # Custom React hooks
│   │   ├── useHomeView.ts       # Home page state
│   │   ├── useLiveData.ts       # Real-time data fetching
│   │   └── useProtectedRoute.ts # Route protection
│   │
│   ├── login/                   # Login page
│   ├── signup/                  # Registration page
│   ├── profile/                 # User profile pages
│   ├── messages/                # Messaging pages
│   ├── my-requests/             # Client requests
│   ├── new-request/             # Create request
│   ├── request/                 # Request details
│   └── swagger/                 # Swagger UI
│
├── components/                  # Shared UI components
│   ├── ui/                      # shadcn/ui components
│   │   ├── accordion.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── checkbox.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── popover.tsx
│   │   ├── progress.tsx
│   │   ├── scroll-area.tsx
│   │   ├── select.tsx
│   │   ├── separator.tsx
│   │   ├── skeleton.tsx
│   │   ├── slider.tsx
│   │   ├── switch.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── textarea.tsx
│   │   ├── toast.tsx
│   │   ├── tooltip.tsx
│   │   └── ...
│   └── theme-provider.tsx       # Theme context
│
├── constants/                   # Application constants
│   ├── categories.ts            # Item categories
│   └── countries.ts             # Country list
│
├── data/                        # Seed data (JSON)
│   ├── assignments.json
│   ├── audit-logs.json
│   ├── drivers.json
│   ├── locations.json
│   ├── messages.json
│   ├── requests.json
│   ├── users.json
│   ├── vehicle-rule.json
│   ├── vehicle-rules.json
│   ├── vehicles.json
│   └── warehouse.json
│
├── lib/                         # Utility libraries
│   ├── db.ts                    # MongoDB connection
│   ├── swagger.ts               # Swagger configuration
│   ├── auth-helpers.ts          # Authentication utilities
│   ├── apiHelpers.ts            # API response helpers
│   ├── activityLogger.ts        # Activity logging
│   ├── eventBroadcaster.ts      # SSE broadcaster
│   ├── publicIdGenerator.ts     # Public ID generation
│   ├── seed.ts                  # Database seeding
│   ├── api-service.ts           # API service layer
│   ├── useToast.ts              # Toast hook
│   ├── utils.ts                 # Utility functions
│   │
│   └── models/                  # Mongoose models
│       ├── index.ts             # Model exports
│       ├── User.ts              # User model
│       ├── Request.ts           # Request model
│       ├── Driver.ts           # Driver model
│       ├── Warehouse.ts         # Warehouse model
│       ├── Vehicle.ts           # Vehicle model
│       ├── VehicleRule.ts       # Vehicle rules model
│       ├── Message.ts           # Message model
│       ├── Assignment.ts        # Assignment model
│       ├── AuditLog.ts          # Audit log model
│       └── Address.ts           # Address model
│
├── public/                      # Static assets
│   ├── assets/                  # Images and icons
│   └── uploads/                 # User uploads
│
├── styles/                      # Additional styles
│   └── globals.css              # Global CSS
│
├── types/                       # TypeScript definitions
│   ├── index.ts                 # Type exports
│   ├── address.ts               # Address types
│   ├── driver.ts               # Driver types
│   ├── request.ts               # Request types
│   ├── user.ts                  # User types
│   ├── vehicle.ts               # Vehicle types
│   └── warehouse.ts             # Warehouse types
│
├── package.json                 # Dependencies
├── pnpm-lock.yaml              # Lock file
├── tsconfig.json               # TypeScript config
├── next.config.mjs             # Next.js config
├── postcss.config.mjs          # PostCSS config
├── components.json             # shadcn/ui config
└── README.md                   # This file
```

---

## Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **pnpm** (recommended) or npm
- **MongoDB** instance (local or Atlas)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd shipping-nextjs
```

2. **Install dependencies**
```bash
pnpm install
# or
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env.local
```

4. **Seed the database** (optional - for demo data)
```bash
npm run seed
```

5. **Start the development server**
```bash
npm run dev
```

6. **Open the application**
```
http://localhost:3000
```

7. **Access Swagger API documentation**
```
http://localhost:3000/swagger
```

---

## Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
DB_NAME=shiphub

# Authentication
JWT_SECRET=your-super-secret-jwt-key

# Optional: Mapbox (for map features)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-token

# Optional: Vercel Analytics
VERCEL_ANALYTICS_ID=your-analytics-id
```

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `DB_NAME` | No | Database name (default: `shiphub`) |
| `JWT_SECRET` | Yes | Secret key for JWT signing |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Mapbox API token for maps |

---

## User Roles & Permissions

ShipHub implements a comprehensive role-based access control (RBAC) system with 6 distinct user roles:

### 1. Client (`client`)
End-users who create and manage shipping requests.

| Permission | Description |
|------------|-------------|
| Create requests | Create new shipping requests |
| View own requests | View requests they created |
| Accept offers | Accept cost offers from drivers |
| Track shipments | View real-time tracking |
| Manage addresses | Save and edit delivery addresses |
| Send messages | Communicate with drivers |

### 2. Driver (`driver`)
Shipping drivers that fulfill requests.

| Permission | Description |
|------------|-------------|
| View requests | Browse available shipping requests |
| Submit offers | Provide cost estimates |
| Manage warehouses | CRUD operations on warehouses |
| Assign warehouses | Assign source/destination warehouses |
| Update delivery status | Progress updates |
| View ongoing shipments | Track assigned shipments |

### 3. Admin (`admin`)
Full system administrators.

| Permission | Description |
|------------|-------------|
| Manage users | Create, edit, delete users |
| Manage drivers | Approve, edit drivers |
| Manage vehicles | Fleet management |
| View all requests | Access all system requests |
| Assign orders | Assign requests to drivers |
| View audit logs | System activity monitoring |
| Override assignments | Emergency reassignments |

### 4. Operator (`operator`)
System operators with limited admin access.

| Permission | Description |
|------------|-------------|
| View all requests | Access all requests |
| Manage assignments | Assign orders to resources |
| View metrics | Performance dashboards |
| Send messages | System communications |

### 5. Driver (`driver`)
Delivery personnel.

| Permission | Description |
|------------|-------------|
| View assigned orders | Orders assigned to them |
| Update delivery status | Mark pickups/deliveries |
| View vehicle details | Assigned vehicle info |

### 6. Warehouse Manager (`warehouse_manager`)
Warehouse operations managers.

| Permission | Description |
|------------|-------------|
| Manage warehouse | Update warehouse details |
| View inventory | Stock levels |
| Process shipments | Incoming/outgoing |

---

## API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/signup` | User registration |

### Request Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/requests` | List all requests (filtered) |
| POST | `/api/requests` | Create new request |
| GET | `/api/requests/[id]` | Get request by ID/publicId |
| PUT | `/api/requests/[id]` | Update request |
| DELETE | `/api/requests/[id]` | Delete request |
| POST | `/api/requests/[id]/submit-offer` | Submit/accept offer |
| PUT | `/api/requests/manage` | Manage request status |

### Driver Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/driver/requests` | Get available requests |
| POST | `/api/driver/requests` | Submit offer / reject |
| GET | `/api/driver/ongoing` | Get ongoing shipments |
| GET | `/api/driver/ongoing/[id]` | Get specific ongoing |
| POST | `/api/driver/accept-offer` | Accept client's selection |
| POST | `/api/driver/assign-warehouse` | Assign warehouses |
| PUT | `/api/driver/delivery-status` | Update delivery status |
| GET | `/api/driver/warehouses` | List driver warehouses |
| POST | `/api/driver/warehouses` | Add warehouse |
| GET | `/api/driver/profile` | Get driver profile |

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create user |
| PUT | `/api/admin/users` | Update user |
| DELETE | `/api/admin/users` | Delete user |
| GET | `/api/admin/drivers` | List drivers |
| POST | `/api/admin/drivers` | Create driver |
| GET | `/api/admin/vehicles` | List vehicles |
| POST | `/api/admin/vehicles` | Add vehicle |
| GET | `/api/admin/vehicle-rules` | List vehicle rules |
| GET | `/api/admin/orders` | List orders |
| POST | `/api/admin/assign` | Assign order |
| GET | `/api/admin/audit-logs` | Get audit logs |
| GET | `/api/admin/metrics` | Performance metrics |
| GET | `/api/admin/requests` | All requests |
| PUT | `/api/admin/requests` | Update any request |

### Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warehouses` | List all warehouses |
| GET | `/api/messages` | User messages |
| POST | `/api/messages` | Send message |
| GET | `/api/driver/orders` | Driver's orders |
| POST | `/api/upload/media` | File upload |
| GET | `/api/realtime/events` | SSE connection |
| GET | `/api/nominatim-search` | Geocoding search |
| GET | `/api/reverse-geocode` | Reverse geocoding |

### Interactive Documentation

Access the full Swagger UI documentation at:
```
http://localhost:3000/swagger
```

---

## Database Schema

### User Model
```typescript
{
  email: string;           // Unique, required
  password: string;        // Hashed with bcrypt
  fullName: string;
  name: string;
  username: string;        // Unique
  profilePicture?: string;
  mobile?: string;
  nationalOrPassportNumber?: string;
  birthDate?: string;
  idImage?: string;
  licenseImage?: string;
  criminalRecord?: string;
  role: 'client' | 'admin' | 'driver' | 'operator' | 'driver' | 'warehouse_manager';
  status: 'active' | 'inactive' | 'suspended';
  driver?: ObjectId;      // Reference to Driver
  createdAt: Date;
  updatedAt: Date;
}
```

### Request Model
```typescript
{
  publicId: string;        // Format: REQ-XXXXXX (unique)
  user: ObjectId;          // Reference to User
  source: {
    country: string;
    city: string;
    street: string;
    coordinates?: { latitude, longitude };
    // ... full address fields
  };
  destination: {           // Same structure as source
    // ... address fields
  };
  items: [{
    name: string;
    category: string;
    weight: string;
    dimensions: string;
    quantity: number;
    note?: string;
    media?: [{ url, existing }];
    services?: {
      canBeAssembledDisassembled?: boolean;
      assemblyDisassemblyHandler?: 'self' | 'driver';
      packaging?: boolean;
    };
  }];
  deliveryType: 'Normal' | 'Urgent';
  requestStatus: 'Pending' | 'Accepted' | 'Rejected' | 'Assigned to Driver' | 'In Progress' | 'Completed' | 'Cancelled' | 'Action needed';
  deliveryStatus: 'Pending' | 'Picked Up Source' | 'Warehouse Source Received' | 'In Transit' | 'Warehouse Destination Received' | 'Shipment Deliver' | 'Delivered' | 'Failed';
  costOffers?: [{
    driver: { id, name, phoneNumber, email, address, rate };
    cost: number;
    comment?: string;
    selected: boolean;
    status: 'pending' | 'accepted' | 'rejected';
  }];
  activityHistory?: [{
    timestamp: Date;
    action: string;
    description?: string;
    driverName?: string;
    cost?: number;
    details?: object;
  }];
  sourceWarehouse?: { id, name, address, coordinates };
  destinationWarehouse?: { id, name, address, coordinates };
  createdAt: Date;
  updatedAt: Date;
}
```

### Driver Model
```typescript
{
  userId?: string;
  name: string;           // Required
  phoneNumber?: string;
  email: string;          // Unique, required
  address?: string;
  rate?: string;          // Rating (e.g., "4.5")
  warehouses: [ObjectId]; // References to Warehouse
  createdAt: Date;
  updatedAt: Date;
}
```

### Warehouse Model
```typescript
{
  name: string;           // Required
  code: string;           // Unique, required
  country: string;        // Required
  state?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  currentStock: number;   // Default: 0
  manager?: string;
  contact?: string;
  status: 'active' | 'inactive' | 'maintenance';
  stockType: string;      // Default: 'all'
  createdAt: Date;
  updatedAt: Date;
}
```

### Vehicle Model
```typescript
{
  name: string;           // Required
  type: 'Truck' | 'Van' | 'Pickup' | 'Box Truck' | 'Cargo Van';
  model?: string;
  capacity?: string;
  plateNumber: string;    // Unique, required
  status: 'available' | 'In Use' | 'maintenance' | 'retired';
  country: string;        // Required
  createdAt: Date;
  updatedAt: Date;
}
```

### Message Model
```typescript
{
  senderId?: string;
  senderName?: string;
  senderEmail: string;    // Required
  recipientEmail: string; // Required
  recipientName?: string;
  subject?: string;
  message: string;        // Required
  status: 'sent' | 'read' | 'unread';
  priority: 'low' | 'normal' | 'high';
  attachments?: [string];
  links?: [string];
  readAt?: Date;
  repliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Additional Models
- **Assignment**: Order-to-driver-vehicle assignments
- **AuditLog**: System activity logging
- **VehicleRule**: Vehicle allocation rules
- **Address**: Saved address book entries

---

## Real-Time System

ShipHub uses Server-Sent Events (SSE) for real-time updates across the application.

### Architecture

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────┐
│   Client     │────▶│  SSE Endpoint     │◀────│ API Routes   │
│  (Browser)   │     │ /api/realtime     │     │  Broadcast   │
└──────────────┘     └───────────────────┘     └──────────────┘
       │                      │                       │
       │                      ▼                       │
       │             ┌─────────────────┐              │
       │             │ EventBroadcaster│              │
       │             │   (Singleton)   │◀─────────────┘
       │             └─────────────────┘
       │                      │
       ▼                      ▼
┌──────────────┐     ┌───────────────────┐
│ RealTime     │     │ Connected Clients │
│  Context     │     │   (Map<id,ctrl>)  │
└──────────────┘     └───────────────────┘
```

### Event Types

| Event | Description | Target Roles |
|-------|-------------|--------------|
| `REQUEST_CREATED` | New request created | admin, operator, driver |
| `REQUEST_UPDATED` | Request modified | admin, operator, driver, owner |
| `REQUEST_DELETED` | Request removed | admin, operator |
| `OFFER_SUBMITTED` | Driver submitted offer | admin, operator, owner |
| `OFFER_ACCEPTED` | Client accepted offer | admin, operator, driver |
| `OFFER_UPDATED` | Offer modified | admin, operator, owner |
| `STATUS_CHANGED` | Request status change | all relevant parties |
| `DELIVERY_STATUS_CHANGED` | Delivery progress | admin, operator, driver, owner |
| `WAREHOUSE_ASSIGNED` | Warehouse assigned | admin, operator, driver, owner |
| `DRIVER_ASSIGNED` | Driver assigned | admin, operator, driver, driver |
| `MESSAGE_RECEIVED` | New message | recipient |
| `TRACKING_UPDATED` | Live tracking | owner, admin |

### Usage

```typescript
import { useLiveData, useLiveRequest } from "@/app/hooks/useLiveData";

// Single request with live updates
const { data: request, isLoading, isConnected } = useLiveRequest(requestId);

// List with auto-refresh
const { data: requests, refresh } = useLiveData({
  endpoint: `/api/requests?userId=${userId}`,
  eventTypes: ['REQUEST_CREATED', 'REQUEST_UPDATED'],
  debounceMs: 500,
});
```

---

## Authentication & Security

### JWT Authentication

- Tokens are signed using `jsonwebtoken` library
- Configurable expiration (default: 7 days)
- Stored in HTTP-only cookies for security
- Also available via Authorization header

### Token Payload

```typescript
{
  id: string;        // User MongoDB _id
  email: string;
  username: string;
  fullName: string;
  driver?: string;  // Driver ID if applicable
  role: UserRole;
}
```

### Password Security

- Passwords hashed with `bcryptjs`
- Automatic salting
- Secure comparison on login

### Route Protection

```typescript
// Client-side protection
import { useProtectedRoute } from "@/app/hooks/useProtectedRoute";

function ProtectedPage() {
  const { isAuthorized, isLoading } = useProtectedRoute(['admin', 'operator']);
  if (!isAuthorized) return <Redirect />;
  return <Content />;
}

// Server-side API protection
import { getCurrentUser, isUserAuthorizedForRequest } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return handleUnauthorized();
  // ...
}
```

---

## Components

### Core Components

| Component | Description |
|-----------|-------------|
| `Header` | Navigation with role-based menu items |
| `Footer` | Page footer with links |
| `AuthGuard` | Route protection wrapper |

### Admin Dashboard Tabs

| Component | Description |
|-----------|-------------|
| `AdminOrdersTab` | Order management |
| `AdminAssignmentTab` | Resource assignment |
| `AdminUsersTab` | User management |
| `AdminDriversTab` | Driver management |
| `AdminDriversTab` | Driver management |
| `AdminVehicleManagementTab` | Fleet management |
| `AdminVehicleRulesTab` | Allocation rules |
| `AdminWarehouseManagementTab` | Warehouse operations |
| `AdminRequestsTab` | Request oversight |
| `AdminAuditLogsTab` | Activity logs |
| `AdminPerformanceMetricsTab` | Analytics dashboard |
| `AdminShipmentsMapTab` | Geographic view |
| `AdminOverrideAssignmentsTab` | Emergency controls |

### Form Components

| Component | Description |
|-----------|-------------|
| `AddressForm` | Address input with autocomplete |
| `LocationMapPicker` | Interactive map location selection |
| `NewRequestForm` | Multi-step request creation |

### Map Components

| Component | Description |
|-----------|-------------|
| `LiveTrackingMap` | Real-time shipment tracking |
| `LocationMapPicker` | Interactive location selection |

### Skeleton Loaders

| Component | Description |
|-----------|-------------|
| `TableSkeleton` | Loading state for tables |
| `CardSkeleton` | Loading state for cards |
| `FormSkeleton` | Loading state for forms |
| `RequestCardSkeleton` | Loading state for request cards |
| `MapSkeleton` | Loading state for maps |
| `ListSkeleton` | Loading state for lists |

---

## Hooks

### `useLiveData<T>`

Fetch data with automatic real-time refresh.

```typescript
const { data, isLoading, error, refresh, isConnected, lastUpdated } = useLiveData({
  endpoint: '/api/requests',
  eventTypes: ['REQUEST_CREATED', 'REQUEST_UPDATED'],
  requestId: 'optional-filter',
  transform: (data) => data.requests,
  debounceMs: 300,
});
```

### `useLiveRequest`

Convenience hook for single request.

```typescript
const { data: request, isLoading, isConnected } = useLiveRequest(publicId);
```

### `useLiveRequests`

Convenience hook for user's requests.

```typescript
const { data: requests, isLoading } = useLiveRequests(userId);
```

### `useProtectedRoute`

Route protection with role checking.

```typescript
const { isAuthorized, isLoading } = useProtectedRoute(['admin', 'driver']);
```

### `useAuth`

Authentication state management.

```typescript
const { user, login, logout, signup, isLoading, setUser } = useAuth();
```

### `useToast`

Standardized toast notifications.

```typescript
const toast = useToast();
toast.create("Item created successfully");
toast.update("Profile updated");
toast.delete("Item removed");
toast.error("Something went wrong");
toast.info("Please note...");
toast.warning("Warning message");
```

---

## Activity Logging

ShipHub tracks all significant request events for audit purposes.

### Logged Events

| Action | Description |
|--------|-------------|
| `request_created` | New request created |
| `request_updated` | Request details modified |
| `offer_submitted` | Driver submitted offer |
| `offer_updated` | Driver modified offer |
| `offer_accepted` | Client accepted offer |
| `offer_rejected` | Offer was rejected |
| `request_rejected_by_driver` | Driver declined request |
| `status_changed` | Request status updated |
| `delivery_status_changed` | Delivery progress updated |
| `warehouse_assigned` | Warehouse assigned |

### Usage

```typescript
import { addActivityLog, ActivityActions } from "@/lib/activityLogger";

await addActivityLog(requestId, 
  ActivityActions.OFFER_SUBMITTED(driverId, driverName, 150, "Fast delivery")
);
```

### Activity Entry Schema

```typescript
{
  timestamp: Date;
  action: string;
  description?: string;
  driverName?: string;
  driverRate?: string;
  cost?: number;
  details?: Record<string, any>;
}
```

---

## Caching Strategy

### API-Level Caching

```typescript
return new Response(JSON.stringify(data), {
  headers: {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
  },
});
```

### Cache Duration Guidelines

| Data Type | Duration | Example |
|-----------|----------|---------|
| Live tracking | No cache | `/api/tracking` |
| Messages | 1 minute | `/api/messages` |
| User requests | 5 minutes | `/api/my-requests` |
| User profile | 1 hour | `/api/user/profile` |
| Lookup data | 24 hours | `/api/categories` |

### ISR (Incremental Static Regeneration)

```typescript
// Home page - revalidate every 60 seconds
export const revalidate = 60;

// Login/Signup pages - revalidate every hour
export const revalidate = 3600;
```

---

## Demo Accounts

After running `npm run seed`, these accounts are available:

### Client

```
Email: john@example.com
Password: hashed_password_123
```

### Admin

```
Email: admin@example.com
Password: admin_password_123
```

### Driver #1

```
Email: driver1@example.com
Password: driver_password_123
```

### Driver #2

```
Email: driver2@example.com
Password: driver_password_456
```

### Driver

```
Email: driver@example.com
Password: driver_password_123
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run seed` | Seed database with demo data |

---

## Item Categories

ShipHub supports 35 item categories:

- Art & Craft
- Automotive Parts
- Baby Products
- Bags & Luggage
- Bicycles
- Books
- Building Materials
- Camping Gear
- Cleaning Supplies
- Clothing
- Cosmetics
- Documents
- Electronics
- Energy Equipment
- Fishing Equipment
- Food & Beverages
- Footwear
- Garden & Outdoor
- Groceries
- Health & Wellness
- Home Appliances
- Jewelry
- Machinery
- Medical Supplies
- Musical Instruments
- Office Supplies
- Other
- Pet Supplies
- Pharmaceuticals
- Raw Materials
- Safety Equipment
- Sports Equipment
- Stationery
- Tools & Hardware
- Toys & Games

---

## Public ID System

Requests use a public reference number format instead of exposing MongoDB ObjectIds:

- **Format**: `REQ-XXXXXX` (e.g., `REQ-9X4K2M`)
- **Characters**: Uppercase A-Z and digits 0-9
- **Length**: 6 random characters
- **Uniqueness**: Enforced at database level
- **Auto-generated**: On request creation

This provides:
- User-friendly reference numbers
- Security (no MongoDB ID exposure)
- Easy communication in support tickets

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Include Swagger documentation for API routes

---

## License

This project is proprietary software. All rights reserved.

---

## Support

For support inquiries, please contact the development team.

---

**Built with ❤️ using Next.js 16 and React 19**