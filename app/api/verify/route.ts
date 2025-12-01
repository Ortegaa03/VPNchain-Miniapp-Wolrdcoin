import { NextRequest, NextResponse } from 'next/server'
import { verifyCloudProof, IVerifyResponse, ISuccessResult } from '@worldcoin/minikit-js'

interface IRequestPayload {
  payload: ISuccessResult
  action: string
  signal?: string
}

export async function POST(req: NextRequest) {
  try {
    const { payload, action, signal } = (await req.json()) as IRequestPayload
    
    // Get app_id from environment variable
    const app_id = process.env.NEXT_PUBLIC_WORLD_APP_ID as `app_${string}`
    
    if (!app_id) {
      console.error('[v0] API: NEXT_PUBLIC_WORLD_APP_ID not configured')
      return NextResponse.json(
        { error: 'World App ID not configured' },
        { status: 500 }
      )
    }
    
    console.log('[v0] API: Verifying World ID proof...')
    console.log('[v0] API: Action:', action)
    console.log('[v0] API: App ID:', app_id)
    
    // Verify the proof using World ID Cloud
    const verifyRes = (await verifyCloudProof(
      payload,
      app_id,
      action,
      signal
    )) as IVerifyResponse
    
    if (verifyRes.success) {
      console.log('[v0] API: World ID verification successful')
      return NextResponse.json({ 
        verifyRes, 
        status: 200 
      })
    } else {
      console.error('[v0] API: World ID verification failed:', verifyRes)
      return NextResponse.json({ 
        verifyRes, 
        status: 400 
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[v0] API: Error verifying proof:', error)
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    )
  }
}
