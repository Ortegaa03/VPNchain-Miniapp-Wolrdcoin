'use client'

import { AlertTriangle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { APP_CONFIG } from '@/lib/config'

type ErrorModalProps = {
  open: boolean
  onClose: () => void
}

export function ErrorModal({ open, onClose }: ErrorModalProps) {
  const handleContactSupport = () => {
    const subject = encodeURIComponent('Error en transacción VPNchain')
    const body = encodeURIComponent('Hola, he tenido un problema con mi transacción. Por favor ayúdame a recuperar mis fondos.')
    window.open(`mailto:${APP_CONFIG.SUPPORT_EMAIL}?subject=${subject}&body=${body}`, '_blank')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <DialogTitle className="text-lg">Ha ocurrido un error</DialogTitle>
          </div>
          <DialogDescription className="text-sm">
            No se pudo completar tu transacción. Por favor contacta con nuestro equipo de soporte para ayudarte a resolver el problema.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="rounded-xl">
            Cerrar
          </Button>
          <Button onClick={handleContactSupport} className="rounded-xl bg-primary">
            <Mail className="mr-2 h-4 w-4" />
            Contactar soporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
