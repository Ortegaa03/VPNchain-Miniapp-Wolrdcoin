import { NextResponse } from "next/server"
import { ethers } from "ethers"
import { APP_CONFIG } from "@/lib/config"
import { VPNCHAIN_ROUTER_V6_ABI } from "@/lib/contract-abi"

const INFURA_RPC_URL = process.env.NEXT_PUBLIC_RPC_PROVIDER_URL || "https://worldchain-mainnet.g.alchemy.com/public"
const PRIVATE_KEY = process.env.PRIVATE_KEY

if (!PRIVATE_KEY) {
  console.error("[v0] ❌ PRIVATE_KEY not configured")
}

export async function POST(request: Request) {
  console.log("\n[v0] ==========================================")
  console.log("[v0] 📤 SEND API: Request received")
  console.log("[v0] ==========================================")

  try {
    const body = await request.json()
    const {
      amount,
      tokenAddress,
      recipientWallet,
      tokenDecimals = 18,
      tokenSymbol,
      transferMode = "instant",
      senderAddress,
      userTxHash,
      txAttemptId,
      failedAttempts,
    } = body

    console.log("[v0] SEND API: Request parameters:")
    console.log("[v0] - Amount (FULL amount sent to contract):", amount)
    console.log("[v0] - Token Address:", tokenAddress)
    console.log("[v0] - Token Symbol:", tokenSymbol)
    console.log("[v0] - Token Decimals:", tokenDecimals)
    console.log("[v0] - Recipient Wallet:", recipientWallet)
    console.log("[v0] - Transfer Mode:", transferMode)
    console.log("[v0] - Sender Address:", senderAddress)
    console.log("[v0] - User Transaction Hash:", userTxHash)
    console.log("[v0] - Transaction Attempt ID:", txAttemptId)
    console.log("[v0] - Previous failed attempts:", failedAttempts || 0)

    if (!amount || !tokenAddress || !recipientWallet) {
      console.error("[v0] ❌ SEND API: Missing required parameters")
      return NextResponse.json({ success: false, error: "Faltan parámetros requeridos" }, { status: 400 })
    }

    if (!PRIVATE_KEY) {
      console.error("[v0] ❌ SEND API: PRIVATE_KEY not configured")
      return NextResponse.json({ success: false, error: "Configuración del servidor incompleta" }, { status: 500 })
    }

    console.log("[v0] ✅ SEND API: All parameters validated")
    console.log("[v0] 🔧 SEND API: Setting up provider and wallet...")

    const provider = new ethers.JsonRpcProvider(INFURA_RPC_URL)
    const botWallet = new ethers.Wallet(PRIVATE_KEY, provider)

    console.log("[v0] ✅ SEND API: Bot wallet initialized (owner):", botWallet.address)

    const routerContract = new ethers.Contract(APP_CONFIG.CONTRACT_ADDRESS, VPNCHAIN_ROUTER_V6_ABI, botWallet)

    console.log("[v0] ✅ SEND API: Router contract initialized at:", APP_CONFIG.CONTRACT_ADDRESS)

    const amountInWei = ethers.parseUnits(amount.toString(), tokenDecimals)
    console.log("[v0] 📊 SEND API: Amount in wei (full amount):", amountInWei.toString())

    console.log("[v0] ⏳ SEND API: Waiting 2-3 seconds for user transaction confirmation...")
    await new Promise((resolve) => setTimeout(resolve, 2500))

    console.log("[v0] ==========================================")
    console.log("[v0] 🚀 Calling VPN Chain Router as OWNER...")
    console.log("[v0] ℹ️  Tokens are in the contract, owner can move them directly")
    console.log("[v0] ℹ️  No internalBalance check for owner")
    console.log("[v0] ==========================================")

    let routeTx
    let functionName = ""
    let routeId: number | undefined

    try {
      if (transferMode === "instant") {
        functionName = "sendInstant"
        console.log("[v0] 📝 SEND API: Calling sendInstant...")

        console.log("[v0] 📤 SEND API: Executing sendInstant...")
        routeTx = await routerContract.sendInstant(tokenAddress, recipientWallet, amountInWei, tokenDecimals)
      } else {
        functionName = "sendSecure"
        console.log("[v0] 📝 SEND API: Calling sendSecure...")

        console.log("[v0] 📤 SEND API: Executing sendSecure...")
        routeTx = await routerContract.sendSecure(tokenAddress, recipientWallet, amountInWei, false, 0, tokenDecimals)
      }

      console.log("[v0] ⏳ SEND API:", functionName, "transaction sent:", routeTx.hash)
      console.log("[v0] ⏳ SEND API: Waiting for confirmation...")

      const routeReceipt = await routeTx.wait()
      console.log("[v0] ✅ SEND API:", functionName, "confirmed!")
      console.log("[v0] - Block:", routeReceipt.blockNumber)
      console.log("[v0] - Gas used:", routeReceipt.gasUsed.toString())
      console.log("[v0] - Status:", routeReceipt.status === 1 ? "SUCCESS" : "FAILED")
      console.log("[v0] - Logs count:", routeReceipt.logs.length)

      if (routeReceipt.status === 0) {
        console.error("[v0] ❌ SEND API:", functionName, "transaction reverted")
        throw new Error(`La transacción ${functionName} fue revertida`)
      }

      for (const log of routeReceipt.logs) {
        try {
          const parsed = routerContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          })

          if (parsed && parsed.name === "RouteCreated") {
            routeId = Number(parsed.args.id)
            console.log("[v0] ✅ SEND API: Extracted routeId from event:", routeId)
            break
          }
        } catch (e) {
          // Not our event, continue
        }
      }

      console.log("[v0] ==========================================")
      console.log("[v0] ✅✅ SEND COMPLETED SUCCESSFULLY ✅✅")
      console.log("[v0] ==========================================")
      console.log("[v0] - Function:", functionName)
      console.log("[v0] - Route ID:", routeId)
      console.log("[v0] - Amount sent:", amount, tokenSymbol)
      console.log("[v0] - Recipient:", recipientWallet)
      console.log("[v0] - User Transaction:", userTxHash)
      console.log("[v0] - Routing Transaction:", routeTx.hash)
      console.log("[v0] ==========================================\n")

      return NextResponse.json({
        success: true,
        transferMode,
        functionName,
        amount,
        tokenSymbol,
        recipient: recipientWallet,
        userTxHash,
        txHash: routeTx.hash,
        routeId,
        blockNumber: routeReceipt.blockNumber,
        gasUsed: routeReceipt.gasUsed.toString(),
      })
    } catch (error: any) {
      console.error("[v0] ❌ SEND API: Error during", functionName, ":")
      console.error("[v0] - Message:", error.message)
      console.error("[v0] - Code:", error.code)
      console.error("[v0] - Data:", error.data)

      if (error.data) {
        console.error("[v0] - Error data (hex):", error.data)
        try {
          const errorInterface = new ethers.Interface(VPNCHAIN_ROUTER_V6_ABI)
          const decodedError = errorInterface.parseError(error.data)
          console.error("[v0] - Decoded error:", decodedError?.name, decodedError?.args)
        } catch (decodeErr) {
          console.error("[v0] - Could not decode error data")
        }
      }

      throw new Error(`Error al ejecutar ${functionName}: ${error.message}`)
    }
  } catch (error: any) {
    console.error("[v0] ==========================================")
    console.error("[v0] ❌❌ SEND API ERROR ❌❌")
    console.error("[v0] ==========================================")
    console.error("[v0] Error message:", error.message)
    console.error("[v0] ==========================================\n")

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error al procesar el envío",
      },
      { status: 500 },
    )
  }
}
