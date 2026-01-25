import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const requestsPath = path.join(process.cwd(), 'data', 'requests.json')
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'))
    const usersPath = path.join(process.cwd(), 'data', 'users.json')
    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'))

    // Enrich requests with user info
    const enrichedRequests = requestsData.requests.map((req: any) => {
      const user = usersData.users.find((u: any) => u.id === req.userId)
      return {
        ...req,
        userName: user?.name || 'Unknown',
        userEmail: user?.email || 'Unknown',
      }
    })

    return NextResponse.json({ requests: enrichedRequests }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { requestId, orderStatus } = body

    const requestsPath = path.join(process.cwd(), 'data', 'requests.json')
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'))

    const requestIndex = requestsData.requests.findIndex((r: any) => r.id === requestId)
    if (requestIndex === -1) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    requestsData.requests[requestIndex].orderStatus = orderStatus
    requestsData.requests[requestIndex].updatedAt = new Date().toISOString()

    if (orderStatus === 'Rejected') {
      requestsData.requests[requestIndex].deliveryStatus = 'Cancelled'
    }

    fs.writeFileSync(requestsPath, JSON.stringify(requestsData, null, 2))

    return NextResponse.json(
      {
        success: true,
        request: requestsData.requests[requestIndex],
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}
