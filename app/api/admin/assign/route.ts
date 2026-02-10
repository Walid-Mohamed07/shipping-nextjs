import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, driverId, vehicleId, estimatedDelivery } = body

    const assignmentsPath = path.join(process.cwd(), 'data', 'assignments.json')
    const assignmentsData = JSON.parse(fs.readFileSync(assignmentsPath, 'utf-8'))

    const requestsPath = path.join(process.cwd(), 'data', 'requests.json')
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'))

    // Check if assignment already exists
    const existingAssignment = assignmentsData.assignments.find(
      (a: any) => a.requestId === requestId
    )

    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Assignment already exists for this request' },
        { status: 400 }
      )
    }

    // Create new assignment
    const newAssignment = {
      id: `ASSIGN-${Date.now()}`,
      requestId,
      driverId,
      vehicleId,
      status: 'Assigned',
      assignedAt: new Date().toISOString(),
      estimatedDelivery,
    }

    assignmentsData.assignments.push(newAssignment)
    fs.writeFileSync(assignmentsPath, JSON.stringify(assignmentsData, null, 2))

    // Update request delivery status
    const requestIndex = requestsData.requests.findIndex((r: any) => r.id === requestId)
    if (requestIndex !== -1) {
      requestsData.requests[requestIndex].deliveryStatus = 'In Transit'
      requestsData.requests[requestIndex].updatedAt = new Date().toISOString()
      fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2))
    }

    return NextResponse.json(
      {
        success: true,
        assignment: newAssignment,
      },
      { status: 201 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const assignmentsPath = path.join(process.cwd(), 'data', 'assignments.json')
    const assignmentsData = JSON.parse(fs.readFileSync(assignmentsPath, 'utf-8'))

    const usersPath = path.join(process.cwd(), 'data', 'users.json')
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))

    const vehiclesPath = path.join(process.cwd(), 'data', 'vehicles.json')
    const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, 'utf-8'))

    const requestsPath = path.join(process.cwd(), 'data', 'requests.json')
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'))

    // Enrich assignments
    const enrichedAssignments = assignmentsData.assignments.map((a: any) => {
      const driver = usersData.users.find((u: any) => u.id === a.driverId)
      const vehicle = vehiclesData.vehicles.find((v: any) => v.id === a.vehicleId)
      const shippingRequest = requestsData.requests.find((r: any) => r.id === a.requestId)

      return {
        ...a,
        driverName: driver?.fullName || driver?.name || 'Unknown',
        vehicleName: vehicle?.model || vehicle?.name || 'Unknown',
        from: shippingRequest?.source?.city || 'Unknown',
        to: shippingRequest?.destination?.city || 'Unknown',
      }
    })

    return NextResponse.json({ assignments: enrichedAssignments }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    )
  }
}
