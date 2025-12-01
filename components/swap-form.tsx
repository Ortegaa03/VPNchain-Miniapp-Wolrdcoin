"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowDown, Wallet, ShoppingCart, Loader2, Info } from "lucide-react"
import { shortenAddress } from "@/lib/utils"
import { useLanguage } from "@/lib/translations"
import { useToast } from "@/hooks/use-toast"
import { TokenSelector } from "@/components/token-selector"
import { WalletSelectorModal } from "@/components/wallet-selector-modal"
import { SUPPORTED_TOKENS, getTokenBySymbol } from "@/lib/tokens-config"
import { APP_CONFIG } from "@/lib/config"
import type { CustomToken } from "@/lib/storage-utils"
import type { Token } from "@/lib/tokens-config"
import { MiniKit } from "@worldcoin/minikit-js"
import { erc20Abi } from "viem"
import { parseUnits } from "viem"
import {
  getWorldUser,
  saveProfileWallet,
  saveTransaction,
  updateTransaction,
  type TransactionRecord,
} from "@/lib/storage-utils"

export interface SwapData {
  amountWLD: number
  tokenToBuy: string
  tokenSymbol: string
  tokenDecimals: number
  recipientWallet: string
  estimatedAmount: string
}

interface SwapFormProps {
  onConfirm?: (data: SwapData) => void
}

