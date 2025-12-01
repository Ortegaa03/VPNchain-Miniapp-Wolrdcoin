"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Wallet } from "lucide-react"
import { getWorldUser, type SavedWallet } from "@/lib/storage-utils"
import { shortenAddress } from "@/lib/utils"
import { useLanguage } from "@/lib/translations"

type WalletSelectorModalProps = {
  isOpen: boolean
  onClose: () => void
  onSelectWallet: (address: string) => void
}

const getSavedWalletsFromStorage = (worldUserAddress?: string): SavedWallet[] => {
  try {
    const stored = localStorage.getItem("saved_wallets")
    let wallets: SavedWallet[] = stored ? JSON.parse(stored) : []

    console.log("[v0] WALLET_SELECTOR: Raw wallets from storage:", wallets)
    console.log("[v0] WALLET_SELECTOR: World user address:", worldUserAddress)

    if (worldUserAddress) {
      wallets = wallets.filter((w) => w.address.toLowerCase() !== worldUserAddress.toLowerCase())
      console.log("[v0] WALLET_SELECTOR: After filtering world user:", wallets)
    }

    console.log("[v0] WALLET_SELECTOR: Final wallets count:", wallets.length)
    return wallets.slice(0, 3)
  } catch (error) {
    console.error("[v0] WALLET_SELECTOR: Error loading saved wallets:", error)
    return []
  }
}

export function WalletSelectorModal({ isOpen, onClose, onSelectWallet }: WalletSelectorModalProps) {
  const [wallets, setWallets] = useState<SavedWallet[]>([])
  const [mounted, setMounted] = useState(false)
  const { t } = useLanguage()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && mounted) {
      console.log("[v0] WALLET_SELECTOR: Modal opened, loading wallets...")
      const worldUser = getWorldUser()
      const savedWallets = getSavedWalletsFromStorage(worldUser?.walletAddress)

      console.log("[v0] WALLET_SELECTOR: Profile wallet:", worldUser?.walletAddress?.substring(0, 10) + "..." || "none")
      console.log("[v0] WALLET_SELECTOR: Saved wallets to display:", savedWallets.length)

      if (savedWallets.length > 0) {
        console.log(
          "[v0] WALLET_SELECTOR: Wallets:",
          savedWallets.map((w) => ({
            label: w.label,
            address: w.address.substring(0, 10) + "...",
          })),
        )
      }

      setWallets(savedWallets)
    }
  }, [isOpen, mounted])

  if (!mounted || !isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <Card
        className="glass-card p-6 max-w-md w-full relative z-[110] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            {t("savedWallets.modalTitle")}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            ✕
          </Button>
        </div>

        {wallets.length === 0 ? (
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-2">{t("savedWallets.noWallets")}</p>
            <p className="text-xs text-muted-foreground">Ve a Perfil para añadir direcciones frecuentes</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallets.map((wallet) => (
              <button
                key={wallet.address}
                onClick={() => {
                  console.log(
                    "[v0] WALLET_SELECTOR: Wallet selected:",
                    wallet.label,
                    wallet.address.substring(0, 10) + "...",
                  )
                  onSelectWallet(wallet.address)
                  onClose()
                }}
                className="w-full p-3 bg-[#191B1F] hover:bg-primary/10 border border-border/50 hover:border-primary/50 rounded-xl transition-all text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm mb-1">{wallet.label || "Wallet"}</div>
                    <div className="font-mono text-xs text-muted-foreground">{shortenAddress(wallet.address, 6)}</div>
                    <div className="font-mono text-[10px] text-muted-foreground/60 break-all mt-0.5">
                      {wallet.address}
                    </div>
                  </div>
                  <Check className="h-5 w-5 text-primary shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>,
    document.body,
  )
}
