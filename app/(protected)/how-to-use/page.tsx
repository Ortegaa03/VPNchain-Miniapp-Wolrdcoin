'use client'

import { Header } from '@/components/header'
import { MobileNav } from '@/components/mobile-nav'
import { HowToUseContent } from '@/components/how-to-use-content'
import { DevLogsPanel } from '@/components/dev-logs-panel'
import { useLanguage } from '@/lib/translations'

export default function HowToUsePage() {
  const { t } = useLanguage()

  return (
    <main className="min-h-screen bg-background pb-16">
      <Header showBack backHref="/home" />
      <div className="container mx-auto px-3 py-8 max-w-md">
        <h1 className="text-3xl font-bold mb-6">{t('howto.title')}</h1>
        <HowToUseContent />
      </div>
      <MobileNav />
      <DevLogsPanel />
    </main>
  )
}
