"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ArrowDown, Wallet, Zap, Shield, Clock, Check, Loader2, Info } from "lucide-react"
import type { TransferMode } from "@/app/page"
import { shortenAddress } from "@/lib/utils"
import { APP_CONFIG } from "@/lib/config"
import { useLanguage } from "@/lib/translations"
import { useToast } from "@/hooks/use-toast"
import { TokenSelector } from "@/components/token-selector"
import { SUPPORTED_TOKENS } from "@/lib/tokens-config"
import { WalletSelectorModal } from "@/components/wallet-selector-modal"
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

type SendFormProps = {
  onConfirm?: (data: any) => void
}

export function SendForm({ onConfirm }: SendFormProps) {
  const { t } = useLanguage()
  const { toast } = useToast()

  const [amount, setAmount] = useState<string>("5")
  const [sender, setSender] = useState("")
  const [recipient, setRecipient] = useState("")
  const [transferMode, setTransferMode] = useState<TransferMode>("instant")
  const [selectedToken, setSelectedToken] = useState<Token | CustomToken>(SUPPORTED_TOKENS[0])
  const [showSenderWalletModal, setShowSenderWalletModal] = useState(false)
  const [showRecipientWalletModal, setShowRecipientWalletModal] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [senderAddress, setSenderAddress] = useState("")

  const VPNCHAIN_CONTRACT = APP_CONFIG.CONTRACT_ADDRESS

  useEffect(() => {
    console.log("[v0] SEND_FORM: Initializing form...")

    try {
      const worldUser = getWorldUser()
      console.log("[v0] SEND_FORM: World user retrieved:", worldUser?.walletAddress?.substring(0, 10) + "..." || "none")

      if (worldUser?.walletAddress) {
        setSenderAddress(worldUser.walletAddress)
        setSender(worldUser.walletAddress)
        console.log("[v0] SEND_FORM: Sender address auto-filled:", worldUser.walletAddress)

        saveProfileWallet(worldUser.walletAddress)
      } else {
        console.warn("[v0] SEND_FORM: No wallet address available from world user")
      }
    } catch (error) {
      console.error("[v0] SEND_FORM: Error initializing wallet:", error)
    }

    const preselectedTokenStr = localStorage.getItem("preselectedToken")
    if (preselectedTokenStr) {
      try {
        const preselectedToken = JSON.parse(preselectedTokenStr)
        setSelectedToken(preselectedToken)
        localStorage.removeItem("preselectedToken")
      } catch (error) {
        console.error("[v0] SEND_FORM: Error loading preselected token:", error)
      }
    }
  }, [])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = Number.parseFloat(amount)
    const commissionAmount = (numAmount * APP_CONFIG.COMMISSION_PERCENTAGE) / 100
    const amountAfterFee = numAmount - commissionAmount

    console.log("[v0] SEND_FORM: ==========================================")
    console.log("[v0] SEND_FORM: Submit button clicked")
    console.log("[v0] SEND_FORM: Full Amount:", numAmount)
    console.log("[v0] SEND_FORM: Commission:", commissionAmount, selectedToken.symbol)
    console.log("[v0] SEND_FORM: Amount after fee:", amountAfterFee, selectedToken.symbol)
    console.log("[v0] SEND_FORM: Sender Address:", senderAddress?.substring(0, 10) + "...")
    console.log("[v0] SEND_FORM: Recipient Address:", recipient?.substring(0, 10) + "...")
    console.log("[v0] SEND_FORM: Transfer Mode:", transferMode)
    console.log("[v0] SEND_FORM: Token:", selectedToken.symbol)

    if (isNaN(numAmount) || numAmount <= 0) {
      console.warn("[v0] SEND_FORM: Invalid amount:", amount)
      toast({
        title: t("send.error"),
        description: "Ingresa una cantidad válida",
        variant: "destructive",
      })
      return
    }

    if (!senderAddress) {
      console.error("[v0] SEND_FORM: No sender address available")
      toast({
        title: t("send.error"),
        description: "No se pudo detectar tu wallet",
        variant: "destructive",
      })
      return
    }

    if (!recipient || recipient.length < 42) {
      console.error("[v0] SEND_FORM: Invalid recipient address:", recipient)
      toast({
        title: t("send.error"),
        description: "Por favor ingresa una dirección de destino válida",
        variant: "destructive",
      })
      return
    }

    if (!recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      console.error("[v0] SEND_FORM: Invalid recipient address format:", recipient)
      toast({
        title: t("send.error"),
        description: "Por favor ingresa una dirección válida de Ethereum",
        variant: "destructive",
      })
      return
    }

    setIsSending(true)

    const txId = `send_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      let tokenAddress = "address" in selectedToken ? selectedToken.address : selectedToken.contractAddress
      if ("entrypointAddress" in selectedToken && selectedToken.entrypointAddress) {
        tokenAddress = selectedToken.entrypointAddress
        console.log("[v0] SEND_FORM: Using entrypoint address:", tokenAddress)
      }

      const tokenDecimals = selectedToken.decimals

      const amount_wei = parseUnits(numAmount.toString(), tokenDecimals)

      console.log("[v0] SEND_FORM: ==========================================")
      console.log("[v0] SEND_FORM: STEP 1: Sending FULL amount to VPNchain contract")
      console.log("[v0] SEND_FORM: Token Address:", tokenAddress)
      console.log("[v0] SEND_FORM: Full Amount:", numAmount, `(${amount_wei} wei)`)
      console.log("[v0] SEND_FORM: VPNchain Contract:", VPNCHAIN_CONTRACT)
      console.log("[v0] SEND_FORM: ℹ️  Contract will handle fee internally")

      const { finalPayload } = await MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "transfer",
            args: [VPNCHAIN_CONTRACT, amount_wei],
          },
        ],
      })

      console.log("[v0] SEND_FORM: Transaction response received")
      console.log("[v0] SEND_FORM: Status:", finalPayload.status)

      if (finalPayload.status === "error") {
        console.error("[v0] SEND_FORM: Transaction failed:", finalPayload)

        const failedTx: TransactionRecord = {
          id: txId,
          type: "send",
          status: "failed",
          amount: numAmount.toString(),
          tokenSymbol: selectedToken.symbol,
          tokenAddress: tokenAddress,
          tokenDecimals: tokenDecimals,
          from: senderAddress,
          to: recipient,
          createdAt: Date.now(),
          error: finalPayload.error_code || "Transaction failed",
          retryCount: 0,
        }
        saveTransaction(failedTx)

        if (finalPayload.error_code === "invalid_contract") {
          toast({
            title: "Token no soportado",
            description: `Solo puedes enviar WLD directamente. Para otros tokens, usa el Swap.`,
            variant: "destructive",
          })
        } else if (finalPayload.error_code === "user_rejected") {
          toast({
            title: "Transacción cancelada",
            description: "Has cancelado la transacción",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Error en la transacción",
            description: finalPayload.error_code || "No se pudo completar el envío de tokens",
            variant: "destructive",
          })
        }
        setIsSending(false)
        return
      }

      console.log("[v0] SEND_FORM: ✅ Tokens sent to VPNchain contract successfully!")
      console.log("[v0] SEND_FORM: Transaction ID:", finalPayload.transaction_id)

      const pendingTx: TransactionRecord = {
        id: txId,
        type: "send",
        status: "pending",
        amount: numAmount.toString(),
        tokenSymbol: selectedToken.symbol,
        tokenAddress: tokenAddress,
        tokenDecimals: tokenDecimals,
        from: senderAddress,
        to: recipient,
        createdAt: Date.now(),
        userTxHash: finalPayload.transaction_id,
        transferMode: transferMode,
        retryCount: 0,
      }
      saveTransaction(pendingTx)

      console.log("[v0] SEND_FORM: ⏳ Waiting 3 seconds for transaction confirmation...")
      await new Promise((resolve) => setTimeout(resolve, 3000))

      console.log("[v0] SEND_FORM: ==========================================")
      console.log("[v0] SEND_FORM: STEP 2: Calling send API to execute sendInstant/sendSecure")

      const sendResponse = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          tokenAddress: tokenAddress,
          recipientWallet: recipient,
          tokenDecimals: tokenDecimals,
          tokenSymbol: selectedToken.symbol,
          transferMode: transferMode,
          senderAddress: senderAddress,
          userTxHash: finalPayload.transaction_id,
        }),
      })

      const sendData = await sendResponse.json()

      console.log("[v0] SEND_FORM: Send API response:", sendData)

      if (!sendData.success) {
        console.error("[v0] SEND_FORM: Send failed:", sendData.error)

        updateTransaction(txId, {
          status: "failed",
          error: sendData.error,
        })

        toast({
          title: "Error en el envío",
          description: sendData.error || "No se pudo completar el envío",
          variant: "destructive",
        })
        setIsSending(false)
        return
      }

      const updates: Partial<TransactionRecord> = {
        status: transferMode === "instant" ? "completed" : "processing",
        routeTxHash: sendData.txHash,
        routeId: sendData.routeId,
      }

      if (transferMode === "instant") {
        updates.completedAt = Date.now()
      } else {
        updates.totalSteps = sendData.totalSteps || 0
        updates.completedSteps = 0
      }

      updateTransaction(txId, updates)

      console.log("[v0] SEND_FORM: ==========================================")
      console.log("[v0] SEND_FORM: ✅✅ SEND COMPLETED SUCCESSFULLY ✅✅")
      console.log("[v0] SEND_FORM: Transfer Mode:", sendData.transferMode)
      console.log("[v0] SEND_FORM: Function Called:", sendData.functionName)
      console.log("[v0] SEND_FORM: Route ID:", sendData.routeId)
      console.log("[v0] SEND_FORM: Amount sent:", sendData.amount, sendData.tokenSymbol)
      console.log("[v0] SEND_FORM: Final recipient:", sendData.recipient)
      console.log("[v0] SEND_FORM: Transaction Hash:", sendData.txHash)
      console.log("[v0] SEND_FORM: Block Number:", sendData.blockNumber)
      console.log("[v0] SEND_FORM: Gas Used:", sendData.gasUsed)
      console.log("[v0] SEND_FORM: ==========================================")

      toast({
        title: "Envío exitoso",
        description: `Se han enviado ${sendData.amount} ${sendData.tokenSymbol} a ${shortenAddress(recipient, 4)} usando VPN Chain ${sendData.transferMode === "instant" ? "Instant" : "Secure"}`,
      })

      setAmount("5")
      setRecipient("")
    } catch (error: any) {
      console.error("[v0] SEND_FORM: ==========================================")
      console.error("[v0] SEND_FORM: ❌ ERROR DURING SEND")
      console.error("[v0] SEND_FORM: Error code:", error.error_code)
      console.error("[v0] SEND_FORM: Error message:", error.message)
      console.error("[v0] SEND_FORM: Full error:", JSON.stringify(error, null, 2))
      console.error("[v0] SEND_FORM: ==========================================")

      updateTransaction(txId, {
        status: "failed",
        error: error.message || "Unknown error",
      })

      if (error.error_code === "invalid_contract") {
        toast({
          title: "Token no soportado",
          description: `Solo puedes enviar WLD directamente. Para otros tokens, usa el Swap.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "No se pudo completar el envío",
          variant: "destructive",
        })
      }
    } finally {
      setIsSending(false)
    }
  }

  const isSenderComplete = senderAddress.length >= 42
  const isRecipientComplete = recipient.length >= 42

  const numAmount = Number.parseFloat(amount) || 0
  const commissionAmount = (numAmount * APP_CONFIG.COMMISSION_PERCENTAGE) / 100
  const amountAfterFee = numAmount - commissionAmount

  return (
    <>
      <Card className="glass-card backdrop-blur-2xl shadow-2xl relative bg-[#0D111C]/95 border-2 border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        <form onSubmit={handleSend} className="space-y-2 relative z-10 p-3" noValidate>
          <div className="mb-2">
            <span className="text-xs font-medium text-foreground mb-1.5 block">{t("send.selectTransferMode")}</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransferMode("instant")}
                className={`
                  relative glass-card-light rounded-lg p-2 space-y-1.5 transition-all duration-200 border-2
                  ${
                    transferMode === "instant"
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-border/40 hover:border-primary/50"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`
                      p-1 rounded-lg transition-colors
                      ${transferMode === "instant" ? "bg-primary/20" : "bg-muted/50"}
                    `}
                    >
                      <Zap
                        className={`h-3.5 w-3.5 ${transferMode === "instant" ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-xs">{t("send.instantMode")}</div>
                    </div>
                  </div>
                  {transferMode === "instant" && (
                    <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-0.5">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 text-left">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{t("send.instantTime")}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-snug">{t("send.instantModeDesc")}</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setTransferMode("secure")}
                className={`
                  relative glass-card-light rounded-lg p-2 space-y-1.5 transition-all duration-200 border-2
                  ${
                    transferMode === "secure"
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                      : "border-border/40 hover:border-primary/50"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className={`
                      p-1 rounded-lg transition-colors
                      ${transferMode === "secure" ? "bg-primary/20" : "bg-muted/50"}
                    `}
                    >
                      <Shield
                        className={`h-3.5 w-3.5 ${transferMode === "secure" ? "text-primary" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-xs">{t("send.secureMode")}</div>
                    </div>
                  </div>
                  {transferMode === "secure" && (
                    <div className="absolute top-1.5 right-1.5 bg-primary rounded-full p-0.5">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 text-left">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    <span>24-48h</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground leading-snug">{t("send.secureModeDesc")}</p>
                </div>
              </button>
            </div>
          </div>

          <div className="glass-card-light rounded-xl p-2.5 space-y-1.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t("send.youSend")}</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet className="h-3 w-3" />
                <span>{t("send.balance")}: --</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="any"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 text-2xl font-bold bg-transparent border-0 h-auto p-0 focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <TokenSelector selectedToken={selectedToken} onSelectToken={setSelectedToken} />
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

            {numAmount > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 mt-2">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="space-y-1 text-[10px] flex-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">{t("send.youSend")}:</span>
                      <span className="font-semibold text-foreground">
                        {numAmount.toFixed(4)} {selectedToken.symbol}
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
                        {amountAfterFee.toFixed(4)} {selectedToken.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center -my-1.5 relative z-10">
            <div className="bg-[#0D111C] border-4 border-card rounded-lg p-0.5">
              <ArrowDown className="h-3 w-3 text-muted-foreground" />
            </div>
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
                <div className="text-sm font-mono font-semibold">{shortenAddress(recipient, 6)}</div>
                <p className="text-[9px] text-muted-foreground font-mono break-all">{recipient}</p>
              </div>
            ) : (
              <Input
                id="recipient-input"
                placeholder={t("send.destinationAddress")}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value.toLowerCase())}
                className="bg-transparent border-0 text-sm font-mono h-auto p-0 focus-visible:ring-0"
              />
            )}
            {isRecipientComplete && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setRecipient("")}
                className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer h-5"
              >
                {t("confirm.edit")}
              </Button>
            )}
          </label>

          <div className="bg-primary/10 border border-primary/30 rounded-lg p-1.5 mt-1.5 backdrop-blur-sm">
            <p className="text-[9px] text-center text-foreground/80 leading-snug">{t("send.disclaimer")}</p>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={isSending || !isRecipientComplete}
            className="w-full rounded-xl text-sm font-bold h-10 mt-1.5 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("send.title")}...
              </>
            ) : (
              t("send.title")
            )}
          </Button>
        </form>
      </Card>

      <WalletSelectorModal
        isOpen={showSenderWalletModal}
        onClose={() => setShowSenderWalletModal(false)}
        onSelectWallet={(address) => setSender(address)}
      />
      <WalletSelectorModal
        isOpen={showRecipientWalletModal}
        onClose={() => setShowRecipientWalletModal(false)}
        onSelectWallet={(address) => setRecipient(address)}
      />
    </>
  )
}
