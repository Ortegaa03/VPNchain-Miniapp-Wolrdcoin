'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2, Edit2, ArrowRight, Zap, Shield, Clock, HelpCircle } from 'lucide-react'
import type { TransactionData } from '@/app/page'
import type { SwapData } from '@/components/swap-form'
import { APP_CONFIG } from '@/lib/config'
import { useLanguage } from '@/lib/translations'
import { getTokenByAddress, getTokenBySymbol } from '@/lib/tokens-config'
import Image from 'next/image'

type ConfirmationStepProps = {
  data: TransactionData
  onConfirm: () => void
  onEdit: () => void
  isSwap?: boolean
  swapData?: SwapData
}

export function ConfirmationStep({ data, onConfirm, onEdit, isSwap = false, swapData }: ConfirmationStepProps) {
  const { t } = useLanguage()
  const commissionAmount = (data.amount * APP_CONFIG.COMMISSION_PERCENTAGE) / 100
  const finalAmount = data.amount - commissionAmount

  const wldToken = getTokenBySymbol('WLD')
  
  const tokenToBuy = isSwap && swapData ? getTokenByAddress(swapData.tokenToBuy) : null

  const getTokenIcon = () => {
    if (isSwap && wldToken) {
      return wldToken.icon
    }
    const configToken = getTokenByAddress(data.tokenAddress || '')
    if (configToken) {
      return configToken.icon
    }
    return null
  }

  const tokenIcon = getTokenIcon()

  return (
    <Card className="bg-[#0D111C]/95 backdrop-blur-xl border-2 border-border/60 p-6 shadow-2xl shadow-primary/20 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-border/50">
        <CheckCircle2 className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">{t('confirm.title')}</h2>
      </div>

      <div className="space-y-4">
        <div className="bg-[#191B1F]/95 border-2 border-border/50 rounded-xl p-4 space-y-2 shadow-lg">
          <p className="text-sm text-muted-foreground">{t('confirm.transferMode')}</p>
          <div className="flex items-center gap-3">
            {data.transferMode === 'instant' ? (
              <>
                <Zap className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">{t('send.instantMode')}</p>
                  <p className="text-xs text-muted-foreground">{t('send.instantModeDesc')}</p>
                </div>
              </>
            ) : (
              <>
                <Shield className="h-6 w-6 text-primary" />
                <div>
                  <p className="font-semibold">{t('send.secureMode')}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{t('send.secureModeDesc')}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="bg-[#191B1F]/95 border-2 border-border/50 rounded-xl p-4 space-y-2 shadow-lg">
          <p className="text-sm text-muted-foreground">
            {isSwap ? 'Enviar' : t('confirm.amountToSend')}
          </p>
          <div className="flex items-center gap-3">
            {tokenIcon ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden bg-background flex items-center justify-center shrink-0">
                <Image 
                  src={tokenIcon || "/placeholder.svg"} 
                  alt={isSwap ? 'WLD' : data.tokenSymbol} 
                  width={32}
                  height={32}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <p className="text-3xl font-bold">
              {isSwap ? data.amount : data.amount} {isSwap ? 'WLD' : data.tokenSymbol}
            </p>
          </div>
          {!isSwap && APP_CONFIG.COMMISSION_PERCENTAGE > 0 && (
            <div className="mt-3 pt-3 border-t border-border/30 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('send.commission')} ({APP_CONFIG.COMMISSION_PERCENTAGE}%)</span>
                <span className="text-muted-foreground">-{commissionAmount.toFixed(2)} {data.tokenSymbol}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span>{t('confirm.recipientWillReceive')}</span>
                <span className="text-primary">{finalAmount.toFixed(2)} {data.tokenSymbol}</span>
              </div>
            </div>
          )}
        </div>

        {isSwap && swapData && tokenToBuy && (
          <div className="bg-[#191B1F]/95 border-2 border-primary/50 rounded-xl p-4 space-y-2 shadow-lg shadow-primary/10">
            <p className="text-sm text-muted-foreground">Recibir (estimado)</p>
            <div className="flex items-center gap-3">
              {tokenToBuy.icon ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden bg-background flex items-center justify-center shrink-0">
                  <Image 
                    src={tokenToBuy.icon || "/placeholder.svg"} 
                    alt={tokenToBuy.symbol} 
                    width={32}
                    height={32}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <p className="text-3xl font-bold text-primary">
                ~{swapData.estimatedAmount} {swapData.tokenSymbol}
              </p>
            </div>
          </div>
        )}

        {isSwap && (
          <div className="bg-[#191B1F]/95 border-2 border-border/50 rounded-xl p-4 space-y-2 shadow-lg">
            <p className="text-sm text-muted-foreground">Wallet remitente (Tu wallet)</p>
            <p className="text-sm font-mono break-all">{data.to}</p>
          </div>
        )}

        <div className="bg-[#191B1F]/95 border-2 border-border/50 rounded-xl p-4 space-y-2 shadow-lg">
          <p className="text-sm text-muted-foreground">
            {isSwap ? 'Wallet destinatario final' : t('confirm.finalDestination')}
          </p>
          <p className="text-sm font-mono break-all">
            {isSwap ? data.to : data.recipient}
          </p>
        </div>

        <div className="bg-primary/15 border-2 border-primary/30 rounded-xl p-4 shadow-lg shadow-primary/10">
          <p className="text-sm text-center">
            🔒 {t('confirm.privacyNotice')}
          </p>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          onClick={onEdit}
          variant="outline"
          size="lg"
          className="flex-1 rounded-xl h-14"
        >
          <Edit2 className="h-4 w-4 mr-2" />
          {t('confirm.edit')}
        </Button>
        <Button
          onClick={onConfirm}
          size="lg"
          className="flex-1 rounded-xl h-14"
        >
          {t('confirm.confirmSend')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </Card>
  )
}
