"use client"

import { useState, useEffect } from "react"
import {
  Send,
  Plus,
  ArrowLeftRight,
  Settings,
  UserIcon,
  AtSign,
  RefreshCw,
  Loader2,
  UserCircle,
  Wallet,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SUPPORTED_TOKENS, type Token } from "@/lib/tokens-config"
import { getCustomTokens } from "@/lib/storage-utils"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/lib/translations"
import { useToast } from "@/hooks/use-toast"
import { shortenAddress } from "@/lib/utils"
import { BannerCarousel } from "@/components/banner-carousel"
import { Copy } from "lucide-react"

import { SavedWalletsManager } from "@/components/saved-wallets-manager"
import { TransactionHistory } from "@/components/transaction-history"
import { AddCustomTokenModal } from "@/components/add-custom-token-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type Tab = "wallet" | "history" | "profile"

type TokenWithPrice = Token & {
  priceUSD: number | null
  change24h: number | null
  lastUpdated: number
}

type WorldIDUser = {
  username?: string
  profilePictureUrl?: string
  walletAddress?: string
}

type WalletDashboardProps = {
  worldUser?: WorldIDUser | null
  userType?: "guest" | "user" | "admin" | null
}

const PRICE_CACHE_KEY = "token_prices_cache"
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 horas

