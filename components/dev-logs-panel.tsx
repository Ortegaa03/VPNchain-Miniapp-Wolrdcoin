'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Terminal, RefreshCw, Copy, Check } from 'lucide-react'
import { APP_CONFIG } from '@/lib/config'
import { useToast } from '@/hooks/use-toast'

type LogEntry = {
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export function DevLogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!APP_CONFIG.DEBUG_MODE) return

    const originalLog = console.log
    const originalError = console.error
    const originalWarn = console.warn
    const originalInfo = console.info

    const addLog = (level: LogEntry['level'], ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ')
      
      const timestamp = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })
      setLogs(prev => [...prev, { timestamp, level, message }])
    }

    console.log = (...args) => {
      originalLog(...args)
      if (args[0]?.includes?.('[v0]')) {
        addLog('info', ...args)
      }
    }

    console.error = (...args) => {
      originalError(...args)
      if (args[0]?.includes?.('[v0]')) {
        addLog('error', ...args)
      }
    }

    console.warn = (...args) => {
      originalWarn(...args)
      if (args[0]?.includes?.('[v0]')) {
        addLog('warning', ...args)
      }
    }
    
    console.info = (...args) => {
      originalInfo(...args)
      if (args[0]?.includes?.('[v0]')) {
        addLog('info', ...args)
      }
    }

    return () => {
      console.log = originalLog
      console.error = originalError
      console.warn = originalWarn
      console.info = originalInfo
    }
  }, [])

  const copyAllLogs = () => {
    const allLogsText = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n')
    
    navigator.clipboard.writeText(allLogsText).then(() => {
      setCopied(true)
      toast({
        title: 'Logs copiados',
        description: `${logs.length} entradas copiadas al portapapeles`,
      })
      setTimeout(() => setCopied(false), 2000)
    }).catch((err) => {
      console.error('Failed to copy logs:', err)
      toast({
        title: 'Error',
        description: 'No se pudieron copiar los logs',
        variant: 'destructive'
      })
    })
  }

  if (!APP_CONFIG.DEBUG_MODE) return null

  return (
    <>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 rounded-full h-12 w-12 p-0 shadow-lg"
        variant="default"
      >
        <Terminal className="h-5 w-5" />
      </Button>

      {isOpen && (
        <Card className="fixed bottom-20 right-4 z-50 w-[90vw] max-w-2xl h-[500px] bg-black/95 border-primary/30 backdrop-blur-sm shadow-2xl">
          <div className="flex items-center justify-between p-3 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" />
              <h3 className="font-mono text-sm font-bold text-primary">DEV LOGS PANEL</h3>
              <span className="text-xs text-muted-foreground">
                ({logs.length} {logs.length === 1 ? 'entrada' : 'entradas'})
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={copyAllLogs}
                disabled={logs.length === 0}
                className="h-7 px-2 text-xs"
                title="Copiar todos los logs"
              >
                {copied ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                <span className="hidden sm:inline">Copiar todo</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setLogs([])}
                className="h-7 w-7 p-0"
                title="Limpiar logs"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 p-0"
                title="Cerrar"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="p-3 h-[calc(100%-60px)] overflow-y-auto font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Terminal className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No hay logs todavía</p>
                <p className="text-[10px] mt-1">Esperando actividad...</p>
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    log.level === 'error' ? 'bg-red-500/10 text-red-400 border-l-2 border-red-500' :
                    log.level === 'warning' ? 'bg-yellow-500/10 text-yellow-400 border-l-2 border-yellow-500' :
                    log.level === 'success' ? 'bg-green-500/10 text-green-400 border-l-2 border-green-500' :
                    'bg-blue-500/10 text-blue-400 border-l-2 border-blue-500'
                  }`}
                >
                  <span className="text-muted-foreground text-[10px]">
                    [{log.timestamp}]
                  </span>{' '}
                  <span className="font-bold uppercase text-[10px]">
                    [{log.level}]
                  </span>{' '}
                  <span className="whitespace-pre-wrap break-all">
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </>
  )
}
