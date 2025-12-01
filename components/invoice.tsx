'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Copy, ExternalLink, CheckCircle, AlertTriangle, Clock, HelpCircle, Zap, Shield } from 'lucide-react'
import { NotificationToast } from './notification-toast'
import { shortenAddress } from '@/lib/utils'
import type { TransactionData } from '@/app/page'
import { TransactionTracker } from './transaction-tracker'
import { useLanguage } from '@/lib/translations'
import { useToast } from '@/hooks/use-toast'
import { APP_CONFIG } from '@/lib/config'
import { getTokenByAddress, getTokenBySymbol } from '@/lib/tokens-config'
import Image from 'next/image'

export interface SwapData {
  amountWLD: number
  tokenToBuy: string
  tokenSymbol: string
  tokenDecimals: number
  recipientWallet: string
  estimatedAmount: number
}

type InvoiceProps = {
  data: TransactionData
  onBack: () => void
  onError: () => void
  isSwap?: boolean
  swapData?: SwapData
}

type NotificationType = 'waiting' | 'processing' | 'success' | 'error' | 'refunding'

const CONTRACT_ADDRESS = APP_CONFIG.CONTRACT_ADDRESS
const SUPPORT_WALLET = '0x52f0c6ec1f6258b7247db7f6ed951c3a2129bc3e'
const WLD_TOKEN_ADDRESS = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003'

