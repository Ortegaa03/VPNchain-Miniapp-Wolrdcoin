"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useLanguage } from "@/lib/translations"
import { getTransactionHistory, updateTransaction, type TransactionRecord } from "@/lib/storage-utils"
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ethers } from "ethers"
import { APP_CONFIG } from "@/lib/config"
import { VPNCHAIN_ROUTER_V6_ABI } from "@/lib/contract-abi"

export function TransactionHistory({ userAddress }: { userAddress?: string }) {
  const { t, language } = useLanguage()
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const isMountedRef = useRef(true)

  const loadTransactions = useCallback(() => {
    if (!isMountedRef.current) return

    console.log("[v0] HISTORY: Loading transactions...")
    try {
      const history = getTransactionHistory()
      if (isMountedRef.current) {
        setTransactions(history)
        setIsLoading(false)
        console.log("[v0] HISTORY: Loaded", history.length, "transactions")
      }
    } catch (error) {
      console.error("[v0] HISTORY: Error loading transactions:", error)
      if (isMountedRef.current) {
        setTransactions([])
        setIsLoading(false)
      }
    }
  }, [])

  const refreshTransactionStatus = useCallback(async () => {
    if (!isMountedRef.current || refreshing) return

    setRefreshing(true)
    console.log("[v0] HISTORY: Refreshing transaction status...")

    try {
      const provider = new ethers.JsonRpcProvider(APP_CONFIG.RPC_URL)
      const contract = new ethers.Contract(APP_CONFIG.CONTRACT_ADDRESS, VPNCHAIN_ROUTER_V6_ABI, provider)

      const currentTransactions = getTransactionHistory()
      const pending = currentTransactions.filter(
        (tx) => (tx.status === "pending" || tx.status === "processing") && tx.routeId !== undefined,
      )

      for (const tx of pending) {
        if (!isMountedRef.current) break

        try {
          console.log("[v0] HISTORY: Checking route", tx.routeId)

          // Get route progress
          const [, totalSteps, completedSteps, completed, , isSecure, completedAt] =
            await contract.getRouteMetaProgress(tx.routeId)

          const updates: Partial<TransactionRecord> = {
            totalSteps: Number(totalSteps),
            completedSteps: Number(completedSteps),
          }

          if (completed) {
            updates.status = "completed"
            updates.completedAt = Number(completedAt) * 1000
            console.log("[v0] HISTORY: Route", tx.routeId, "completed!")
          } else if (Number(completedSteps) > 0) {
            updates.status = "processing"

            // Estimate remaining time for secure mode
            if (isSecure) {
              const estimatedSeconds = await contract.estimateRemainingTime(tx.routeId)
              updates.estimatedTime = Number(estimatedSeconds)
            }
          }

          updateTransaction(tx.id, updates)
        } catch (error) {
          console.error("[v0] HISTORY: Error checking route", tx.routeId, error)
        }
      }

      // Reload transactions
      if (isMountedRef.current) {
        loadTransactions()
      }
    } catch (error) {
      console.error("[v0] HISTORY: Error refreshing:", error)
    } finally {
      if (isMountedRef.current) {
        setRefreshing(false)
      }
    }
  }, [refreshing, loadTransactions])

  useEffect(() => {
    isMountedRef.current = true
    loadTransactions()

    return () => {
      isMountedRef.current = false
    }
  }, [loadTransactions])

  useEffect(() => {
    const interval = setInterval(() => {
      const currentTransactions = getTransactionHistory()
      const pending = currentTransactions.filter((tx) => tx.status === "pending" || tx.status === "processing")

      if (pending.length > 0 && isMountedRef.current) {
        console.log("[v0] HISTORY: Auto-refreshing for", pending.length, "pending transactions")
        refreshTransactionStatus()
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [refreshTransactionStatus])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "send":
        return <ArrowUpRight className="h-4 w-4 text-red-400" />
      case "receive":
        return <ArrowDownLeft className="h-4 w-4 text-green-400" />
      case "swap":
        return <RefreshCw className="h-4 w-4 text-blue-400" />
      default:
        return null
    }
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - timestamp

    // Less than 1 minute
    if (diff < 60000) {
      return language === "es" ? "Ahora mismo" : "Just now"
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000)
      return language === "es" ? `Hace ${mins}min` : `${mins}min ago`
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return language === "es" ? `Hace ${hours}h` : `${hours}h ago`
    }

    // Format as date
    return date.toLocaleDateString(language === "es" ? "es-ES" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          {language === "es" ? "No hay transacciones aún" : "No transactions yet"}
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{language === "es" ? "Historial" : "History"}</h3>
        <Button variant="ghost" size="sm" onClick={refreshTransactionStatus} disabled={refreshing} className="h-8 px-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <div className="space-y-2">
        {transactions.map((tx) => (
          <Card key={tx.id} className="p-3">
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">{getTypeIcon(tx.type)}</div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">
                      {tx.type === "send" && (language === "es" ? "Enviado" : "Sent")}
                      {tx.type === "receive" && (language === "es" ? "Recibido" : "Received")}
                      {tx.type === "swap" && (language === "es" ? "Intercambio" : "Swap")}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="shrink-0">{getStatusIcon(tx.status)}</div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {tx.amount} {tx.tokenSymbol}
                  </p>
                  {tx.transferMode && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {tx.transferMode === "instant"
                        ? language === "es"
                          ? "Instantáneo"
                          : "Instant"
                        : language === "es"
                          ? "Seguro"
                          : "Secure"}
                    </span>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-0.5">
                  {tx.type === "send" && (
                    <p>
                      {language === "es" ? "Para" : "To"}: {formatAddress(tx.to)}
                    </p>
                  )}
                  {tx.type === "receive" && (
                    <p>
                      {language === "es" ? "De" : "From"}: {formatAddress(tx.from)}
                    </p>
                  )}

                  {tx.status === "processing" && tx.totalSteps && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${((tx.completedSteps || 0) / tx.totalSteps) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs">
                        {tx.completedSteps}/{tx.totalSteps}
                      </span>
                    </div>
                  )}

                  {tx.estimatedTime && tx.estimatedTime > 0 && (
                    <p className="text-blue-400">
                      {language === "es" ? "Tiempo estimado" : "Est. time"}: {formatTime(tx.estimatedTime)}
                    </p>
                  )}

                  {tx.status === "failed" && tx.error && <p className="text-red-400">{tx.error}</p>}
                </div>

                {tx.routeTxHash && (
                  <a
                    href={`${APP_CONFIG.BLOCK_EXPLORER}/tx/${tx.routeTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {language === "es" ? "Ver en explorador" : "View on explorer"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
