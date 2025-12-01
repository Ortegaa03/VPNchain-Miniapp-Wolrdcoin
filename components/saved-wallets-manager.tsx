"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Trash2, Plus, Check } from "lucide-react"
import { shortenAddress } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/translations"

interface SavedWallet {
  address: string
  label?: string
  addedAt: number
}

interface SavedWalletsManagerProps {
  worldUserAddress?: string
}

export function SavedWalletsManager({ worldUserAddress }: SavedWalletsManagerProps) {
  const { toast } = useToast()
  const { t } = useLanguage()
  const [savedWallets, setSavedWallets] = useState<SavedWallet[]>([])
  const [newWalletAddress, setNewWalletAddress] = useState("")
  const [newWalletLabel, setNewWalletLabel] = useState("")
  const [isAddingWallet, setIsAddingWallet] = useState(false)

  const STORAGE_KEY = "saved_wallets"
  const MAX_WALLETS = 3

  useEffect(() => {
    loadSavedWallets()
  }, [worldUserAddress])

  const loadSavedWallets = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      let wallets: SavedWallet[] = stored ? JSON.parse(stored) : []

      console.log("[v0] SAVED_WALLETS_MANAGER: Raw wallets from storage:", wallets.length)

      if (worldUserAddress) {
        wallets = wallets.filter((w) => w.address.toLowerCase() !== worldUserAddress.toLowerCase())
        console.log("[v0] SAVED_WALLETS_MANAGER: After filtering user wallet:", wallets.length)
      }

      setSavedWallets(wallets.slice(0, MAX_WALLETS))
    } catch (error) {
      console.error("[v0] SAVED_WALLETS_MANAGER: Error loading saved wallets:", error)
    }
  }

  const addWallet = () => {
    if (!newWalletAddress) {
      toast({
        title: t("send.error"),
        description: t("savedWallets.enterAddress"),
        variant: "destructive",
      })
      return
    }

    if (!newWalletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: t("send.error"),
        description: t("savedWallets.enterValidAddress"),
        variant: "destructive",
      })
      return
    }

    if (savedWallets.some((w) => w.address.toLowerCase() === newWalletAddress.toLowerCase())) {
      toast({
        title: t("send.error"),
        description: t("savedWallets.alreadyExists"),
        variant: "destructive",
      })
      return
    }

    if (savedWallets.length >= MAX_WALLETS) {
      toast({
        title: t("savedWallets.limitReached"),
        description: t("savedWallets.limitReachedDesc").replace("{max}", MAX_WALLETS.toString()),
        variant: "destructive",
      })
      return
    }

    const newWallet: SavedWallet = {
      address: newWalletAddress.toLowerCase(),
      label: newWalletLabel || "Wallet",
      addedAt: Date.now(),
    }

    const updated = [...savedWallets, newWallet]
    setSavedWallets(updated.slice(0, MAX_WALLETS))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, MAX_WALLETS)))

    setNewWalletAddress("")
    setNewWalletLabel("")
    setIsAddingWallet(false)

    console.log("[v0] SAVED_WALLETS_MANAGER: Wallet added successfully")

    toast({
      title: t("savedWallets.walletAdded"),
      description: t("savedWallets.walletAddedDesc"),
    })
  }

  const deleteWallet = (address: string) => {
    const updated = savedWallets.filter((w) => w.address.toLowerCase() !== address.toLowerCase())
    setSavedWallets(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    console.log("[v0] SAVED_WALLETS_MANAGER: Wallet deleted successfully")

    toast({
      title: t("savedWallets.walletDeleted"),
      description: t("savedWallets.walletDeletedDesc"),
    })
  }

  const copyToClipboard = (address: string, label: string) => {
    navigator.clipboard.writeText(address)
    toast({
      title: t("savedWallets.copied"),
      description: `${label || "Wallet"} ${t("savedWallets.copied").toLowerCase()}`,
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">
          {t("savedWallets.max")} {MAX_WALLETS}
        </p>
      </div>

      {/* Saved Wallets List */}
      {savedWallets.length > 0 && (
        <div className="space-y-2">
          {savedWallets.map((wallet) => (
            <div key={wallet.address} className="bg-secondary/30 rounded-lg p-3 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{wallet.label}</p>
                <code className="text-xs font-mono text-muted-foreground truncate block">
                  {shortenAddress(wallet.address, 6)}
                </code>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(wallet.address, wallet.label || "Wallet")}
                  className="h-7 w-7 p-0"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteWallet(wallet.address)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Wallet Form */}
      {savedWallets.length < MAX_WALLETS && (
        <>
          {isAddingWallet ? (
            <div className="bg-secondary/20 rounded-lg p-3 space-y-2">
              <Input
                placeholder={t("savedWallets.label")}
                value={newWalletLabel}
                onChange={(e) => setNewWalletLabel(e.target.value)}
                className="text-sm h-8"
              />
              <Input
                placeholder="0x..."
                value={newWalletAddress}
                onChange={(e) => setNewWalletAddress(e.target.value.toLowerCase())}
                className="text-sm font-mono h-8"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addWallet} className="flex-1 h-7">
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {t("savedWallets.save")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingWallet(false)
                    setNewWalletAddress("")
                    setNewWalletLabel("")
                  }}
                  className="flex-1 h-7"
                >
                  {t("savedWallets.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setIsAddingWallet(true)} className="w-full rounded-lg">
              <Plus className="h-4 w-4 mr-2" />
              {t("savedWallets.addWallet")}
            </Button>
          )}
        </>
      )}

      {savedWallets.length === 0 && !isAddingWallet && (
        <p className="text-xs text-muted-foreground text-center py-4">{t("savedWallets.noWallets")}</p>
      )}
    </div>
  )
}
