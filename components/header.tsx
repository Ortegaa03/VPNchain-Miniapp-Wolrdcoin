'use client'

import { Shield, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSelector } from './language-selector'
import { useLanguage } from '@/lib/translations'
import { useRouter } from 'next/navigation'

type HeaderProps = {
  showBack?: boolean
  backHref?: string
  worldUser?: {
    walletAddress: string
    username?: string
  } | null
}

export function Header({ showBack, backHref, worldUser }: HeaderProps) {
  const router = useRouter()
  const { t } = useLanguage()

  return (
    <>
      <header className="border-b border-border/40 backdrop-blur-2xl bg-card/40 sticky top-0 z-50 shadow-lg shadow-black/5">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10">
                <Shield className="h-6 w-6 text-primary drop-shadow-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">VPNchain</h1>
                <p className="text-xs text-muted-foreground">Privacy Protocol</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <LanguageSelector />
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/how-to-use')}
                className="gap-2 backdrop-blur-sm bg-card/50 hover:bg-card border-border/50 hover:border-primary/30 transition-all duration-200 cursor-pointer"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">{t('header.howToUse')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>
    </>
  )
}
