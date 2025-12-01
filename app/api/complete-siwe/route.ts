import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { MiniAppWalletAuthSuccessPayload, verifySiweMessage } from '@worldcoin/minikit-js'

interface IRequestPayload {
  payload: MiniAppWalletAuthSuccessPayload
  nonce: string
}

export async function POST(req: NextRequest) {
  try {
    const { payload, nonce } = (await req.json()) as IRequestPayload
    
    console.log('[v0] API: Verifying SIWE message...')
    console.log('[v0] API: Payload address:', payload.address)
    
    // Verify nonce matches
    const cookieStore = await cookies()
    const storedNonce = cookieStore.get('siwe')?.value
    
    if (nonce !== storedNonce) {
      console.error('[v0] API: Nonce mismatch')
      return NextResponse.json({
        status: 'error',
        isValid: false,
        message: 'Invalid nonce',
      }, { status: 400 })
    }
    
    // Verify the SIWE message
    const validMessage = await verifySiweMessage(payload, nonce)
    
    if (validMessage.isValid) {
      console.log('[v0] API: SIWE verification successful')
      
      // Clear the nonce cookie
      cookieStore.delete('siwe')
      
      return NextResponse.json({
        status: 'success',
        isValid: true,
      })
    } else {
      console.error('[v0] API: SIWE verification failed')
      return NextResponse.json({
        status: 'error',
        isValid: false,
        message: 'Invalid signature',
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[v0] API: Error verifying SIWE:', error)
    return NextResponse.json({
      status: 'error',
      isValid: false,
      message: error.message || 'Verification failed',
    }, { status: 500 })
  }
}
