import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const requestsPath = path.join(process.cwd(), 'data', 'requests.json')
    const requestsData = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'))

    const foundRequest = requestsData.requests.find((req: any) => req.id === id)

    if (!foundRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ request: foundRequest }, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    )
  }
}
