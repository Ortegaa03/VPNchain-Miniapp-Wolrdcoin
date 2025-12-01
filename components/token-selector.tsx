"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ChevronDown, Check, Plus, Trash2, HelpCircle, AlertCircle, Loader2 } from "lucide-react"
import { SUPPORTED_TOKENS, type Token, getTokenByAddress } from "@/lib/tokens-config"
import { getCustomTokens, deleteCustomToken, saveCustomToken, type CustomToken } from "@/lib/storage-utils"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

type TokenSelectorProps = {
  selectedToken: Token | CustomToken
  onSelectToken: (token: Token | CustomToken) => void
  className?: string
  mode?: "send" | "swap"
}

const iconCache = new Map<string, string | null>()

const fetchTokenIconFromDex = async (address: string): Promise<string | null> => {
  if (iconCache.has(address)) {
    return iconCache.get(address) || null
  }

  try {
    console.log("[v0] TOKEN-SELECTOR: Fetching icon for token from DexScreener:", address)
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`)

    if (!response.ok) {
      console.log("[v0] TOKEN-SELECTOR: DexScreener API response not ok:", response.status)
      iconCache.set(address, null)
      return null
    }

    const data = await response.json()
    console.log("[v0] TOKEN-SELECTOR: DexScreener response for", address, ":", data)

    if (data.pairs && data.pairs.length > 0) {
      const worldchainPairs = data.pairs.filter(
        (pair: any) => pair.chainId === "worldchain" || pair.chainId === "world-chain",
      )

      const pairsToCheck = worldchainPairs.length > 0 ? worldchainPairs : data.pairs

      for (const pair of pairsToCheck) {
        if (pair.info?.imageUrl) {
          console.log("[v0] TOKEN-SELECTOR: Found icon from DexScreener:", pair.info.imageUrl)
          iconCache.set(address, pair.info.imageUrl)
          return pair.info.imageUrl
        }
      }
    }

    console.log("[v0] TOKEN-SELECTOR: No icon found for token:", address)
  } catch (error) {
    console.error("[v0] TOKEN-SELECTOR: Failed to fetch token icon from DexScreener:", error)
  }

  iconCache.set(address, null)
  return null
}

export function TokenSelector({ selectedToken, onSelectToken, className = "", mode = "send" }: TokenSelectorProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [customTokens, setCustomTokens] = useState<CustomToken[]>([])
  const [showImportForm, setShowImportForm] = useState(false)
  const [tokenName, setTokenName] = useState("")
  const [tokenSymbol, setTokenSymbol] = useState("")
  const [tokenAddress, setTokenAddress] = useState("")
  const [tokenDecimals, setTokenDecimals] = useState("18")
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [tokenIcon, setTokenIcon] = useState<string | null>(null)
  const [loadingTokenInfo, setLoadingTokenInfo] = useState(false)
  const [fetchedIcons, setFetchedIcons] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const fetchMissingIcons = async () => {
      const tokensNeedingIcons = customTokens.filter((token) => !token.icon || token.icon.includes("placeholder.svg"))

      for (const token of tokensNeedingIcons) {
        if (!fetchedIcons.has(token.address)) {
          const icon = await fetchTokenIconFromDex(token.address)
          if (icon) {
            setFetchedIcons((prev) => new Map(prev).set(token.address, icon))
            saveCustomToken({ ...token, icon })
          }
        }
      }
    }

    if (customTokens.length > 0) {
      fetchMissingIcons()
    }
  }, [customTokens])

  useEffect(() => {
    setCustomTokens(getCustomTokens())
  }, [])

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
        console.log("[v0] TOKEN-SELECTOR: Fetching complete token info from DexScreener for:", tokenAddress)
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`)

        if (!response.ok) {
          console.log("[v0] TOKEN-SELECTOR: DexScreener API response not ok:", response.status)
          setLoadingTokenInfo(false)
          return
        }

        const data = await response.json()
        console.log("[v0] TOKEN-SELECTOR: DexScreener response:", data)

        if (data.pairs && data.pairs.length > 0) {
          const worldchainPairs = data.pairs.filter(
            (pair: any) => pair.chainId === "worldchain" || pair.chainId === "world-chain",
          )

          const pairsToCheck = worldchainPairs.length > 0 ? worldchainPairs : data.pairs
          const pair = pairsToCheck[0]

          const baseToken = pair.baseToken
          const quoteToken = pair.quoteToken

          const matchingToken = baseToken.address.toLowerCase() === tokenAddress.toLowerCase() ? baseToken : quoteToken

          if (matchingToken) {
            setTokenName(matchingToken.name || "")
            setTokenSymbol(matchingToken.symbol || "")
            console.log(
              "[v0] TOKEN-SELECTOR: ✅ Auto-filled name:",
              matchingToken.name,
              "symbol:",
              matchingToken.symbol,
            )
          }

          if (pair.info?.imageUrl) {
            console.log("[v0] TOKEN-SELECTOR: ✅ Icon found:", pair.info.imageUrl)
            setTokenIcon(pair.info.imageUrl)
          }
        }
      } catch (error) {
        console.error("[v0] TOKEN-SELECTOR: Error fetching token info:", error)
      } finally {
        setLoadingTokenInfo(false)
      }
    }

    const timeoutId = setTimeout(fetchTokenInfo, 500)
    return () => clearTimeout(timeoutId)
  }, [tokenAddress])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setCustomTokens(getCustomTokens())
      setShowImportForm(false)
      resetImportForm()
    }
  }

  const handleDeleteToken = (tokenAddress: string, e: React.MouseEvent) => {
    e.stopPropagation()
    deleteCustomToken(tokenAddress)
    setCustomTokens(getCustomTokens())
  }

  const handleImportToken = () => {
    setInlineError(null)

    if (!tokenName.trim() || !tokenSymbol.trim()) {
      setInlineError("Completa el nombre y símbolo del token")
      return
    }

    if (!tokenAddress || tokenAddress.length < 42) {
      setInlineError("Ingresa una dirección de contrato válida")
      return
    }

    if (mode === "swap") {
      const wldToken = SUPPORTED_TOKENS.find((t) => t.symbol === "WLD")
      if (wldToken && tokenAddress.toLowerCase() === wldToken.address.toLowerCase()) {
        setInlineError("No puedes importar WLD en modo swap")
        return
      }
    }

    const decimals = Number.parseInt(tokenDecimals)
    if (isNaN(decimals) || decimals < 0 || decimals > 18) {
      setInlineError("Decimales debe ser un número entre 0 y 18")
      return
    }

    const success = saveCustomToken({
      name: tokenName.trim(),
      symbol: tokenSymbol.trim().toUpperCase(),
      address: tokenAddress.toLowerCase(),
      decimals,
      icon: tokenIcon || "/placeholder.svg?height=32&width=32&query=" + encodeURIComponent(tokenSymbol.trim()),
    })

    if (success) {
      toast({
        title: "Token añadido",
        description: `${tokenSymbol.toUpperCase()} se añadió a tu lista`,
      })
      setCustomTokens(getCustomTokens())
      setShowImportForm(false)
      resetImportForm()
    } else {
      setInlineError("Este token ya está en tu lista")
    }
  }

  const resetImportForm = () => {
    setTokenName("")
    setTokenSymbol("")
    setTokenAddress("")
    setTokenDecimals("18")
    setTokenIcon(null)
    setInlineError(null)
  }

  const filteredSupportedTokens =
    mode === "swap" ? SUPPORTED_TOKENS.filter((token) => token.symbol !== "WLD") : SUPPORTED_TOKENS

  const filteredCustomTokens =
    mode === "swap"
      ? customTokens.filter((token) => {
          const wldToken = SUPPORTED_TOKENS.find((t) => t.symbol === "WLD")
          return wldToken ? token.address.toLowerCase() !== wldToken.address.toLowerCase() : true
        })
      : customTokens

  const renderTokenIcon = (token: Token | CustomToken) => {
    let iconUrl: string | null = null

    if ("address" in token) {
      const configToken = getTokenByAddress(token.address)
      if (configToken?.icon && !configToken.icon.includes("placeholder.svg")) {
        iconUrl = configToken.icon
      } else if (fetchedIcons.has(token.address)) {
        iconUrl = fetchedIcons.get(token.address) || null
      } else if (token.icon && !token.icon.includes("placeholder.svg")) {
        iconUrl = token.icon
      }
    } else {
      iconUrl = token.icon
    }

    if (iconUrl) {
      return (
        <img
          src={iconUrl || "/placeholder.svg"}
          alt={token.symbol}
          className="h-6 w-6 rounded-full"
          onError={(e) => {
            e.currentTarget.style.display = "none"
          }}
        />
      )
    }
    return (
      <div className="h-6 w-6 rounded-full bg-muted/30 flex items-center justify-center">
        <HelpCircle className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  const getSelectedTokenIcon = () => {
    if ("address" in selectedToken) {
      const configToken = getTokenByAddress(selectedToken.address)
      if (configToken?.icon && !configToken.icon.includes("placeholder.svg")) {
        return configToken.icon
      }
      if (fetchedIcons.has(selectedToken.address)) {
        return fetchedIcons.get(selectedToken.address) || null
      }
      if (selectedToken.icon && !selectedToken.icon.includes("placeholder.svg")) {
        return selectedToken.icon
      }
      return null
    }
    return selectedToken.icon
  }

  const selectedTokenIcon = getSelectedTokenIcon()

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => handleOpenChange(true)}
        className={`rounded-full bg-[#2C2F36] hover:bg-[#3A3E46] border border-border/30 gap-1.5 px-3 h-9 ${className}`}
        variant="outline"
      >
        {selectedTokenIcon ? (
          <img
            src={selectedTokenIcon || "/placeholder.svg"}
            alt={selectedToken.symbol}
            className="h-5 w-5 rounded-full"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        ) : (
          <div className="h-5 w-5 rounded-full bg-muted/30 flex items-center justify-center">
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <span className="font-bold text-sm">{selectedToken.symbol}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md bg-[#0D111C] border-2 border-border/40">
          <DialogHeader>
            <DialogTitle>{showImportForm ? "Importar Token" : "Seleccionar Token"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6 scrollbar-thin scrollbar-thumb-border/40 scrollbar-track-transparent">
            {showImportForm ? (
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
                    <div className="text-sm text-primary">Cargando información del token...</div>
                  </div>
                )}

                {tokenIcon && !loadingTokenInfo && (
                  <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <img src={tokenIcon || "/placeholder.svg"} alt="Token icon" className="h-10 w-10 rounded-full" />
                    <div className="text-sm text-primary">Logo del token detectado</div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Dirección del Contrato *</label>
                  <Input
                    placeholder="0x..."
                    value={tokenAddress}
                    onChange={(e) => setTokenAddress(e.target.value.toLowerCase())}
                    className="rounded-lg font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Nombre del Token</label>
                  <Input
                    placeholder="Se completará automáticamente"
                    value={tokenName}
                    readOnly
                    disabled
                    className="rounded-lg bg-secondary/50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Símbolo</label>
                  <Input
                    placeholder="Se completará automáticamente"
                    value={tokenSymbol}
                    readOnly
                    disabled
                    className="rounded-lg bg-secondary/50 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Decimales</label>
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
                    Ingresa la dirección del contrato y la información se completará automáticamente desde DexScreener.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowImportForm(false)
                      resetImportForm()
                    }}
                    className="flex-1 rounded-xl h-10"
                  >
                    Volver
                  </Button>
                  <Button
                    onClick={handleImportToken}
                    disabled={loadingTokenInfo || !tokenName || !tokenSymbol}
                    className="flex-1 rounded-xl h-10"
                  >
                    Añadir Token
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSupportedTokens.map((token) => (
                  <button
                    key={token.symbol}
                    type="button"
                    onClick={() => {
                      onSelectToken(token)
                      handleOpenChange(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg transition-all
                      ${
                        selectedToken.symbol === token.symbol
                          ? "bg-primary/20 border border-primary/30"
                          : "hover:bg-[#2C2F36] border border-transparent"
                      }
                    `}
                  >
                    {renderTokenIcon(token)}
                    <div className="flex-1 text-left">
                      <div className="font-bold text-sm">{token.symbol}</div>
                      <div className="text-xs text-muted-foreground">{token.name}</div>
                    </div>
                    {selectedToken.symbol === token.symbol && <Check className="h-5 w-5 text-primary" />}
                  </button>
                ))}

                {filteredCustomTokens.length > 0 && (
                  <>
                    <div className="border-t border-border/30 my-3 pt-3">
                      <p className="text-xs text-muted-foreground px-2 mb-2">Tokens Importados</p>
                    </div>
                    {filteredCustomTokens.map((token) => (
                      <button
                        key={token.address}
                        type="button"
                        onClick={() => {
                          onSelectToken(token)
                          handleOpenChange(false)
                        }}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-lg transition-all group
                          ${
                            selectedToken.address === token.address
                              ? "bg-primary/20 border border-primary/30"
                              : "hover:bg-[#2C2F36] border border-transparent"
                          }
                        `}
                      >
                        {renderTokenIcon(token)}
                        <div className="flex-1 text-left">
                          <div className="font-bold text-sm">{token.symbol}</div>
                          <div className="text-xs text-muted-foreground">{token.name}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          {selectedToken.address === token.address && <Check className="h-5 w-5 text-primary" />}
                          <button
                            onClick={(e) => handleDeleteToken(token.address, e)}
                            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-destructive/20 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </button>
                    ))}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowImportForm(true)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg transition-all border-t border-border/30 mt-3 pt-3 hover:bg-primary/10 text-primary"
                >
                  <Plus className="h-6 w-6" />
                  <div className="flex-1 text-left">
                    <div className="font-bold text-sm">Importar Token</div>
                    <div className="text-xs opacity-80">Añadir token personalizado</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
