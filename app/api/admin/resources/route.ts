import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const vehiclesPath = path.join(process.cwd(), 'data', 'vehicles.json')
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, 'utf-8'))

    const usersPath = path.join(process.cwd(), 'data', 'users.json')
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))

    // Get drivers only
    const drivers = usersData.users.filter((u: any) => u.role === 'driver')

    return NextResponse.json(
      {
        vehicles: vehiclesData.vehicles,
        drivers,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    )
  }
}
