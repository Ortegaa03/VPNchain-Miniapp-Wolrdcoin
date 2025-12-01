import { MiniKit } from "@worldcoin/minikit-js"

export type UserType = "world"

export interface WorldUser {
  walletAddress: string
  username?: string
  profilePictureUrl?: string
  verificationLevel?: "orb" | "device"
}

export type SavedWallet = {
  id: string
  name: string
  address: string
}

export type CustomToken = {
  symbol: string
  name: string
  address: string
  decimals: number
  icon: string
  isCustom: true
}

const MAX_WALLETS = 3

// Frequent Wallets Management
export function getSavedWallets(): SavedWallet[] {
  const userId = getUserId()
  const key = `vpnchain_wallets_${userId}`
  const saved = localStorage.getItem(key)
  return saved ? JSON.parse(saved) : []
}

export function saveWallet(wallet: Omit<SavedWallet, "id">): boolean {
  const userId = getUserId()
  const wallets = getSavedWallets()

  if (wallets.length >= MAX_WALLETS) {
    return false
  }

  const newWallet: SavedWallet = {
    ...wallet,
    id: Date.now().toString(),
  }

  wallets.push(newWallet)

  const key = `vpnchain_wallets_${userId}`
  localStorage.setItem(key, JSON.stringify(wallets))
  return true
}

export function deleteWallet(walletId: string): void {
  const userId = getUserId()
  const wallets = getSavedWallets()
  const filtered = wallets.filter((w) => w.id !== walletId)

  const key = `vpnchain_wallets_${userId}`
  localStorage.setItem(key, JSON.stringify(filtered))
}

export function saveProfileWallet(walletAddress: string): void {
  const userId = getUserId()
  const key = `vpnchain_wallets_${userId}`
  const wallets = getSavedWallets()

  const profileWalletExists = wallets.some(
    (w) => w.address.toLowerCase() === walletAddress.toLowerCase() && w.name === "Worldcoin Wallet",
  )

  if (!profileWalletExists) {
    const profileWallet: SavedWallet = {
      id: "profile-wallet",
      name: "Worldcoin Wallet",
      address: walletAddress.toLowerCase(),
    }

    wallets.unshift(profileWallet) // Add at the beginning
    localStorage.setItem(key, JSON.stringify(wallets))
    console.log("[v0] STORAGE: Profile wallet saved:", walletAddress.substring(0, 10) + "...")
  }
}

// Custom Tokens Management
export function getCustomTokens(): CustomToken[] {
  const userId = getUserId()
  const key = `vpnchain_tokens_${userId}`
  const saved = localStorage.getItem(key)
  const tokens = saved ? JSON.parse(saved) : []

  return tokens
}

export function saveCustomToken(token: Omit<CustomToken, "isCustom">): boolean {
  const userId = getUserId()
  const tokens = getCustomTokens()

  console.log("[v0] STORAGE: Saving new token:", token.symbol)

  // Check if token already exists
  if (tokens.some((t) => t.address.toLowerCase() === token.address.toLowerCase())) {
    console.log("[v0] STORAGE: Token already exists")
    return false
  }

  const newToken: CustomToken = {
    ...token,
    isCustom: true,
  }

  tokens.push(newToken)

  const key = `vpnchain_tokens_${userId}`
  localStorage.setItem(key, JSON.stringify(tokens))
  console.log("[v0] STORAGE: Token saved successfully")

  return true
}

export function deleteCustomToken(tokenAddress: string): void {
  const userId = getUserId()
  const tokens = getCustomTokens()
  const filtered = tokens.filter((t) => t.address.toLowerCase() !== tokenAddress.toLowerCase())

  const key = `vpnchain_tokens_${userId}`
  localStorage.setItem(key, JSON.stringify(filtered))
}

// World ID Management
export function getWorldUser(): WorldUser | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const cached = sessionStorage.getItem("vpnchain_world_user")

    if (cached) {
      return JSON.parse(cached)
    }

    const walletAddress = MiniKit.walletAddress

    if (!walletAddress) {
      return null
    }

    return { walletAddress }
  } catch (error) {
    console.error("[v0] STORAGE: Error getting World user:", error)
    return null
  }
}

export async function fetchWorldUserDetails(): Promise<WorldUser | null> {
  console.log("[v0] STORAGE: Fetching detailed World user info...")

  try {
    const walletAddress = MiniKit.walletAddress

    if (!walletAddress) {
      console.log("[v0] STORAGE: No wallet address available")
      return null
    }

    const userData = await MiniKit.getUserByAddress(walletAddress)

    if (userData) {
      const worldUser: WorldUser = {
        walletAddress: userData.walletAddress || walletAddress,
        username: userData.username,
        profilePictureUrl: userData.profilePictureUrl,
      }

      console.log("[v0] STORAGE: Got detailed user data for:", userData.username || walletAddress)
      saveWorldUser(worldUser)
      return worldUser
    }

    return { walletAddress }
  } catch (error) {
    console.error("[v0] STORAGE: Error fetching user details:", error)
    return null
  }
}

export function saveWorldUser(user: WorldUser): void {
  console.log("[v0] STORAGE: Saving World user:", user.username || user.walletAddress.substring(0, 10) + "...")
  sessionStorage.setItem("vpnchain_world_user", JSON.stringify(user))
}