export function Invoice({ data, onBack, onError, isSwap = false, swapData }: InvoiceProps) {
  const [status, setStatus] = useState<NotificationType>('waiting')
  const [timeLeft, setTimeLeft] = useState(600)
  const [notificationMessage, setNotificationMessage] = useState(
    isSwap ? 'Esperando tu pago de WLD...' : 'Esperando tu transferencia...'
  )
  const [copiedSender, setCopiedSender] = useState(false)
  const [copiedRecipient, setCopiedRecipient] = useState(false)
  const [copiedContract, setCopiedContract] = useState(false)
  const [trackerStep, setTrackerStep] = useState(0)
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
  const [transferId, setTransferId] = useState<string | null>(null)
  const [failedTxHash, setFailedTxHash] = useState<string | null>(null)
  const { t } = useLanguage()
  const { toast } = useToast()

  const sendTelegramNotification = async (message: string) => {
    try {
      const WebApp = (window as any).Telegram?.WebApp
      const userId = WebApp?.initDataUnsafe?.user?.id

      if (!userId) {
        console.log('[v0] Telegram user ID not available, skipping notification')
        return
      }

      await fetch('/api/telegram-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          message,
          parseMode: 'Markdown',
        }),
      })
    } catch (error) {
      console.error('[v0] Error sending Telegram notification:', error)
    }
  }

  useEffect(() => {
    const checkTransaction = async () => {
      if (status !== 'waiting') return

      try {
        if (isSwap && swapData) {
          console.log('[v0] SWAP INVOICE: ==========================================')
          console.log('[v0] SWAP INVOICE: Starting swap payment monitoring')
          console.log('[v0] SWAP INVOICE: Sender wallet (user):', data.sender)
          console.log('[v0] SWAP INVOICE: Support wallet (recipient):', SUPPORT_WALLET)
          console.log('[v0] SWAP INVOICE: Amount WLD:', swapData.amountWLD)
          console.log('[v0] SWAP INVOICE: WLD Token Address:', WLD_TOKEN_ADDRESS)
          console.log('[v0] SWAP INVOICE: Session ID:', sessionId)
          
          const response = await fetch('/api/monitor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sender: data.sender,
              to: SUPPORT_WALLET,
              amount: swapData.amountWLD,
              sessionId,
              tokenAddress: WLD_TOKEN_ADDRESS,
              tokenDecimals: 18
            }),
          })
          const result = await response.json()
          
          console.log('[v0] SWAP INVOICE: Swap monitoring result:', result)
          
          if (result.detected) {
            console.log('[v0] SWAP INVOICE: ✅ Payment detected!')
            setTrackerStep(1)
            setStatus('processing')
            setNotificationMessage('Pago confirmado! Verificando rutas DEX...')
            
            await sendTelegramNotification(
              `✅ *Pago confirmado para swap*\n\n` +
              `💰 Monto: ${swapData.amountWLD} WLD\n` +
              `🔄 Comprando: ${swapData.tokenSymbol}\n` +
              `🏦 Destinatario: \`${shortenAddress(swapData.recipientWallet, 6)}\`\n\n` +
              `⏳ Buscando mejor ruta en DEX...`
            )
            
            await new Promise(resolve => setTimeout(resolve, 2000))
            setTrackerStep(2)
            setNotificationMessage('Ejecutando swap...')
            
            try {
              const swapResponse = await fetch('/api/swap', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(swapData),
              })
              
              if (!swapResponse.ok) {
                const errorText = await swapResponse.text()
                let errorData
                try {
                  errorData = JSON.parse(errorText)
                } catch {
                  errorData = { error: errorText || `HTTP ${swapResponse.status}` }
                }
                throw new Error(errorData.error || 'Swap failed')
              }
              
              const swapResult = await swapResponse.json()
              
              if (!swapResult.success) {
                if (swapResult.refunded) {
                  setTrackerStep(3)
                  setStatus('error')
                  setNotificationMessage('Swap no disponible - WLD reembolsado')
                  
                  toast({
                    title: 'Swap no disponible',
                    description: `No hay liquidez para ${swapData.tokenSymbol}. Se reembolsaron ${swapData.amountWLD} WLD a tu wallet.`,
                    variant: 'destructive',
                  })

                  await sendTelegramNotification(
                    `⚠️ *Swap fallido - Reembolso exitoso*\n\n` +
                    `💰 Monto: ${swapData.amountWLD} WLD\n` +
                    `🔄 Token solicitado: ${swapData.tokenSymbol}\n` +
                    `🏦 Reembolsado a: \`${shortenAddress(swapData.recipientWallet, 6)}\`\n` +
                    `🔗 TX Reembolso: \`${swapResult.refundTxHash}\`\n\n` +
                    `⚠️ Razón: ${swapResult.error}\n\n` +
                    `💡 El token no tiene liquidez suficiente en Uniswap.`
                  )
                  
                  setTimeout(() => onError(), 3000)
                  return
                }
                
                throw new Error(swapResult.error || 'Swap execution failed')
              }
              
              if (swapResult.success) {
                setTrackerStep(3)
                
                setTrackerStep(4)
                await new Promise(resolve => setTimeout(resolve, 1000))
                setTrackerStep(5)
                setStatus('success')
                setNotificationMessage('Swap y routing completados!')
                
                if (swapResult.routeId) {
                  setTransferId(swapResult.routeId)
                }
                
                toast({
                  title: t('invoice.swapCompleted'),
                  description: `${swapResult.tokensReceived} ${swapResult.tokenSymbol} entregados via ${swapResult.swapMethod}`,
                })

                const historyItem = {
                  id: swapResult.routeId || `swap-${Date.now()}`,
                  amount: swapResult.tokensReceived,
                  sender: data.sender,
                  recipient: swapData.recipientWallet,
                  mode: 'instant',
                  timestamp: Date.now(),
                  txHash: swapResult.routeTxHash || swapResult.swapTxHash,
                  swapTxHash: swapResult.swapTxHash,
                  depositTxHash: swapResult.depositTxHash,
                  routeTxHash: swapResult.routeTxHash,
                  status: 'completed',
                  tokenAddress: swapData.tokenToBuy,
                  tokenSymbol: swapData.tokenSymbol,
                  tokenDecimals: swapData.tokenDecimals,
                  isSwap: true,
                  swapDetails: {
                    amountWLD: swapData.amountWLD,
                    swapMethod: swapResult.swapMethod,
                    swapPath: swapResult.swapPath,
                  }
                }
                
                const history = JSON.parse(localStorage.getItem('vpnchain_history') || '[]')
                history.unshift(historyItem)
                localStorage.setItem('vpnchain_history', JSON.stringify(history.slice(0, 50)))
                console.log('[v0] SWAP INVOICE: Saved to history with routing:', historyItem)

                await sendTelegramNotification(
                  `🎉 *Swap completado exitosamente*\n\n` +
                  `💰 Pagaste: ${swapData.amountWLD} WLD\n` +
                  `🎁 Recibiste: ${swapResult.tokensReceived} ${swapResult.tokenSymbol}\n` +
                  `🏦 En wallet: \`${shortenAddress(swapData.recipientWallet, 6)}\`\n` +
                  `🔄 Método: ${swapResult.swapMethod}\n` +
                  `📍 Ruta: ${swapResult.swapPath}\n` +
                  `🆔 Route ID: \`${swapResult.routeId || 'N/A'}\`\n` +
                  `🔗 Swap TX: \`${swapResult.swapTxHash}\`\n` +
                  `🔗 Route TX: \`${swapResult.routeTxHash}\`\n\n` +
                  `✅ Transacción completada via VPN Chain routing!`
                )
              }
            } catch (swapError: any) {
              console.error('[v0] SWAP INVOICE: Swap execution failed')
              console.error('[v0] SWAP INVOICE: Error message:', swapError.message || 'Unknown error')
              console.error('[v0] SWAP INVOICE: Error name:', swapError.name)
              console.error('[v0] SWAP INVOICE: Full error:', JSON.stringify(swapError, Object.getOwnPropertyNames(swapError)))
              
              setStatus('error')
              
              const errorMessage = swapError.message || 'Error desconocido en el swap'
              
              toast({
                title: t('error.title'),
                description: errorMessage,
                variant: 'destructive',
              })

              await sendTelegramNotification(
                `❌ *Swap fallido*\n\n` +
                `💰 Monto: ${swapData.amountWLD} WLD\n` +
                `🔄 Token: ${swapData.tokenSymbol}\n\n` +
                `⚠️ Error: ${errorMessage}\n\n` +
                `📞 Contacta soporte: info.worldbuilders@gmail.com`
              )

              setTimeout(() => onError(), 3000)
            }
          } else {
            console.log('[v0] SWAP INVOICE: ⏳ Payment not detected yet')
          }
          console.log('[v0] SWAP INVOICE: ==========================================')
          return
        }

        const response = await fetch('/api/monitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            sessionId,
            tokenAddress: data.tokenAddress,
            tokenDecimals: data.tokenDecimals
          }),
        })
        const result = await response.json()
        
        if (result.incorrectTransfer) {
          setStatus('refunding')
          setNotificationMessage(t('invoice.processingRefund'))
          
          toast({
            title: t('invoice.incorrectAmount'),
            description: `${t('invoice.amountReceived')}: ${parseFloat(result.incorrectTransfer.amount).toFixed(2)} ${data.tokenSymbol}`,
            variant: 'destructive',
          })
          
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          try {
            const refundResponse = await fetch('/api/refund', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: result.incorrectTransfer.amount,
                sender: data.sender,
              }),
            })
            const refundResult = await refundResponse.json()
            
            if (refundResult.success) {
              setStatus('error')
              toast({
                title: t('invoice.refundProcessed'),
                description: `${t('invoice.fundsSentToSupport')}: ${shortenAddress(SUPPORT_WALLET, 6)}`,
                variant: 'destructive',
              })
              setTimeout(() => onError(), 2000)
            } else {
              setStatus('error')
              toast({
                title: t('error.title'),
                description: `${t('invoice.refundError')} ${shortenAddress(SUPPORT_WALLET, 6)}`,
                variant: 'destructive',
              })
              setTimeout(() => onError(), 2000)
            }
          } catch {
            setStatus('error')
            toast({
              title: t('error.title'),
              description: `${t('invoice.processingError')} ${shortenAddress(SUPPORT_WALLET, 6)}`,
              variant: 'destructive',
            })
            setTimeout(() => onError(), 2000)
          }
          return
        }
        
        if (result.detected) {
          setTrackerStep(1)
          setStatus('processing')
          setNotificationMessage(t('invoice.paymentDetected'))
          
          console.log('[v0] Invoice: Payment detected, sending Telegram notification')
          
          await sendTelegramNotification(
            `✅ *${t('invoice.paymentDetectedTitle')}*\n\n` +
            `💰 ${t('invoice.amount')}: ${data.amount} ${data.tokenSymbol}\n` +
            `📤 ${t('invoice.from')}: \`${shortenAddress(data.sender, 6)}\`\n` +
            `🔗 TX Hash: \`${result.txHash || 'procesando'}\`\n\n` +
            `⏳ ${t('invoice.processingWithVPN')}`
          )
          
          await new Promise(resolve => setTimeout(resolve, 2000))
          setTrackerStep(2)
          setNotificationMessage(t('invoice.startingVPN'))
          
          await new Promise(resolve => setTimeout(resolve, 3000))
          setTrackerStep(3)
          setNotificationMessage(t('invoice.routingTransaction'))
          
          console.log('[v0] Invoice: ==========================================')
          console.log('[v0] Invoice: Calling execute API')
          console.log('[v0] Invoice: Request data:', {
            amount: data.amount,
            recipient: data.recipient,
            sender: data.sender,
            transferMode: data.transferMode,
            tokenAddress: data.tokenAddress,
            tokenSymbol: data.tokenSymbol,
            tokenDecimals: data.tokenDecimals
          })
          
          try {
            const executeResponse = await fetch('/api/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...data,
                transferMode: data.transferMode,
                tokenAddress: data.tokenAddress,
                tokenSymbol: data.tokenSymbol,
                tokenDecimals: data.tokenDecimals
              }),
            })
            
            const executeResult = await executeResponse.json()
            
            console.log('[v0] Invoice: Execute API result:', executeResult)
            console.log('[v0] Invoice: Success:', executeResult.success)
            
            if (executeResult.error) {
              console.error('[v0] Invoice: ❌ Execute error:', executeResult.error)
              console.error('[v0] Invoice: Error details:', executeResult.details)
            }
            
            if (executeResult.success) {
              console.log('[v0] Invoice: ✅ Transfer successful!')
              console.log('[v0] Invoice: TX Hash:', executeResult.txHash)
              console.log('[v0] Invoice: Block:', executeResult.blockNumber)
              console.log('[v0] Invoice: Gas used:', executeResult.gasUsed)
              console.log('[v0] Invoice: Transfer ID:', executeResult.transferId)
              
              setTrackerStep(4)
              await new Promise(resolve => setTimeout(resolve, 1000))
              setTrackerStep(5)
              
              const isSecureMode = data.transferMode === 'secure'
              
              if (isSecureMode) {
                setStatus('processing')
                setNotificationMessage(t('invoice.secureInProgress'))
              } else {
                setStatus('success')
                setNotificationMessage(t('invoice.completed'))
              }

              if (executeResult.transferId) {
                setTransferId(executeResult.transferId)
                
                const historyItem = {
                  id: executeResult.transferId,
                  amount: data.amount,
                  sender: data.sender,
                  recipient: data.recipient,
                  mode: data.transferMode,
                  timestamp: Date.now(),
                  txHash: executeResult.txHash,
                  status: isSecureMode ? 'pending' : 'completed',
                  tokenAddress: data.tokenAddress,
                  tokenSymbol: data.tokenSymbol,
                  tokenDecimals: data.tokenDecimals
                }
                
                const history = JSON.parse(localStorage.getItem('vpnchain_history') || '[]')
                history.unshift(historyItem)
                localStorage.setItem('vpnchain_history', JSON.stringify(history.slice(0, 50)))
                console.log('[v0] Invoice: Saved to history:', historyItem)
              }

              if (isSecureMode) {
                toast({
                  title: t('invoice.secureTransferStarted'),
                  description: t('invoice.secureTransferDescription'),
                })
              } else {
                toast({
                  title: t('invoice.transferCompleted'),
                  description: t('invoice.transactionSuccessful'),
                })
              }

              if (isSecureMode) {
                await sendTelegramNotification(
                  `🔐 *${t('invoice.secureTransferStartedTitle')}*\n\n` +
                  `📋 *${t('invoice.invoiceDetails')}:*\n` +
                  `${'═'.repeat(35)}\n` +
                  `💰 ${t('invoice.amountSent')}: ${data.amount} ${data.tokenSymbol}\n` +
                  `👤 ${t('invoice.sender')}: \`${data.sender}\`\n` +
                  `🏦 ${t('invoice.finalRecipient')}: \`${data.recipient}\`\n` +
                  `🆔 Transfer ID: \`${executeResult.transferId || 'N/A'}\`\n` +
                  `🔗 TX Hash: \`${executeResult.txHash || 'Ver en explorador'}\`\n` +
                  `⚡ Mode: Seguro (24-48h)\n\n` +
                  `⏳ ${t('invoice.secureInProgressDescription')}\n` +
                  `📊 Puedes ver el progreso en tu perfil.`
                )
              } else {
                await sendTelegramNotification(
                  `🎉 *${t('invoice.completedTitle')}*\n\n` +
                  `📋 *${t('invoice.invoiceDetails')}:*\n` +
                  `${'═'.repeat(35)}\n` +
                  `💰 ${t('invoice.amountSent')}: ${data.amount} ${data.tokenSymbol}\n` +
                  `👤 ${t('invoice.sender')}: \`${data.sender}\`\n` +
                  `🏦 ${t('invoice.finalRecipient')}: \`${data.recipient}\`\n` +
                  `🆔 Transfer ID: \`${executeResult.transferId || 'N/A'}\`\n` +
                  `🔗 TX Hash: \`${executeResult.txHash || 'Ver en explorador'}\`\n` +
                  `⚡ Mode: Instantáneo\n\n` +
                  `✅ ${t('invoice.fundsDelivered')}`
                )
              }
            } else {
              console.error('[v0] Invoice: ❌ Transfer failed')
              console.error('[v0] Invoice: Error:', executeResult.error)
              console.error('[v0] Invoice: Full result:', executeResult)
              
              setStatus('error')
              
              const errorMsg = executeResult.error || executeResult.details?.message || 'Error desconocido'
              const txHash = executeResult.txHash || result.txHash || `failed-${Date.now()}`
              
              const failedHistoryItem = {
                id: executeResult.transferId || `failed-${Date.now()}`,
                amount: data.amount,
                sender: data.sender,
                recipient: data.recipient,
                mode: data.transferMode,
                timestamp: Date.now(),
                txHash: txHash,
                status: 'failed',
                errorMessage: errorMsg,
                tokenAddress: data.tokenAddress,
                tokenSymbol: data.tokenSymbol,
                tokenDecimals: data.tokenDecimals
              }
              
              const history = JSON.parse(localStorage.getItem('vpnchain_history') || '[]')
              history.unshift(failedHistoryItem)
              localStorage.setItem('vpnchain_history', JSON.stringify(history.slice(0, 50)))
              console.log('[v0] Invoice: Saved failed transfer to history:', failedHistoryItem)
              
              toast({
                title: t('error.title'),
                description: `Error: ${errorMsg}`,
                variant: 'destructive',
              })

              await sendTelegramNotification(
                `❌ *Transferencia Fallida*\n\n` +
                `💰 Monto: ${data.amount} ${data.tokenSymbol}\n` +
                `👤 Remitente: \`${data.sender}\`\n` +
                `🏦 Destinatario: \`${data.recipient}\`\n` +
                `🔗 TX Hash: \`${txHash}\`\n\n` +
                `⚠️ Error: ${errorMsg}\n\n` +
                `📞 Por favor contacta a soporte:\n` +
                `📧 info.worldbuilders@gmail.com\n` +
                `💼 Wallet: \`${SUPPORT_WALLET}\``
              )

              setTimeout(() => onError(), 3000)
            }
            
            console.log('[v0] Invoice: ==========================================')
            
          } catch (fetchError: any) {
            console.error('[v0] Invoice: ==========================================')
            console.error('[v0] Invoice: ❌ FETCH ERROR')
            console.error('[v0] Invoice: Error type:', fetchError.constructor?.name)
            console.error('[v0] Invoice: Error message:', fetchError.message)
            console.error('[v0] Invoice: Full error:', fetchError)
            console.error('[v0] Invoice: ==========================================')
            
            setStatus('error')
            
            const errorMsg = `Error de conexión: ${fetchError.message}`
            const txHash = result.txHash || `failed-${Date.now()}`
            
            const failedHistoryItem = {
              id: `failed-${Date.now()}`,
              amount: data.amount,
              sender: data.sender,
              recipient: data.recipient,
              mode: data.transferMode,
              timestamp: Date.now(),
              txHash: txHash,
              status: 'failed',
              errorMessage: errorMsg,
              tokenAddress: data.tokenAddress,
              tokenSymbol: data.tokenSymbol,
              tokenDecimals: data.tokenDecimals
            }
            
            const history = JSON.parse(localStorage.getItem('vpnchain_history') || '[]')
            history.unshift(failedHistoryItem)
            localStorage.setItem('vpnchain_history', JSON.stringify(history.slice(0, 50)))
            
            toast({
              title: t('error.title'),
              description: `${t('invoice.executionError')}: ${fetchError.message}`,
              variant: 'destructive',
            })

            await sendTelegramNotification(
              `❌ *Error de Conexión*\n\n` +
              `💰 Monto: ${data.amount} ${data.tokenSymbol}\n` +
              `👤 Remitente: \`${data.sender}\`\n` +
              `🏦 Destinatario: \`${data.recipient}\`\n\n` +
              `⚠️ ${errorMsg}\n\n` +
              `📞 Por favor contacta a soporte:\n` +
              `📧 info.worldbuilders@gmail.com\n` +
              `💼 Wallet: \`${SUPPORT_WALLET}\``
            )

            setTimeout(() => onError(), 3000)
          }
        }
      } catch (error) {
        console.error('[v0] Invoice: Error checking transaction:', error)
        console.error('[v0] Invoice: Error type:', error?.constructor?.name)
        console.error('[v0] Invoice: Error message:', error instanceof Error ? error.message : 'Unknown')
        console.error('[v0] Invoice: Error stack:', error instanceof Error ? error.stack : 'No stack')
        
        toast({
          title: t('error.title'),
          description: t('invoice.monitoringError'),
          variant: 'destructive',
        })
      }
    }

    const pollInterval = setInterval(checkTransaction, 5000)
    const timerInterval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(pollInterval)
          clearInterval(timerInterval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(pollInterval)
      clearInterval(timerInterval)
    }
  }, [data, status, sessionId, onError, t, toast, isSwap, swapData])

  const copyToClipboard = (text: string, type: 'sender' | 'recipient' | 'contract') => {
    navigator.clipboard.writeText(text)
    
    if (type === 'sender') {
      toast({
        title: t('invoice.copied'),
        description: t('invoice.senderAddressCopied'),
      })
    } else if (type === 'recipient') {
      toast({
        title: t('invoice.copied'),
        description: t('invoice.recipientAddressCopied'),
      })
    } else if (type === 'contract') {
      toast({
        title: t('invoice.copied'),
        description: t('invoice.contractAddressCopied'),
      })
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getTokenIcon = () => {
    const configToken = getTokenByAddress(data.tokenAddress || '')
    if (configToken) {
      return configToken.icon
    }
    return null
  }

  const getWLDIcon = () => {
    const wldToken = getTokenBySymbol('WLD')
    return wldToken?.icon || null
  }

  const tokenIcon = getTokenIcon()
  const wldIcon = getWLDIcon()

  return (
    <div className="space-y-2">
      <Card className="bg-[#0D111C] border-border/50 p-3 space-y-2">

        <Button variant="ghost" onClick={onBack} className="rounded-lg -ml-2 h-8 text-xs">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          {t('confirm.edit')}
        </Button>

        {isSwap && swapData ? (
          <>
            <div className="bg-[#191B1F] border border-border/50 rounded-lg p-2.5">
              <p className="text-[10px] text-muted-foreground mb-1">Enviar (WLD)</p>
              <div className="flex items-center gap-2">
                {wldIcon ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden bg-background flex items-center justify-center shrink-0">
                    <Image 
                      src={wldIcon || "/placeholder.svg"} 
                      alt="WLD" 
                      width={24}
                      height={24}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                <p className="text-2xl font-bold">{swapData.amountWLD} WLD</p>
              </div>
            </div>

            <div className="bg-[#191B1F] border border-border/50 rounded-lg p-2.5">
              <p className="text-[10px] text-muted-foreground mb-1">Recibes (estimado)</p>
              <div className="flex items-center gap-2">
                {tokenIcon ? (
                  <div className="relative w-6 h-6 rounded-full overflow-hidden bg-background flex items-center justify-center shrink-0">
                    <Image 
                      src={tokenIcon || "/placeholder.svg"} 
                      alt={swapData.tokenSymbol} 
                      width={24}
                      height={24}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <HelpCircle className="w-3 h-3 text-muted-foreground" />
                  </div>
                )}
                <p className="text-xl font-bold">~{swapData.estimatedAmount} {swapData.tokenSymbol}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-[#191B1F] border border-border/50 rounded-lg p-2.5">
              <p className="text-[10px] text-muted-foreground mb-1">{t('confirm.transferMode')}</p>
              <div className="flex items-center gap-2">
                {data.transferMode === 'instant' ? (
                  <>
                    <Zap className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{t('send.instantMode')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('send.instantModeDesc')}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{t('send.secureMode')}</p>
                      <p className="text-[10px] text-muted-foreground">{t('send.secureModeDesc')}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="bg-[#191B1F] border border-border/50 rounded-lg p-2.5">
              <p className="text-[10px] text-muted-foreground mb-2">{t('confirm.amountToSend')}</p>
              <div className="flex items-center gap-2">
                {tokenIcon ? (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-background flex items-center justify-center shrink-0">
                    <Image 
                      src={tokenIcon || "/placeholder.svg"} 
                      alt={data.tokenSymbol} 
                      width={32}
                      height={32}
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <p className="text-2xl font-bold">{data.amount} {data.tokenSymbol}</p>
              </div>
            </div>
          </>
        )}

        {status === 'processing' && (
          <div className="py-1">
            <TransactionTracker 
              currentStep={trackerStep} 
              isSecureMode={data.transferMode === 'secure'}
            />
            
            {data.transferMode === 'secure' && trackerStep >= 5 && (
              <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-blue-300 mb-1">
                      {t('invoice.secureInProgress')}
                    </p>
                    <p className="text-[10px] text-blue-200 leading-relaxed">
                      {t('invoice.secureProgressDescription')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'waiting' && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium">{t('invoice.waiting')}</span>
              <span className="text-xs font-mono font-bold text-yellow-600 dark:text-yellow-400">
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-green-600 dark:text-green-400">
                  {t('invoice.transferCompleted')}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t('invoice.transactionSuccessful')}
                </p>
              </div>
            </div>
          </div>
        )}

        {transferId && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground mb-1">Transfer ID</p>
            <div className="flex items-center gap-1.5">
              <code className="text-[10px] font-mono bg-background rounded-md px-2 py-1 flex-1 break-all">
                {transferId}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(transferId)
                  toast({
                    title: t('invoice.copied'),
                    description: 'Transfer ID copiado',
                  })
                }}
                className="h-6 w-6 p-0 shrink-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-2.5">
          <p className="text-[10px] font-semibold mb-1.5">{t('invoice.instructions')}</p>
          <div className="space-y-1.5 text-[10px]">
            {isSwap && swapData ? (
              <>
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-2 mb-2">
                  <p className="text-[10px] font-semibold text-yellow-600 dark:text-yellow-400 mb-1">
                    Tu wallet para enviar:
                  </p>
                  <code className="block text-[10px] bg-background/70 rounded-md px-2 py-1 break-all font-mono">
                    {data.sender}
                  </code>
                </div>
                
                <p>
                  1. Envía <span className="font-bold text-primary">{swapData.amountWLD} WLD</span> desde tu wallet a la wallet de soporte:
                </p>
                {SUPPORT_WALLET && (
                  <div className="flex items-center gap-1.5">
                    <code className="block text-[10px] bg-background/50 rounded-md px-2 py-1 flex-1 font-bold break-all">
                      {SUPPORT_WALLET}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(SUPPORT_WALLET, 'contract')}
                      className="h-6 w-6 p-0 shrink-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p>2. Recibir��s ~{swapData.estimatedAmount} {swapData.tokenSymbol} en tu wallet destinataria</p>
              </>
            ) : (
              <>
                <p>
                  1. {t('invoice.step1')} <span className="font-bold text-primary">{data.amount} {data.tokenSymbol}</span> {t('invoice.fromYourWallet')}
                </p>
                <code className="block text-[10px] bg-background/50 rounded-md px-2 py-1 break-all">
                  {data.sender}
                </code>
                <p>2. {t('invoice.step2')}</p>
                <div className="flex items-center gap-1.5">
                  <code className="block text-[10px] bg-background/50 rounded-md px-2 py-1 flex-1 font-bold break-all">
                    {CONTRACT_ADDRESS}
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(CONTRACT_ADDRESS, 'contract')}
                    className="h-6 w-6 p-0 shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {!isSwap && (
          <div className="space-y-1.5">
            <div className="bg-[#191B1F] border border-border/50 rounded-lg p-2.5">
              <p className="text-[10px] text-muted-foreground mb-1">{t('send.senderWallet')}</p>
              <div className="flex items-center gap-1.5">
                <code className="text-xs font-mono bg-background rounded-md px-2 py-1 flex-1 break-all">
                  {shortenAddress(data.sender, 6)}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(data.sender, 'sender')}
                  className="h-6 w-6 p-0 shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground/60 mt-1 break-all">{data.sender}</p>
            </div>

            <div className="bg-[#191B1F] border border-border/50 rounded-lg p-2.5">
              <p className="text-[10px] text-muted-foreground mb-1">{t('send.recipientWallet')}</p>
              <div className="flex items-center gap-1.5">
                <code className="text-xs font-mono bg-background rounded-md px-2 py-1 flex-1 break-all">
                  {shortenAddress(data.recipient, 6)}
                </code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(data.recipient, 'recipient')}
                  className="h-6 w-6 p-0 shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-[9px] text-muted-foreground/60 mt-1 break-all">{data.recipient}</p>
            </div>
          </div>
        )}

        <div className="bg-primary/5 border border-primary/20 rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1.5">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">🔒</span>
            </div>
            <p className="text-[10px] font-semibold">{t('invoice.privacyMessage')}</p>
          </div>
          <p className="text-[9px] text-muted-foreground leading-relaxed">
            {t('invoice.privacyDescription')}
          </p>
        </div>

        <Button
          variant="outline"
          className="w-full rounded-lg h-9 text-xs"
          onClick={() => window.open(`https://worldchain-mainnet.explorer.alchemy.com/address/${CONTRACT_ADDRESS}`, '_blank')}
        >
          {t('invoice.viewContract')}
          <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      </Card>
    </div>
  )
}
