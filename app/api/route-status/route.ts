import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { APP_CONFIG, validatePublicConfig } from '@/lib/config'
import { VPNCHAIN_ROUTER_V6_ABI } from '@/lib/contract-abi'

const RPC_URL = APP_CONFIG.RPC_URL
const CONTRACT_ADDRESS = APP_CONFIG.CONTRACT_ADDRESS

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    validatePublicConfig()
    
    const { routeId } = await request.json()
    
    if (!routeId) {
      return NextResponse.json({ error: 'Route ID required' }, { status: 400 })
    }
    
    console.log('[v0] ROUTE-STATUS: Fetching status for route:', routeId)
    
    if (!RPC_URL || !CONTRACT_ADDRESS) {
      console.error('[v0] ROUTE-STATUS: Missing RPC_URL or CONTRACT_ADDRESS')
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }
    
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, VPNCHAIN_ROUTER_V6_ABI, provider) as any
    
    // Fetch basic metadata
    const [
      _routeIdBasic,
      amount,
      sender,
      receiver,
      token,
      createdAt,
      nextStepTime
    ] = await contract.getRouteMetaBasic(routeId)
    
    // Fetch progress metadata
    const [
      _routeIdProgress,
      totalSteps,
      completedSteps,
      completed,
      avgDelay,
      isSecure,
      completedAt
    ] = await contract.getRouteMetaProgress(routeId)
    
    // Get estimated remaining time
    const estimatedRemainingSeconds = await contract.estimateRemainingTime(routeId)
    
    console.log('[v0] ROUTE-STATUS: Route data:', {
      routeId,
      amount: amount.toString(),
      sender,
      receiver,
      token,
      totalSteps: totalSteps.toString(),
      completedSteps: completedSteps.toString(),
      completed,
      isSecure,
      estimatedRemainingSeconds: estimatedRemainingSeconds.toString()
    })
    
    return NextResponse.json({
      status: {
        routeId: routeId.toString(),
        amount: amount.toString(),
        sender,
        receiver,
        token,
        createdAt: Number(createdAt),
        nextStepTime: Number(nextStepTime),
        totalSteps: Number(totalSteps),
        completedSteps: Number(completedSteps),
        completed,
        avgDelay: Number(avgDelay),
        isSecure,
        completedAt: Number(completedAt),
        estimatedRemainingSeconds: Number(estimatedRemainingSeconds)
      }
    }, { status: 200 })
    
  } catch (error: any) {
    console.error('[v0] ROUTE-STATUS: Error fetching route status:', error)
    console.error('[v0] ROUTE-STATUS: Error message:', error.message)
    return NextResponse.json({ 
      error: 'Failed to fetch route status',
      details: error.message 
    }, { status: 500 })
  }
}
