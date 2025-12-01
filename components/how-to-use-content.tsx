'use client'

import { Shield, Send, ArrowLeftRight, Lock, Zap, CheckCircle2 } from 'lucide-react'
import { useLanguage } from '@/lib/translations'

export function HowToUseContent() {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-bold">Bienvenido a VPNchain</h2>
        </div>
        <p className="text-muted-foreground text-sm leading-relaxed">
          VPNchain es un protocolo de privacidad que te permite enviar tokens WLD de forma segura y privada. Tus transacciones son enrutadas a través de nuestra red para mantener tu privacidad.
        </p>
      </div>

      {/* How to Send */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Send className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold">Cómo Enviar Tokens</h2>
        </div>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Selecciona el token</p>
              <p className="text-muted-foreground text-xs">Elige el token que deseas enviar desde tu wallet</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Ingresa la dirección destino</p>
              <p className="text-muted-foreground text-xs">Pega la dirección de wallet del receptor</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Elige el modo de envío</p>
              <p className="text-muted-foreground text-xs">Instantáneo (inmediato) o Seguro (24-48h, más privado)</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">4</span>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Confirma y envía</p>
              <p className="text-muted-foreground text-xs">Revisa los detalles y completa el envío</p>
            </div>
          </div>
        </div>
      </div>

      {/* How to Swap */}
      <div className="glass-card p-6 rounded-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <ArrowLeftRight className="w-6 h-6 text-green-400" />
          </div>
          <h2 className="text-xl font-bold">Cómo Comprar Tokens</h2>
        </div>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">1</span>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Selecciona el token a comprar</p>
              <p className="text-muted-foreground text-xs">Elige el token que deseas adquirir</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">2</span>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Ingresa la cantidad</p>
              <p className="text-muted-foreground text-xs">Define cuánto WLD quieres intercambiar</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">3</span>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Envía WLD a la dirección de pago</p>
              <p className="text-muted-foreground text-xs">Realiza el pago con WLD desde tu wallet</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-primary">4</span>
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Recibe tus tokens</p>
              <p className="text-muted-foreground text-xs">Los tokens comprados se enviarán a tu wallet a través de VPNchain</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Características</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-1">Privacidad Total</p>
              <p className="text-muted-foreground text-xs">Tus transacciones son privadas y no pueden ser rastreadas</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-1">Dos Modos de Envío</p>
              <p className="text-muted-foreground text-xs">Elige entre velocidad o máxima privacidad</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-1">Fácil de Usar</p>
              <p className="text-muted-foreground text-xs">Interfaz simple e intuitiva para todos los usuarios</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm mb-1">Seguro</p>
              <p className="text-muted-foreground text-xs">Protocolo auditado y probado en producción</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Modes */}
      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Modos de Transferencia</h2>
        <div className="space-y-4">
          <div className="border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="font-bold text-sm">Instantáneo</h3>
            </div>
            <p className="text-muted-foreground text-xs mb-2">
              Los tokens se envían de inmediato a través de una ruta rápida. Ideal para transacciones urgentes.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Tiempo: ~5 minutos</span>
            </div>
          </div>
          <div className="border border-border/50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-sm">Seguro</h3>
            </div>
            <p className="text-muted-foreground text-xs mb-2">
              Máxima privacidad. Los tokens pasan por múltiples nodos para garantizar anonimato total.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Tiempo: 24-48 horas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