export function WalletDashboard({ worldUser: propWorldUser, userType }: WalletDashboardProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<Tab>("wallet")
  const [tokens, setTokens] = useState<TokenWithPrice[]>([])
  const [worldUser, setWorldUser] = useState<WorldIDUser | null>(propWorldUser || null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isImportTokenModalOpen, setIsImportTokenModalOpen] = useState(false)
  const [isWalletsModalOpen, setIsWalletsModalOpen] = useState(false)

  useEffect(() => {
    if (propWorldUser) {
      setWorldUser(propWorldUser)
    }

    loadTokensWithPrices()
  }, [propWorldUser])

  const loadTokensWithPrices = async () => {
    const supportedTokens = SUPPORTED_TOKENS
    const customTokens = getCustomTokens()
    const allTokens = [...supportedTokens, ...customTokens]

    const cachedPrices = loadPriceCache()
    const now = Date.now()

    const tokensWithPrices: TokenWithPrice[] = []

    for (const token of allTokens) {
      const cached = cachedPrices[token.address.toLowerCase()]

      if (cached && now - cached.lastUpdated < CACHE_DURATION) {
        tokensWithPrices.push({
          ...token,
          priceUSD: cached.priceUSD,
          change24h: cached.change24h,
          lastUpdated: cached.lastUpdated,
        })
      } else {
        const priceData = await fetchTokenPrice(token.address)
        tokensWithPrices.push({
          ...token,
          ...priceData,
        })

        if (priceData.priceUSD !== null) {
          cachedPrices[token.address.toLowerCase()] = priceData
        }
      }
    }

    setTokens(tokensWithPrices)
    savePriceCache(cachedPrices)
  }

  const fetchTokenPrice = async (
    tokenAddress: string,
  ): Promise<{
    priceUSD: number | null
    change24h: number | null
    lastUpdated: number
  }> => {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`)

      if (!response.ok) {
        return { priceUSD: null, change24h: null, lastUpdated: Date.now() }
      }

      const data = await response.json()

      if (data.pairs && data.pairs.length > 0) {
        const worldchainPairs = data.pairs.filter((p: any) => p.chainId?.toLowerCase() === "worldchain")

        if (worldchainPairs.length === 0) {
          return { priceUSD: null, change24h: null, lastUpdated: Date.now() }
        }

        const wethPair =
          worldchainPairs.find(
            (p: any) =>
              p.baseToken?.symbol?.toUpperCase() === "WETH" ||
              p.quoteToken?.symbol?.toUpperCase() === "WETH" ||
              p.baseToken?.symbol?.toUpperCase() === "ETH" ||
              p.quoteToken?.symbol?.toUpperCase() === "ETH",
          ) || worldchainPairs[0]

        const priceUSD = Number.parseFloat(wethPair.priceUsd) || null
        const change24h = Number.parseFloat(wethPair.priceChange?.h24) || null

        return {
          priceUSD,
          change24h,
          lastUpdated: Date.now(),
        }
      }

      return { priceUSD: null, change24h: null, lastUpdated: Date.now() }
    } catch (error) {
      console.error("Error fetching token price:", error)
      return { priceUSD: null, change24h: null, lastUpdated: Date.now() }
    }
  }

  const loadPriceCache = (): Record<string, { priceUSD: number; change24h: number; lastUpdated: number }> => {
    try {
      const cached = localStorage.getItem(PRICE_CACHE_KEY)
      return cached ? JSON.parse(cached) : {}
    } catch {
      return {}
    }
  }

  const savePriceCache = (cache: Record<string, any>) => {
    try {
      localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.error("Error saving price cache:", error)
    }
  }

  const formatPrice = (price: number): string => {
    if (price < 0.0001) {
      return `$${price.toFixed(6)}`
    } else if (price < 0.01) {
      return `$${price.toFixed(4)}`
    } else if (price < 1) {
      return `$${price.toFixed(4)}`
    } else {
      return `$${price.toFixed(2)}`
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: t("invoice.copied"),
      description: `${label} ${t("invoice.copied").toLowerCase()}`,
    })
  }

  const handleRefreshTokens = async () => {
    setIsRefreshing(true)
    await loadTokensWithPrices()
    setIsRefreshing(false)
    toast({
      title: t("home.tokensUpdated"),
      description: t("home.pricesUpdated"),
    })
  }

  const actions = [
    {
      icon: Send,
      label: t("home.send"),
      color: "from-cyan-500 to-blue-500",
      onClick: () => router.push("/send"),
    },
    {
      icon: ArrowLeftRight,
      label: t("home.swap"),
      color: "from-cyan-500 to-blue-500",
      onClick: () => router.push("/swap"),
    },
    {
      icon: Settings,
      label: t("home.wallets"),
      color: "from-cyan-500 to-blue-500",
      onClick: () => setIsWalletsModalOpen(true),
    },
    {
      icon: Plus,
      label: t("home.import"),
      color: "from-cyan-500 to-blue-500",
      onClick: () => setIsImportTokenModalOpen(true),
    },
  ]

  return (
    <div className="space-y-6 pb-32 overflow-hidden">
      {worldUser && (
        <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl">
          {worldUser.profilePictureUrl && (
            <div className="relative">
              <img
                src={worldUser.profilePictureUrl || "/placeholder.svg"}
                alt="Profile"
                className="h-16 w-16 rounded-full border-2 border-primary/30"
              />
            </div>
          )}
          {!worldUser.profilePictureUrl && (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <UserCircle className="h-10 w-10 text-primary" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-lg font-bold">{worldUser.username || "World ID User"}</h3>
            {worldUser.walletAddress && (
              <p className="text-sm text-muted-foreground font-mono">{shortenAddress(worldUser.walletAddress, 4)}</p>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 px-2 pt-4">
        {actions.map((action) => (
          <button key={action.label} onClick={action.onClick} className="flex flex-col items-center gap-2 group">
            <div
              className={`
              w-16 h-16 rounded-full bg-gradient-to-br ${action.color}
              flex items-center justify-center
              shadow-lg shadow-cyan-500/30
              transition-transform group-hover:scale-105 group-active:scale-95
            `}
            >
              <action.icon className="h-7 w-7 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-medium text-foreground">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="pt-2">
        <BannerCarousel />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("wallet")}
          className={`
            flex-1 py-3 px-6 rounded-xl font-semibold text-base transition-all
            ${
              activeTab === "wallet"
                ? "bg-foreground text-background shadow-lg"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary/70"
            }
          `}
        >
          {t("home.wallet")}
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`
            flex-1 py-3 px-6 rounded-xl font-semibold text-base transition-all
            ${
              activeTab === "history"
                ? "bg-foreground text-background shadow-lg"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary/70"
            }
          `}
        >
          {t("home.history")}
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`
            flex-1 py-3 px-6 rounded-xl font-semibold text-base transition-all
            ${
              activeTab === "profile"
                ? "bg-foreground text-background shadow-lg"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary/70"
            }
          `}
        >
          {t("home.profile")}
        </button>
      </div>

      {/* Tokens List */}
      {activeTab === "wallet" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground px-1">{t("home.tokens")}</h2>
            <Button variant="ghost" size="sm" onClick={handleRefreshTokens} disabled={isRefreshing} className="text-xs">
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {t("home.refresh")}
            </Button>
          </div>

          {tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">{t("home.loading")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens
                .filter((token) =>
                  SUPPORTED_TOKENS.some((st) => st.address.toLowerCase() === token.address.toLowerCase()),
                )
                .map((token) => (
                  <Card
                    key={token.address}
                    className="p-4 bg-card hover:bg-card/80 transition-colors cursor-pointer border-2 border-border/80"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                          {token.icon && !token.icon.includes("placeholder.svg") ? (
                            <img
                              src={token.icon || "/placeholder.svg"}
                              alt={token.symbol}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                          <div
                            className="fallback-symbol w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10"
                            style={{ display: token.icon && !token.icon.includes("placeholder.svg") ? "none" : "flex" }}
                          >
                            <span className="text-lg font-bold text-primary">
                              {token.symbol.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground">{token.name}</h3>
                          <p className="text-sm text-muted-foreground">{token.symbol}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        {token.priceUSD !== null ? (
                          <>
                            <p className="font-semibold text-foreground">{formatPrice(token.priceUSD)}</p>
                            {token.change24h !== null && (
                              <p
                                className={`text-sm font-medium flex items-center justify-end gap-1 ${
                                  token.change24h >= 0 ? "text-green-500" : "text-red-500"
                                }`}
                              >
                                {token.change24h >= 0 ? "▲" : "▼"} {Math.abs(token.change24h).toFixed(2)}%
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t("home.notAvailable")}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

              {getCustomTokens().length > 0 && (
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("home.importedTokens")}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-border via-border to-transparent" />
                </div>
              )}

              {tokens
                .filter(
                  (token) => !SUPPORTED_TOKENS.some((st) => st.address.toLowerCase() === token.address.toLowerCase()),
                )
                .map((token) => (
                  <Card
                    key={token.address}
                    className="p-4 bg-card hover:bg-card/80 transition-colors cursor-pointer border-2 border-primary/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                          {token.icon && !token.icon.includes("placeholder.svg") ? (
                            <img
                              src={token.icon || "/placeholder.svg"}
                              alt={token.symbol}
                              className="w-full h-full object-cover"
                            />
                          ) : null}
                          <div
                            className="fallback-symbol w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10"
                            style={{ display: token.icon && !token.icon.includes("placeholder.svg") ? "none" : "flex" }}
                          >
                            <span className="text-lg font-bold text-primary">
                              {token.symbol.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground">{token.name}</h3>
                          <p className="text-sm text-muted-foreground">{token.symbol}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        {token.priceUSD !== null ? (
                          <>
                            <p className="font-semibold text-foreground">{formatPrice(token.priceUSD)}</p>
                            {token.change24h !== null && (
                              <p
                                className={`text-sm font-medium flex items-center justify-end gap-1 ${
                                  token.change24h >= 0 ? "text-green-500" : "text-red-500"
                                }`}
                              >
                                {token.change24h >= 0 ? "▲" : "▼"} {Math.abs(token.change24h).toFixed(2)}%
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t("home.notAvailable")}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          <TransactionHistory userAddress={worldUser?.walletAddress} />
        </div>
      )}

      {activeTab === "profile" && (
        <div className="space-y-4">
          {worldUser ? (
            <>
              <Card className="p-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
                  <UserIcon className="h-6 w-6 text-primary" />
                  {t("profile.worldID")}
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-center mb-6">
                    {worldUser.profilePictureUrl ? (
                      <img
                        src={worldUser.profilePictureUrl || "/placeholder.svg"}
                        alt="Profile"
                        className="h-24 w-24 rounded-full border-4 border-primary/30"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <UserCircle className="h-16 w-16 text-primary" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <AtSign className="h-5 w-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{t("home.username")}</p>
                        <p className="text-lg font-semibold">{worldUser.username || "Usuario"}</p>
                      </div>
                    </div>

                    {worldUser.walletAddress && (
                      <div className="flex items-start gap-3">
                        <Wallet className="h-5 w-5 text-primary mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">{t("home.walletAddress")}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-sm font-mono bg-secondary/50 rounded-lg px-3 py-1.5 flex-1">
                              {shortenAddress(worldUser.walletAddress, 6)}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (worldUser.walletAddress) {
                                  copyToClipboard(worldUser.walletAddress, "Wallet Address")
                                }
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <Wallet className="h-6 w-6 text-primary" />
                  {t("savedWallets.title")}
                </h2>
                <SavedWalletsManager worldUserAddress={worldUser.walletAddress} />
              </Card>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <UserCircle className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">{t("home.noWorldID")}</p>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddCustomTokenModal
        isOpen={isImportTokenModalOpen}
        onClose={() => setIsImportTokenModalOpen(false)}
        onTokenAdded={() => {
          loadTokensWithPrices()
          toast({
            title: t("home.tokenAdded"),
            description: t("home.tokenAddedDesc"),
          })
        }}
      />

      <Dialog open={isWalletsModalOpen} onOpenChange={setIsWalletsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {t("savedWallets.title")}
            </DialogTitle>
          </DialogHeader>
          <SavedWalletsManager worldUserAddress={worldUser?.walletAddress} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