export function SwapForm({ onConfirm }: SwapFormProps) {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [amount, setAmount] = useState<string>("5")
  const defaultToken = SUPPORTED_TOKENS.find((token) => token.symbol !== "WLD") || SUPPORTED_TOKENS[0]
  const [selectedToken, setSelectedToken] = useState<Token | CustomToken>(defaultToken)
  const [estimatedAmount, setEstimatedAmount] = useState<string>("...")
  const [loadingEstimate, setLoadingEstimate] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [senderAddress, setSenderAddress] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [showRecipientWalletModal, setShowRecipientWalletModal] = useState(false)

  const BACKEND_WALLET = "0x52f0c6ec1f6258b7247db7f6ed951c3a2129bc3e"

  const numAmount = Number.parseFloat(amount) || 0

  useEffect(() => {
    console.log("[v0] SWAP_FORM: Initializing form...")

    try {
      const worldUser = getWorldUser()
      console.log("[v0] SWAP_FORM: World user retrieved:", worldUser?.walletAddress?.substring(0, 10) + "..." || "none")

      if (worldUser?.walletAddress) {
        setSenderAddress(worldUser.walletAddress)
        setRecipientAddress(worldUser.walletAddress)
        console.log("[v0] SWAP_FORM: Sender address set to:", worldUser.walletAddress)
        console.log("[v0] SWAP_FORM: Recipient address set to user wallet (default)")

        saveProfileWallet(worldUser.walletAddress)
      } else {
        console.warn("[v0] SWAP_FORM: No wallet address available from world user")
      }
    } catch (error) {
      console.error("[v0] SWAP_FORM: Error initializing wallet:", error)
    }

    const preselectedTokenStr = localStorage.getItem("preselectedToken")
    if (preselectedTokenStr) {
      try {
        const preselectedToken = JSON.parse(preselectedTokenStr)
        setSelectedToken(preselectedToken)
        localStorage.removeItem("preselectedToken")
      } catch (error) {
        console.error("[v0] SWAP_FORM: Error loading preselected token:", error)
      }
    }
  }, [])

  const formatAmount = (value: string): string => {
    if (value === "..." || value === "?" || value === "0") return value

    const num = Number.parseFloat(value)
    if (isNaN(num)) return value

    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const estimatedAmountNum = Number.parseFloat(estimatedAmount) || 0
  const commissionAmount = (estimatedAmountNum * APP_CONFIG.COMMISSION_PERCENTAGE) / 100
  const finalAmountToReceive = estimatedAmountNum - commissionAmount

  useEffect(() => {
    const fetchEstimate = async () => {
      if (isNaN(numAmount) || numAmount <= 0) {
        setEstimatedAmount("0")
        return
      }

      setLoadingEstimate(true)
      try {
        const response = await fetch("/api/dexscreener", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenAddress: selectedToken.address,
            amountWLD: numAmount,
          }),
        })

        const data = await response.json()
        if (data.success) {
          setEstimatedAmount(data.estimatedAmount)
        } else {
          setEstimatedAmount("?")
        }
      } catch (error) {
        console.error("[v0] Error fetching estimate:", error)
        setEstimatedAmount("?")
      } finally {
        setLoadingEstimate(false)
      }
    }

    const debounceTimer = setTimeout(fetchEstimate, 500)
    return () => clearTimeout(debounceTimer)
  }, [amount, selectedToken.address, numAmount])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = Number.parseFloat(amount)
    console.log("[v0] SWAP_FORM: ==========================================")
    console.log("[v0] SWAP_FORM: Submit button clicked")
    console.log("[v0] SWAP_FORM: WLD Amount:", numAmount)
    console.log("[v0] SWAP_FORM: Sender Address:", senderAddress?.substring(0, 10) + "...")
    console.log("[v0] SWAP_FORM: Recipient Address:", recipientAddress?.substring(0, 10) + "...")
    console.log("[v0] SWAP_FORM: Token to buy:", selectedToken.symbol, selectedToken.address)

    if (isNaN(numAmount) || numAmount <= 0) {
      console.warn("[v0] SWAP_FORM: Invalid amount:", amount)
      toast({
        title: t("send.error"),
        description: "Ingresa una cantidad válida de WLD",
        variant: "destructive",
      })
      return
    }

    if (!senderAddress) {
      console.error("[v0] SWAP_FORM: No sender address available")
      toast({
        title: t("send.error"),
        description: "No se pudo detectar tu wallet",
        variant: "destructive",
      })
      return
    }

    if (!recipientAddress || !recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.error("[v0] SWAP_FORM: Invalid recipient address:", recipientAddress)
      toast({
        title: t("send.error"),
        description: "Por favor ingresa una dirección de destinatario válida",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    const txId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      const wldToken = getTokenBySymbol("WLD")
      if (!wldToken) {
        console.error("[v0] SWAP_FORM: WLD token not found")
        throw new Error("No se pudo encontrar la configuración de WLD")
      }

      let wldAddress = wldToken.address
      if ("entrypointAddress" in wldToken && wldToken.entrypointAddress) {
        wldAddress = wldToken.entrypointAddress
        console.log("[v0] SWAP_FORM: Using WLD entrypoint address:", wldAddress)
      }

      const wldDecimals = wldToken.decimals
      const amount_wei = parseUnits(amount, wldDecimals)

      console.log("[v0] SWAP_FORM: ==========================================")
      console.log("[v0] SWAP_FORM: STEP 1: Sending WLD to backend wallet")
      console.log("[v0] SWAP_FORM: WLD Token Address:", wldAddress)
      console.log("[v0] SWAP_FORM: Amount to send:", amount, `(${amount_wei} wei)`)
      console.log("[v0] SWAP_FORM: Backend Wallet (will receive WLD):", BACKEND_WALLET)

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: wldAddress,
            abi: erc20Abi,
            functionName: "transfer",
            args: [BACKEND_WALLET, amount_wei],
          },
        ],
      })

      console.log("[v0] SWAP_FORM: Transaction response received")
      console.log("[v0] SWAP_FORM: Status:", finalPayload.status)

      if (finalPayload.status === "error") {
        console.error("[v0] SWAP_FORM: Transaction failed:", finalPayload)

        const failedTx: TransactionRecord = {
          id: txId,
          type: "swap",
          status: "failed",
          amount: numAmount.toString(),
          tokenSymbol: "WLD",
          tokenAddress: wldAddress,
          tokenDecimals: wldDecimals,
          from: senderAddress,
          to: recipientAddress,
          swapTokenAddress: selectedToken.address,
          swapTokenSymbol: selectedToken.symbol,
          createdAt: Date.now(),
          error: finalPayload.error_code || "Transaction failed",
          retryCount: 0,
        }
        saveTransaction(failedTx)

        toast({
          title: "Error en la transacción",
          description: "No se pudo completar el envío de WLD",
          variant: "destructive",
        })
        setIsSending(false)
        return
      }

      console.log("[v0] SWAP_FORM: ✅ WLD sent successfully!")
      console.log("[v0] SWAP_FORM: Transaction ID:", finalPayload.transaction_id)

      const pendingTx: TransactionRecord = {
        id: txId,
        type: "swap",
        status: "pending",
        amount: numAmount.toString(),
        tokenSymbol: "WLD",
        tokenAddress: wldAddress,
        tokenDecimals: wldDecimals,
        from: senderAddress,
        to: recipientAddress,
        swapTokenAddress: selectedToken.address,
        swapTokenSymbol: selectedToken.symbol,
        createdAt: Date.now(),
        userTxHash: finalPayload.transaction_id,
        retryCount: 0,
      }
      saveTransaction(pendingTx)

      console.log("[v0] SWAP_FORM: ==========================================")
      console.log("[v0] SWAP_FORM: STEP 2: Calling swap API to execute swap + routing")

      const swapResponse = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountWLD: numAmount,
          tokenToBuy: selectedToken.address,
          recipientWallet: recipientAddress,
          tokenDecimals: selectedToken.decimals,
          tokenSymbol: selectedToken.symbol,
        }),
      })

      const swapData = await swapResponse.json()

      console.log("[v0] SWAP_FORM: Swap API response:", swapData)

      if (!swapData.success) {
        console.error("[v0] SWAP_FORM: Swap failed:", swapData.error)

        updateTransaction(txId, {
          status: "failed",
          error: swapData.error,
        })

        if (swapData.refunded) {
          const commissionMsg =
            swapData.commissionRetained > 0
              ? ` Se retuvo ${swapData.commissionRetained} WLD como comisión por reintento.`
              : ""

          toast({
            title: "Swap no disponible",
            description: swapData.error + commissionMsg || "No hay liquidez. Se han devuelto tus WLD.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error en el swap",
            description: swapData.error || "No se pudo completar el swap",
            variant: "destructive",
          })
        }
        setIsSending(false)
        return
      }

      updateTransaction(txId, {
        status: "completed",
        routeTxHash: swapData.routeTxHash,
        swapTxHash: swapData.swapTxHash,
        routeId: swapData.routeId,
        completedAt: Date.now(),
      })

      console.log("[v0] SWAP_FORM: ==========================================")
      console.log("[v0] SWAP_FORM: ✅✅ SWAP COMPLETED SUCCESSFULLY ✅✅")
      console.log("[v0] SWAP_FORM: Method:", swapData.swapMethod)
      console.log("[v0] SWAP_FORM: Path:", swapData.swapPath)
      console.log("[v0] SWAP_FORM: Tokens received:", swapData.tokensReceived, swapData.tokenSymbol)
      console.log("[v0] SWAP_FORM: Transfer mode:", swapData.transferMode)
      console.log("[v0] SWAP_FORM: Route ID:", swapData.routeId)
      console.log("[v0] SWAP_FORM: Final recipient:", swapData.recipient)
      console.log("[v0] SWAP_FORM: Swap TX:", swapData.swapTxHash)
      console.log("[v0] SWAP_FORM: Deposit TX:", swapData.depositTxHash)
      console.log("[v0] SWAP_FORM: Route TX:", swapData.routeTxHash)
      console.log("[v0] SWAP_FORM: ==========================================")

      toast({
        title: "Swap exitoso",
        description: `Se han enviado ${swapData.tokensReceived} ${swapData.tokenSymbol} a ${shortenAddress(recipientAddress, 4)}`,
      })

      setAmount("5")
    } catch (error: any) {
      console.error("[v0] SWAP_FORM: ==========================================")
      console.error("[v0] SWAP_FORM: ❌ ERROR DURING SWAP")
      console.error("[v0] SWAP_FORM: Error code:", error.error_code)
      console.error("[v0] SWAP_FORM: Error message:", error.message)
      console.error("[v0] SWAP_FORM: Full error:", JSON.stringify(error, null, 2))
      console.error("[v0] SWAP_FORM: ==========================================")

      updateTransaction(txId, {
        status: "failed",
        error: error.message || "Unknown error",
      })

      if (error.error_code === "invalid_contract") {
        toast({
          title: "Error en la transacción",
          description:
            "El contrato WLD no está configurado en el Developer Portal de Worldcoin. Por favor, agregalo en Advanced Settings > Contract Entrypoints.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "No se pudo completar el swap",
          variant: "destructive",
        })
      }
    } finally {
      setIsSending(false)
    }
  }

  const isRecipientComplete = recipientAddress.length >= 42

  return (
    <>
      <Card className="glass-card backdrop-blur-2xl shadow-2xl relative bg-[#0D111C]/95 border-2 border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        <form onSubmit={handleSend} className="space-y-2 relative z-10 p-3" noValidate>
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold">{t("nav.swap")}</h2>
          </div>

          <div className="glass-card-light rounded-xl p-2.5 space-y-1.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("send.youSend")} (WLD)</span>
            </div>

            <div className="flex items-center gap-2">
              <img
                src={getTokenBySymbol("WLD")?.icon || "/placeholder.svg"}
                alt="WLD"
                className="h-8 w-8 rounded-full"
              />
              <Input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 text-2xl font-bold bg-transparent border-0 h-auto p-0 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="flex gap-1.5 justify-center flex-wrap">
              {[5, 10, 20, 50, 100].map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  onClick={() => setAmount(value.toString())}
                  className={`
                    rounded-full text-xs font-semibold px-2.5 py-1 transition-all duration-200 h-6
                    ${
                      amount === value.toString()
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/50 scale-105 border-2 border-primary ring-2 ring-primary/30 hover:shadow-xl hover:shadow-primary/60"
                        : "bg-[#2C2F36] text-foreground/90 hover:bg-primary/30 hover:text-foreground hover:scale-102 border-2 border-border/70 hover:border-primary/50 shadow-md hover:shadow-lg hover:shadow-primary/20"
                    }
                  `}
                  variant="ghost"
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-center -my-1.5 relative z-10">
            <div className="bg-[#0D111C] border-4 border-card rounded-lg p-0.5">
              <ArrowDown className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>

          <div className="glass-card-light rounded-xl p-2.5 space-y-1.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("swap.youReceive")}</span>
            </div>

            <div className="flex items-center gap-2">
              {loadingEstimate ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-2xl font-bold">{formatAmount(estimatedAmount)}</span>
              )}
              <TokenSelector selectedToken={selectedToken} onSelectToken={setSelectedToken} mode="swap" />
            </div>

            {estimatedAmountNum > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 mt-2">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-[10px] flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t("swap.estimatedAmount")}:</span>
                      <span className="font-semibold text-foreground">
                        {estimatedAmountNum.toFixed(4)} {selectedToken.symbol}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t("send.commission")}:</span>
                      <span className="font-semibold text-primary">
                        -{commissionAmount.toFixed(4)} {selectedToken.symbol}
                      </span>
                    </div>
                    <div className="border-t border-primary/20 pt-1 mt-1 flex justify-between items-center">
                      <span className="text-foreground font-medium">{t("send.recipientWillReceive")}:</span>
                      <span className="font-bold text-foreground text-xs">
                        {finalAmountToReceive.toFixed(4)} {selectedToken.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <label
            htmlFor="recipient-input"
            className="glass-card-light rounded-xl p-2.5 space-y-1.5 shadow-lg block cursor-text hover:border-primary/30 transition-all duration-200 border-2 border-transparent focus-within:border-primary focus-within:shadow-lg focus-within:shadow-primary/20"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("send.toWallet")}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRecipientWalletModal(true)}
                className="h-6 text-[10px] text-primary hover:text-primary px-2"
              >
                <Wallet className="h-3 w-3 mr-1" />
                {t("savedWallets.modalTitle")}
              </Button>
            </div>
            {isRecipientComplete ? (
              <div className="space-y-1">
                <div className="text-sm font-mono font-semibold">{shortenAddress(recipientAddress, 6)}</div>
                <p className="text-[9px] text-muted-foreground font-mono break-all">{recipientAddress}</p>
              </div>
            ) : (
              <Input
                id="recipient-input"
                placeholder="0x... (por defecto tu wallet)"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value.toLowerCase())}
                className="bg-transparent border-0 text-sm font-mono h-auto p-0 focus-visible:ring-0"
              />
            )}
            {isRecipientComplete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRecipientAddress("")}
                className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer h-5"
              >
                {t("confirm.edit")}
              </Button>
            )}
          </label>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-1.5 mt-1.5 backdrop-blur-sm">
            <p className="text-[9px] text-center text-blue-200 leading-snug">{t("swap.payWithWLD")}</p>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSending}
            className="w-full rounded-xl text-sm font-bold h-10 mt-1.5 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Procesando swap...
              </>
            ) : (
              t("send.title")
            )}
          </Button>
        </form>
      </Card>

      <WalletSelectorModal
        isOpen={showRecipientWalletModal}
        onClose={() => setShowRecipientWalletModal(false)}
        onSelectWallet={(address) => setRecipientAddress(address)}
      />
    </>
  )
}
