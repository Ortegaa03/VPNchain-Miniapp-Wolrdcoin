"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, AlertCircle, Loader2 } from "lucide-react"
import { saveCustomToken } from "@/lib/storage-utils"
import { useToast } from "@/hooks/use-toast"
import { SUPPORTED_TOKENS } from "@/lib/tokens-config"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLanguage } from "@/lib/translations"

type AddCustomTokenModalProps = {
  isOpen: boolean
  onClose: () => void
  onTokenAdded: () => void
  mode?: "send" | "swap"
}

export function AddCustomTokenModal({ isOpen, onClose, onTokenAdded, mode = "send" }: AddCustomTokenModalProps) {
  const { toast } = useToast()
  const { t, language } = useLanguage()
  const [tokenName, setTokenName] = useState("")
  const [tokenSymbol, setTokenSymbol] = useState("")
  const [tokenAddress, setTokenAddress] = useState("")
  const [tokenDecimals, setTokenDecimals] = useState("18")
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [tokenIcon, setTokenIcon] = useState<string | null>(null)
  const [loadingTokenInfo, setLoadingTokenInfo] = useState(false)

  useEffect(() => {
    if (!tokenAddress || tokenAddress.length < 42) {
      setTokenIcon(null)
      setTokenName("")
      setTokenSymbol("")
      setTokenDecimals("18")
      return
    }

    const fetchTokenInfo = async () => {
      setLoadingTokenInfo(true)
      try {
        console.log("[v0] TOKEN-IMPORT: 🔍 Fetching complete info for:", tokenAddress)

        const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
        console.log("[v0] TOKEN-IMPORT: URL:", dexUrl)

        const dexResponse = await fetch(dexUrl)

        if (dexResponse.ok) {
          const data = await dexResponse.json()
          console.log("[v0] TOKEN-IMPORT: DexScreener response - pairs found:", data.pairs?.length || 0)

          if (data.pairs && data.pairs.length > 0) {
            const worldchainPairs = data.pairs.filter((p: any) => p.chainId?.toLowerCase() === "worldchain")

            console.log("[v0] TOKEN-IMPORT: Worldchain pairs found:", worldchainPairs.length)

            const pair = worldchainPairs.length > 0 ? worldchainPairs[0] : data.pairs[0]

            const baseToken = pair.baseToken
            const quoteToken = pair.quoteToken

            const matchingToken =
              baseToken.address.toLowerCase() === tokenAddress.toLowerCase() ? baseToken : quoteToken

            console.log("[v0] TOKEN-IMPORT: Matching token found:", matchingToken)

            if (matchingToken) {
              setTokenName(matchingToken.name || "")
              setTokenSymbol(matchingToken.symbol || "")
              console.log(
                "[v0] TOKEN-IMPORT: ✅ Auto-filled name:",
                matchingToken.name,
                "symbol:",
                matchingToken.symbol,
              )
            }

            if (pair.info?.imageUrl) {
              console.log("[v0] TOKEN-IMPORT: ✅ Icon found (GIF/image supported):", pair.info.imageUrl)
              setTokenIcon(pair.info.imageUrl)
            } else {
              console.log("[v0] TOKEN-IMPORT: ❌ No imageUrl found in pair info")
            }
          } else {
            console.log("[v0] TOKEN-IMPORT: ❌ No pairs found in DexScreener response")
          }
        } else {
          const errorText = await dexResponse.text()
          console.log("[v0] TOKEN-IMPORT: ❌ DexScreener API failed:", dexResponse.status, errorText)
        }

        console.log("[v0] TOKEN-IMPORT: Fetch complete")
      } catch (error) {
        console.error("[v0] TOKEN-IMPORT: ❌ Error fetching token info:", error)
      } finally {
        setLoadingTokenInfo(false)
      }
    }

    const timeoutId = setTimeout(fetchTokenInfo, 500)
    return () => clearTimeout(timeoutId)
  }, [tokenAddress])

  const handleSubmit = () => {
    setInlineError(null)

    if (!tokenName.trim() || !tokenSymbol.trim()) {
      setInlineError(language === "es" ? "Completa el nombre y símbolo del token" : "Complete token name and symbol")
      return
    }

    if (!tokenAddress || tokenAddress.length < 42) {
      setInlineError(language === "es" ? "Ingresa una dirección de contrato válida" : "Enter a valid contract address")
      return
    }

    if (mode === "swap") {
      const wldToken = SUPPORTED_TOKENS.find((t) => t.symbol === "WLD")
      if (wldToken && tokenAddress.toLowerCase() === wldToken.address.toLowerCase()) {
        setInlineError(
          language === "es"
            ? "No puedes importar WLD en modo swap. WLD es el token de pago y no puede comprarse consigo mismo."
            : "Cannot import WLD in swap mode. WLD is the payment token and cannot be bought with itself.",
        )
        return
      }
    }

    const decimals = Number.parseInt(tokenDecimals)
    if (isNaN(decimals) || decimals < 0 || decimals > 18) {
      setInlineError(
        language === "es" ? "Decimales debe ser un número entre 0 y 18" : "Decimals must be a number between 0 and 18",
      )
      return
    }

    const success = saveCustomToken({
      name: tokenName.trim(),
      symbol: tokenSymbol.trim().toUpperCase(),
      address: tokenAddress.toLowerCase(),
      decimals,
      icon: tokenIcon || "/placeholder.svg?height=32&width=32&query=" + encodeURIComponent(tokenSymbol.trim()),
    })

    console.log("[v0] TOKEN-IMPORT: Saving token with icon:", tokenIcon || "placeholder")

    if (success) {
      toast({
        title: language === "es" ? "✅ Token añadido" : "✅ Token added",
        description:
          language === "es"
            ? `${tokenSymbol.toUpperCase()} se añadió a tu lista`
            : `${tokenSymbol.toUpperCase()} was added to your list`,
      })
      setTokenName("")
      setTokenSymbol("")
      setTokenAddress("")
      setTokenDecimals("18")
      setTokenIcon(null)
      setInlineError(null)
      onTokenAdded()
      onClose()
    } else {
      setInlineError(language === "es" ? "Este token ya está en tu lista" : "This token is already in your list")
    }
  }

  const handleClose = () => {
    setInlineError(null)
    setTokenIcon(null)
    setTokenName("")
    setTokenSymbol("")
    setTokenAddress("")
    setTokenDecimals("18")
    onClose()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <Card className="glass-card p-6 max-w-md w-full relative z-[110]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            {language === "es" ? "Importar Token" : "Import Token"}
          </h3>
          <Button variant="ghost" size="sm" onClick={handleClose} className="h-8 w-8 p-0">
            ✕
          </Button>
        </div>

        <div className="space-y-4">
          {inlineError && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{inlineError}</AlertDescription>
            </Alert>
          )}

          {loadingTokenInfo && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="text-sm text-primary">
                {language === "es"
                  ? "Cargando información del token desde DexScreener..."
                  : "Loading token information from DexScreener..."}
              </div>
            </div>
          )}

          {tokenIcon && !loadingTokenInfo && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
              <img src={tokenIcon || "/placeholder.svg"} alt="Token icon" className="h-10 w-10 rounded-full" />
              <div className="text-sm text-primary">
                {language === "es" ? "Logo del token detectado" : "Token logo detected"}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              {language === "es" ? "Dirección del Contrato *" : "Contract Address *"}
            </label>
            <Input
              placeholder="0x..."
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value.toLowerCase())}
              className="rounded-lg font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">
              {language === "es" ? "Nombre del Token" : "Token Name"}
            </label>
            <Input
              placeholder={language === "es" ? "Se completará automáticamente" : "Will be auto-filled"}
              value={tokenName}
              readOnly
              disabled
              className="rounded-lg bg-secondary/50 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{language === "es" ? "Símbolo" : "Symbol"}</label>
            <Input
              placeholder={language === "es" ? "Se completará automáticamente" : "Will be auto-filled"}
              value={tokenSymbol}
              readOnly
              disabled
              className="rounded-lg bg-secondary/50 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">{language === "es" ? "Decimales" : "Decimals"}</label>
            <Input
              type="number"
              placeholder="18"
              value={tokenDecimals}
              onChange={(e) => setTokenDecimals(e.target.value)}
              min="0"
              max="18"
              className="rounded-lg"
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <p className="text-xs text-blue-200 leading-relaxed">
              {language === "es"
                ? "Ingresa la dirección del contrato y la información se completará automáticamente desde DexScreener."
                : "Enter the contract address and the information will be auto-filled from DexScreener."}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1 rounded-xl h-10 bg-transparent">
              {language === "es" ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loadingTokenInfo || !tokenName || !tokenSymbol}
              className="flex-1 rounded-xl h-10"
            >
              {language === "es" ? "Añadir Token" : "Add Token"}
            </Button>
          </div>
        </div>
      </Card>
    </div>,
    document.body,
  )
}
