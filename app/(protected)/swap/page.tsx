'use client'

import { Header } from '@/components/header'
import { MobileNav } from '@/components/mobile-nav'
import { SwapForm } from '@/components/swap-form'
import { DevLogsPanel } from '@/components/dev-logs-panel'

export default function SwapPage() {
  return (
    <main className="min-h-screen bg-background pb-16">
      <Header showBack backHref="/home" />
      <div className="container mx-auto px-3 py-3 max-w-md">
        <SwapForm />
      </div>
      <MobileNav />
      <DevLogsPanel />
    </main>
  )
}
