'use client'

import { Header } from '@/components/header'
import { MobileNav } from '@/components/mobile-nav'
import { SendForm } from '@/components/send-form'
import { DevLogsPanel } from '@/components/dev-logs-panel'

export default function SendPage() {
  return (
    <main className="min-h-screen bg-background pb-16">
      <Header showBack backHref="/home" />
      <div className="container mx-auto px-3 py-3 max-w-md">
        <SendForm />
      </div>
      <MobileNav />
      <DevLogsPanel />
    </main>
  )
}
