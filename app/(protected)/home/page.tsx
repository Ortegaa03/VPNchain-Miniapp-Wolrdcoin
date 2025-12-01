'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { MobileNav } from '@/components/mobile-nav'
import { DevLogsPanel } from '@/components/dev-logs-panel'
import { WalletDashboard } from '@/components/wallet-dashboard'
import { Loader2 } from 'lucide-react'
import { clearGuestData, isGuestUser, getWorldUser, fetchWorldUserDetails, type WorldUser } from '@/lib/storage-utils'

type UserType = 'guest' | 'user' | 'admin'

export default function HomePage() {
  const [worldUser, setWorldUser] = useState<WorldUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initUser = async () => {
      console.log('[v0] HOME: Initializing user data...')
      
      try {
        console.log('[v0] HOME: Calling getWorldUser()...')
        let user = getWorldUser()
        console.log('[v0] HOME: getWorldUser() returned:', JSON.stringify(user, null, 2))
        
        if (user) {
          console.log('[v0] HOME: Setting initial user state:', user.walletAddress)
          setWorldUser(user)
          
          console.log('[v0] HOME: Fetching detailed user info...')
          if (user.username && user.username.includes('...')) {
            const detailedUser = await fetchWorldUserDetails()
            if (detailedUser) {
              console.log('[v0] HOME: Updated with detailed info')
              setWorldUser(detailedUser)
            }
          }
        } else {
          console.log('[v0] HOME: No World user found in storage or MiniKit')
        }
      } catch (error) {
        console.error('[v0] HOME: Error initializing user:', error)
        console.error('[v0] HOME: Error details:', (error as Error).message)
      } finally {
        console.log('[v0] HOME: Setting isLoading to false')
        setIsLoading(false)
      }
    }

    initUser()
    
    const handleUnload = () => {
      if (isGuestUser()) {
        console.log('[v0] HOME: Page unloading, clearing guest data')
        clearGuestData()
      }
    }
    
    window.addEventListener('beforeunload', handleUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background pb-16">
        <Header />
        <div className="container mx-auto px-3 py-8 max-w-md">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
        <MobileNav />
        <DevLogsPanel />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pb-16 overflow-x-hidden">
      <Header worldUser={worldUser} />
      <div className="container mx-auto px-3 py-3 max-w-md">
        <WalletDashboard worldUser={worldUser} />
      </div>
      <MobileNav />
      <DevLogsPanel />
    </main>
  )
}
