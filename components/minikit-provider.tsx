'use client'

import { type ReactNode, useEffect } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'

export default function MiniKitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize MiniKit
    MiniKit.install()
    
    const isInstalled = MiniKit.isInstalled()
    console.log('[v0] MINIKIT: Installed:', isInstalled)
    
    if (isInstalled) {
      console.log('[v0] MINIKIT: Running in World App')
      
      // Get wallet address if available
      const walletAddress = MiniKit.walletAddress
      if (walletAddress) {
        console.log('[v0] MINIKIT: Wallet address available:', walletAddress)
      }
    }
  }, [])

  return <>{children}</>
}
