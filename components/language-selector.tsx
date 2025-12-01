'use client'

import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/lib/translations'

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 backdrop-blur-sm bg-card/50 hover:bg-card border-border/50 hover:border-primary/30 transition-all duration-200 cursor-pointer"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="backdrop-blur-xl bg-card/95">
        <DropdownMenuItem 
          onClick={() => setLanguage('es')}
          className={`cursor-pointer ${language === 'es' ? 'bg-primary/10' : ''}`}
        >
          <span className="font-medium">ES Español</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('en')}
          className={`cursor-pointer ${language === 'en' ? 'bg-primary/10' : ''}`}
        >
          <span className="font-medium">EN English</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
