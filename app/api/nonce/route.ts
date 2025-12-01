import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    // Generate a random nonce (at least 8 alphanumeric characters)
    const nonce = crypto.randomUUID().replace(/-/g, '')
    
    console.log('[v0] API: Generated nonce:', nonce)
    
    // Store nonce in secure cookie
    const cookieStore = await cookies()
    cookieStore.set('siwe', nonce, { 
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 10, // 10 minutes
    })
    
    return NextResponse.json({ nonce })
  } catch (error) {
    console.error('[v0] API: Error generating nonce:', error)
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    )
  }
}
