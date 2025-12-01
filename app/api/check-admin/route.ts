import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    
    const adminId = process.env.ADMIN_USER_ID
    
    if (!adminId) {
      console.error('[v0] CHECK-ADMIN: ADMIN_USER_ID not configured in environment variables')
      return NextResponse.json({ isAdmin: false }, { status: 200 })
    }
    
    console.log('[v0] CHECK-ADMIN: Checking user:', userId)
    console.log('[v0] CHECK-ADMIN: Against admin ID:', adminId)
    console.log('[v0] CHECK-ADMIN: User ID type:', typeof userId)
    console.log('[v0] CHECK-ADMIN: Admin ID type:', typeof adminId)
    
    // Compare as strings to ensure proper comparison
    const isAuthorized = String(userId) === String(adminId)
    
    console.log('[v0] CHECK-ADMIN: Authorization result:', isAuthorized)
    
    return NextResponse.json({ isAdmin: isAuthorized }, { status: 200 })
  } catch (error) {
    console.error('[v0] CHECK-ADMIN: Error checking authorization:', error)
    return NextResponse.json({ isAdmin: false }, { status: 500 })
  }
}
