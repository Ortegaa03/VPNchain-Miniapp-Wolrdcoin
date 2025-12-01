'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react'

type NotificationType = 'waiting' | 'processing' | 'success' | 'error'

type NotificationToastProps = {
  type: NotificationType
  message: string
  show: boolean
}

export function NotificationToast({ type, message, show }: NotificationToastProps) {
  const icons = {
    waiting: <Clock className="h-5 w-5 text-yellow-500" />,
    processing: <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />,
    success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
    error: <AlertCircle className="h-5 w-5 text-red-500" />,
  }

  const backgrounds = {
    waiting: 'bg-yellow-500/10 border-yellow-500/20',
    processing: 'bg-blue-500/10 border-blue-500/20',
    success: 'bg-green-500/10 border-green-500/20',
    error: 'bg-red-500/10 border-red-500/20',
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm ${backgrounds[type]} shadow-lg`}
        >
          {icons[type]}
          <span className="text-sm font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
