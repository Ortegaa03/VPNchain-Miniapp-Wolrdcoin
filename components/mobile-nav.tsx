'use client'

import { Send, User, ArrowLeftRight, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/translations'

export function MobileNav() {
  const pathname = usePathname()
  const { t } = useLanguage()

  const links = [
    {
      type: 'link' as const,
      href: '/swap',
      label: t('nav.swap'),
      icon: ArrowLeftRight,
    },
    {
      type: 'link' as const,
      href: '/home',
      label: t('nav.dashboard'),
      icon: Home,
    },
    {
      type: 'link' as const,
      href: '/send',
      label: t('nav.send'),
      icon: Send,
    },
  ]

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
        <div className="max-w-[420px] mx-auto px-6 pb-4">
          <div className="liquid-glass-nav rounded-[28px] px-2 py-2.5 shadow-2xl">
            <div className="flex items-center justify-center gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href
                const Icon = link.icon
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`
                      relative flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2.5 px-3 transition-all duration-300 rounded-2xl group
                      ${isActive 
                        ? 'text-white' 
                        : 'text-muted-foreground hover:text-foreground active:scale-95'
                      }
                    `}
                  >
                    {isActive && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary/70 rounded-2xl shadow-lg shadow-primary/30" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-2xl" />
                      </>
                    )}
                    <div className="relative">
                      <Icon 
                        className={`h-[22px] w-[22px] flex-shrink-0 relative z-10 transition-all duration-300 ${isActive ? '' : 'group-hover:scale-110'}`}
                        strokeWidth={isActive ? 2.2 : 1.8}
                      />
                    </div>
                    <span className={`text-[10px] leading-tight truncate max-w-full relative z-10 transition-all duration-300 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {link.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}