export function clearWorldUser(): void {
  sessionStorage.removeItem("vpnchain_world_user")
  console.log("[v0] WORLD: Cleared user data")
}

// Simplified functions for compatibility
export function detectUserType(): UserType {
  return "world"
}

export function isGuestUser(): boolean {
  return false
}

export function clearGuestData(): void {
  // No-op since we don't have guest mode anymore
}

export function getUserId(): string {
  if (typeof window === "undefined") {
    return "world-ssr"
  }

  const worldUser = getWorldUser()
  return worldUser ? `world_${worldUser.walletAddress}` : "world-unknown"
}

// Transaction History Tracking for Retry Logic
export interface TransactionAttempt {
  id: string
  type: "send" | "swap"
  amount: number
  tokenSymbol: string
  recipientOrToken: string
  timestamp: number
  status: "pending" | "success" | "failed"
  txHash?: string
  error?: string
}

export interface TransactionRecord {
  id: string // Unique ID for this record
  routeId?: number // Route ID from VPNchain contract
  type: "send" | "receive" | "swap"
  status: "pending" | "processing" | "completed" | "failed"

  // Transaction details
  amount: string
  tokenSymbol: string
  tokenAddress: string
  tokenDecimals: number

  // Addresses
  from: string
  to: string

  // Timestamps
  createdAt: number
  completedAt?: number

  // Transaction hashes
  userTxHash?: string // User's initial transaction
  routeTxHash?: string // VPNchain routing transaction

  // Transfer mode for sends
  transferMode?: "instant" | "secure"

  // Route progress (for secure mode)
  totalSteps?: number
  completedSteps?: number
  estimatedTime?: number

  // Error tracking
  error?: string
  retryCount: number
}

// Get all transaction history for current user
export function getTransactionHistory(): TransactionRecord[] {
  if (typeof window === "undefined") {
    console.log("[v0] STORAGE: SSR detected, returning empty history")
    return []
  }

  const userId = getUserId()
  const key = `vpnchain_tx_history_${userId}`

  try {
    const saved = localStorage.getItem(key)
    if (!saved) return []

    const history: TransactionRecord[] = JSON.parse(saved)

    // Sort by createdAt descending (newest first)
    return history.sort((a, b) => b.createdAt - a.createdAt)
  } catch (error) {
    console.error("[v0] STORAGE: Error loading transaction history:", error)
    return []
  }
}

// Save a new transaction to history
export function saveTransaction(tx: TransactionRecord): void {
  if (typeof window === "undefined") {
    console.log("[v0] STORAGE: SSR detected, skipping transaction save")
    return
  }

  const userId = getUserId()
  const history = getTransactionHistory()

  // Keep only last 100 transactions
  if (history.length >= 100) {
    history.pop() // Remove oldest
  }

  history.unshift(tx) // Add to beginning (newest)

  const key = `vpnchain_tx_history_${userId}`
  localStorage.setItem(key, JSON.stringify(history))

  console.log("[v0] STORAGE: Transaction saved to history:", tx.id, tx.type)
}

// Update existing transaction
export function updateTransaction(txId: string, updates: Partial<TransactionRecord>): void {
  if (typeof window === "undefined") {
    console.log("[v0] STORAGE: SSR detected, skipping transaction update")
    return
  }

  const userId = getUserId()
  const history = getTransactionHistory()

  const tx = history.find((t) => t.id === txId)
  if (tx) {
    Object.assign(tx, updates)

    const key = `vpnchain_tx_history_${userId}`
    localStorage.setItem(key, JSON.stringify(history))

    console.log("[v0] STORAGE: Transaction updated:", txId, updates.status)
  }
}

// Check if user has received tokens (for receive history)
export function checkForReceivedTokens(userAddress: string): TransactionRecord[] {
  const history = getTransactionHistory()

  // Filter transactions where user is the receiver
  return history.filter((tx) => tx.to.toLowerCase() === userAddress.toLowerCase() && tx.type === "receive")
}

// Get failed transaction count for retry fee logic
export function getFailedAttemptsCount(recipientOrToken: string, type: "send" | "swap"): number {
  const history = getTransactionHistory()
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000

  return history.filter(
    (tx) =>
      tx.type === type &&
      (tx.to.toLowerCase() === recipientOrToken.toLowerCase() ||
        tx.tokenAddress.toLowerCase() === recipientOrToken.toLowerCase()) &&
      tx.status === "failed" &&
      tx.createdAt > oneDayAgo,
  ).length
}

// Get pending transactions that need monitoring
export function getPendingTransactions(): TransactionRecord[] {
  const history = getTransactionHistory()
  return history.filter((tx) => tx.status === "pending" || tx.status === "processing")
}

// Clean up old completed transactions (older than 30 days)
export function cleanupOldTransactions(): void {
  if (typeof window === "undefined") {
    return
  }

  const userId = getUserId()
  const history = getTransactionHistory()
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  const filtered = history.filter((tx) => {
    // Keep all pending/processing transactions
    if (tx.status === "pending" || tx.status === "processing") return true

    // Keep recent transactions (last 30 days)
    if (tx.createdAt > thirtyDaysAgo) return true

    return false
  })

  const key = `vpnchain_tx_history_${userId}`
  localStorage.setItem(key, JSON.stringify(filtered))

  console.log("[v0] STORAGE: Cleaned up old transactions, kept", filtered.length, "of", history.length)
}
