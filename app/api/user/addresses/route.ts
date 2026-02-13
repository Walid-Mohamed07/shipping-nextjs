import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const locationsPath = path.join(process.cwd(), "data", "locations.json");

function getLocationsData() {
  return JSON.parse(fs.readFileSync(locationsPath, "utf-8"));
}

function saveLocationsData(data: any) {
  fs.writeFileSync(locationsPath, JSON.stringify(data, null, 2));
}

// GET /api/user/addresses?userId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId)
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  
  const locationsData = getLocationsData();
  const userLocations = locationsData.locations.filter(
    (loc: any) => loc.userId === userId
  );
  
  return NextResponse.json({ locations: userLocations });
}

// POST /api/user/addresses (add new address)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, address } = body;
  if (!userId || !address)
    return NextResponse.json(
      { error: "Missing userId or address" },
      { status: 400 },
    );
  
  const locationsData = getLocationsData();
  
  // If setting as primary, update all other locations for this user
  if (address.primary) {
    locationsData.locations = locationsData.locations.map((loc: any) => {
      if (loc.userId === userId) {
        return { ...loc, primary: false };
      }
      return loc;
    });
  }
  
  // Generate new location ID
  const maxId = Math.max(
    0,
    ...locationsData.locations.map((loc: any) => {
      const match = loc.id?.match(/LOC-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    })
  );
  
  const newLocation = {
    id: `LOC-${maxId + 1}`,
    userId,
    ...address,
  };
  
  locationsData.locations.push(newLocation);
  saveLocationsData(locationsData);
  
  // Return all user locations
  const userLocations = locationsData.locations.filter(
    (loc: any) => loc.userId === userId
  );
  
  return NextResponse.json({ success: true, locations: userLocations });
}

// PUT /api/user/addresses (update address or set primary)
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { userId, address, setPrimary, locationId } = body;
  if (!userId || !address)
    return NextResponse.json(
      { error: "Missing userId or address" },
      { status: 400 },
    );
  
  const locationsData = getLocationsData();
  
  // Find location by ID or by postal code + street (fallback for legacy compatibility)
  let locationIndex = -1;
  if (locationId) {
    locationIndex = locationsData.locations.findIndex(
      (loc: any) => loc.id === locationId && loc.userId === userId
    );
  } else {
    locationIndex = locationsData.locations.findIndex(
      (loc: any) =>
        loc.userId === userId &&
        loc.postalCode === address.postalCode &&
        loc.street === address.street
    );
  }
  
  if (locationIndex === -1)
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  
  if (setPrimary) {
    locationsData.locations = locationsData.locations.map((loc: any) => {
      if (loc.userId === userId) {
        return { ...loc, primary: false };
      }
      return loc;
    });
    locationsData.locations[locationIndex].primary = true;
  }
  
  locationsData.locations[locationIndex] = {
    ...locationsData.locations[locationIndex],
    ...address,
  };
  
  saveLocationsData(locationsData);
  
  // Return all user locations
  const userLocations = locationsData.locations.filter(
    (loc: any) => loc.userId === userId
  );
  
  return NextResponse.json({ success: true, locations: userLocations });
}

// DELETE /api/user/addresses (delete address)
export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { userId, address, locationId } = body;
  if (!userId || (!address && !locationId))
    return NextResponse.json(
      { error: "Missing userId or address/locationId" },
      { status: 400 },
    );
  
  const locationsData = getLocationsData();
  
  // Find index by ID or by postal code + street
  let indexToDelete = -1;
  if (locationId) {
    indexToDelete = locationsData.locations.findIndex(
      (loc: any) => loc.id === locationId && loc.userId === userId
    );
  } else {
    indexToDelete = locationsData.locations.findIndex(
      (loc: any) =>
        loc.userId === userId &&
        loc.postalCode === address.postalCode &&
        loc.street === address.street
    );
  }
  
  if (indexToDelete === -1)
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  
  const deletedLocation = locationsData.locations[indexToDelete];
  locationsData.locations.splice(indexToDelete, 1);
  
  // If deleted location was primary, set first remaining location as primary
  if (deletedLocation.primary) {
    const userLocations = locationsData.locations.filter(
      (loc: any) => loc.userId === userId
    );
    if (userLocations.length > 0) {
      const firstLocIndex = locationsData.locations.findIndex(
        (loc: any) => loc.id === userLocations[0].id
      );
      if (firstLocIndex !== -1) {
        locationsData.locations[firstLocIndex].primary = true;
      }
    }
  }
  
  saveLocationsData(locationsData);
  
  // Return all user locations
  const userLocations = locationsData.locations.filter(
    (loc: any) => loc.userId === userId
  );
  
  return NextResponse.json({ success: true, locations: userLocations });
}
