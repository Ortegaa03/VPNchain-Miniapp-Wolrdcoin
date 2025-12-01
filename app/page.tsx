"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Shield, Zap, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MiniKit } from "@worldcoin/minikit-js"
import { detectUserType, saveWorldUser, type WorldUser } from "@/lib/storage-utils"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/lib/translations"

export default function LandingPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguage()
  const [isInitializing, setIsInitializing] = useState(false)
  const [isWorldApp, setIsWorldApp] = useState(false)

  useEffect(() => {
    const userType = detectUserType()
    setIsWorldApp(userType === "world")
    console.log("[v0] LANDING: User type detected:", userType)
  }, [])

  const handleStart = async () => {
    setIsInitializing(true)

    try {
      const userType = detectUserType()
      console.log("[v0] LANDING: Starting with user type:", userType)

      if (userType === "world") {
        console.log("[v0] LANDING: Authenticating with World ID...")
        await authenticateWithWorldID()
      } else {
        console.log("[v0] LANDING: Proceeding as guest")
        router.push("/home")
      }
    } catch (error) {
      console.error("[v0] LANDING: Error during initialization:", error)
      toast({
        title: t("error.title"),
        description: t("landing.errorRetry"),
        variant: "destructive",
      })
      setIsInitializing(false)
    }
  }

  const authenticateWithWorldID = async () => {
    try {
      console.log("[v0] WORLD: Starting authentication...")
      console.log("[v0] WORLD: MiniKit installed?", MiniKit.isInstalled())

      if (!MiniKit.isInstalled()) {
        console.error("[v0] WORLD: MiniKit not installed, redirecting to home")
        router.push("/home")
        return
      }

      console.log("[v0] WORLD: Fetching nonce from /api/nonce...")
      const nonceRes = await fetch("/api/nonce")
      const { nonce } = await nonceRes.json()
      console.log("[v0] WORLD: Nonce received:", nonce.substring(0, 10) + "...")

      console.log("[v0] WORLD: Requesting wallet auth from MiniKit...")
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({
        nonce,
        expirationTime: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
        statement: "Iniciar sesión en VPNchain Privacy Protocol",
      })

      console.log("[v0] WORLD: Wallet auth response status:", finalPayload.status)

      if (finalPayload.status === "error") {
        console.error("[v0] WORLD: Wallet auth failed with error:", finalPayload)
        toast({
          title: t("landing.authError"),
          description: t("landing.verifyError"),
          variant: "destructive",
        })
        setIsInitializing(false)
        return
      }

      const walletAddress = finalPayload.address
      console.log("[v0] WORLD: Wallet address from payload:", walletAddress)

      console.log("[v0] WORLD: Sending verification request to /api/complete-siwe...")
      const verifyRes = await fetch("/api/complete-siwe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payload: finalPayload,
          nonce,
        }),
      })

      const verifyData = await verifyRes.json()
      console.log("[v0] WORLD: Backend verification result:", JSON.stringify(verifyData, null, 2))

      if (verifyData.status === "success" && verifyData.isValid) {
        console.log("[v0] WORLD: Authentication successful!")

        let username: string | undefined
        let profilePictureUrl: string | undefined

        console.log("[v0] WORLD: Checking MiniKit.user data...")
        if (MiniKit.user) {
          console.log("[v0] WORLD: MiniKit.user available:", JSON.stringify(MiniKit.user, null, 2))
          username = MiniKit.user.username
          profilePictureUrl = MiniKit.user.profilePictureUrl
        } else {
          console.log("[v0] WORLD: MiniKit.user not available, trying getUserByAddress...")
          try {
            const userDetails = await MiniKit.getUserByAddress(walletAddress)
            console.log("[v0] WORLD: User details from getUserByAddress:", JSON.stringify(userDetails, null, 2))
            username = userDetails?.username
            profilePictureUrl = userDetails?.profilePictureUrl
          } catch (error) {
            console.log("[v0] WORLD: getUserByAddress failed:", error)
          }
        }

        const worldUser: WorldUser = {
          walletAddress,
          username: username || `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`,
          profilePictureUrl,
        }

        console.log("[v0] WORLD: Final user data to save:", JSON.stringify(worldUser, null, 2))
        saveWorldUser(worldUser)

        toast({
          title: t("landing.authSuccess"),
          description: `${t("landing.welcome")} ${worldUser.username}`,
        })

        console.log("[v0] WORLD: Redirecting to /home...")
        router.push("/home")
      } else {
        console.error("[v0] WORLD: Verification failed. isValid:", verifyData.isValid)
        toast({
          title: t("error.title"),
          description: t("landing.verifyError"),
          variant: "destructive",
        })
        setIsInitializing(false)
      }
    } catch (error) {
      console.error("[v0] WORLD: Authentication error:", error)
      console.error("[v0] WORLD: Error stack:", (error as Error).stack)
      toast({
        title: t("error.title"),
        description: t("landing.worldIDError"),
        variant: "destructive",
      })
      setIsInitializing(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="w-10 h-10 text-white" strokeWidth={2} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            {t("landing.title")}
          </h1>
          <p className="text-lg text-muted-foreground mb-2">{t("landing.subtitle")}</p>
          <p className="text-sm text-muted-foreground/70 max-w-sm mx-auto">{t("landing.description")}</p>
        </div>

        {isWorldApp && (
          <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-sm text-center text-muted-foreground">{t("landing.worldAppDetected")}</p>
          </div>
        )}

        {/* Features */}
        <div className="space-y-3 mb-8">
          <div className="glass-card p-4 rounded-2xl flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{t("landing.privacyTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("landing.privacyDescription")}</p>
            </div>
          </div>

          <div className="glass-card p-4 rounded-2xl flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">{t("landing.fastTitle")}</h3>
              <p className="text-xs text-muted-foreground">{t("landing.fastDescription")}</p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <Button
          onClick={handleStart}
          disabled={isInitializing}
          className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/30"
        >
          {isInitializing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              {isWorldApp ? t("landing.authenticating") : t("landing.starting")}
            </>
          ) : isWorldApp ? (
            t("landing.verifyWorldID")
          ) : (
            t("landing.start")
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground/60 mt-6">{t("landing.terms")}</p>
      </div>
    </main>
  )
}
