import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const driverId = request.nextUrl.searchParams.get('driverId')

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver ID is required' },
        { status: 400 }
      )
    }

    const assignmentsPath = path.join(process.cwd(), 'data', 'assignments.json')
    const assignmentsData = JSON.parse(fs.readFileSync(assignmentsPath, 'utf-8'))

    const requestsPath = path.join(process.cwd(), 'data', 'requests.json')
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'))

    const usersPath = path.join(process.cwd(), 'data', 'users.json')
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))

    const vehiclesPath = path.join(process.cwd(), 'data', 'vehicles.json')
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, 'utf-8'))

    // Get assignments for this driver
    const driverAssignments = assignmentsData.assignments.filter(
      (a: any) => a.driverId === driverId
    )

    // Enrich with request and vehicle details
    const enrichedOrders = driverAssignments.map((assignment: any) => {
      const shippingRequest = requestsData.requests.find(
        (r: any) => r.id === assignment.requestId
      )
      const vehicle = vehiclesData.vehicles.find((v: any) => v.id === assignment.vehicleId)
      const client = usersData.users.find((u: any) => u.id === shippingRequest?.userId)

      return {
        ...assignment,
        request: shippingRequest,
        vehicle,
        clientName: client?.name || 'Unknown',
        clientEmail: client?.email || 'Unknown',
      }
    })

    return NextResponse.json({ orders: enrichedOrders }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
