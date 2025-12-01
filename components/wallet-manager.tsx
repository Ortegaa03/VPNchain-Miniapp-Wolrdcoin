'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Wallet } from 'lucide-react'
import { getSavedWallets, saveWallet, deleteWallet, type SavedWallet } from '@/lib/storage-utils'
import { shortenAddress } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

export function WalletManager() {
  const { toast } = useToast()
  const [wallets, setWallets] = useState<SavedWallet[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newWalletName, setNewWalletName] = useState('')
  const [newWalletAddress, setNewWalletAddress] = useState('')

  useEffect(() => {
    setWallets(getSavedWallets())
  }, [])

  const handleAddWallet = () => {
    if (!newWalletName.trim()) {
      toast({
        title: 'Error',
        description: 'Ingresa un nombre para la wallet',
        variant: 'destructive',
      })
      return
    }

    if (!newWalletAddress || newWalletAddress.length < 42) {
      toast({
        title: 'Error',
        description: 'Ingresa una dirección válida',
        variant: 'destructive',
      })
      return
    }

    const success = saveWallet({
      name: newWalletName.trim(),
      address: newWalletAddress.toLowerCase(),
    })

    if (success) {
      setWallets(getSavedWallets())
      setNewWalletName('')
      setNewWalletAddress('')
      setIsAdding(false)
      toast({
        title: '✅ Wallet guardada',
        description: 'La dirección se añadió a tus frecuentes',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Solo puedes guardar hasta 3 wallets',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteWallet = (walletId: string) => {
    deleteWallet(walletId)
    setWallets(getSavedWallets())
    toast({
      title: '🗑️ Wallet eliminada',
      description: 'La dirección se eliminó de tus frecuentes',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Mis Wallets
        </h3>
        {!isAdding && wallets.length < 3 && (
          <Button
            size="sm"
            onClick={() => setIsAdding(true)}
            className="rounded-xl h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Añadir
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="glass-card-light p-4 space-y-3 border-primary/30">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Nombre</label>
            <Input
              placeholder="Mi Wallet Principal"
              value={newWalletName}
              onChange={(e) => setNewWalletName(e.target.value)}
              maxLength={30}
              className="rounded-lg"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Dirección</label>
            <Input
              placeholder="0x..."
              value={newWalletAddress}
              onChange={(e) => setNewWalletAddress(e.target.value.toLowerCase())}
              className="rounded-lg font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false)
                setNewWalletName('')
                setNewWalletAddress('')
              }}
              className="flex-1 rounded-xl h-9"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAddWallet}
              className="flex-1 rounded-xl h-9"
            >
              Guardar
            </Button>
          </div>
        </Card>
      )}

      {wallets.length === 0 && !isAdding && (
        <div className="text-center py-8 bg-muted/20 rounded-xl">
          <Wallet className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No tienes direcciones guardadas
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Guarda hasta 3 direcciones frecuentes
          </p>
        </div>
      )}

      <div className="space-y-2">
        {wallets.map((wallet) => (
          <Card
            key={wallet.id}
            className="p-3 bg-[#191B1F] border-border/50 hover:border-primary/30 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm mb-1">{wallet.name}</div>
                <div className="font-mono text-xs text-muted-foreground break-all">
                  {shortenAddress(wallet.address, 6)}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground/60 break-all mt-0.5">
                  {wallet.address}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteWallet(wallet.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-xs text-muted-foreground text-center bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
        {wallets.length}/3 direcciones guardadas
      </div>
    </div>
  )
}
