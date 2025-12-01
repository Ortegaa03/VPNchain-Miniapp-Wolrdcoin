import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"
import { APP_CONFIG, validateServerConfig, validatePublicConfig } from "@/lib/config"
import { VPNCHAIN_ROUTER_V6_ABI } from "@/lib/contract-abi"
import { UNISWAP_V3_SWAP_ROUTER_ABI, UNISWAP_V3_QUOTER_ABI, UNISWAP_V3_FACTORY_ABI } from "@/lib/uniswap-v3-abi"

const RPC_URL = APP_CONFIG.RPC_URL
const CONTRACT_ADDRESS = APP_CONFIG.CONTRACT_ADDRESS
const PRIVATE_KEY = process.env.PRIVATE_KEY

const WLD_TOKEN_ADDRESS = "0x2cFc85d8E48F8EAB294be644d9E25C3030863003"
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006"
const USDC_ADDRESS = "0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"
const ROUTER_V2_ADDRESS = "0x541aB7c31A119441eF3575F6973277DE0eF460bd"
const ROUTER_V3_ADDRESS = "0x091AD9e2e6e5eD44c1c66dB50e49A601F9f36cF6"
const QUOTER_V3_ADDRESS = "0xc17C59a0b3e65664ebC43eA749cF3c77a0f4F3D5"
const FACTORY_V3_ADDRESS = "0x1F98431c8aD98523631AE4a59f267346ea31F984"

const V3_FEE_TIERS = [500, 3000, 10000]

const ROUTER_V2_ABI = [
  {
    name: "getAmountsOut",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    name: "swapExactTokensForTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    name: "swapExactTokensForTokensSupportingFeeOnTransferTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
]

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)",
]

function encodeV3Path(tokenAddresses: string[], fees: number[]): string {
  let path = "0x"
  for (let i = 0; i < tokenAddresses.length; i++) {
    path += tokenAddresses[i].slice(2)
    if (i < fees.length) {
      path += fees[i].toString(16).padStart(6, "0")
    }
  }
  return path
}

async function poolExists(
  factoryContract: ethers.Contract,
  tokenA: string,
  tokenB: string,
  fee: number,
): Promise<boolean> {
  try {
    const poolAddress = await factoryContract.getPool(tokenA, tokenB, fee)
    const exists = poolAddress !== ethers.ZeroAddress
    if (exists) {
      console.log(
        `[v0] SWAP: Pool exists for ${tokenA.substring(0, 6)}.../${tokenB.substring(0, 6)}... (fee: ${fee / 10000}%)`,
      )
    }
    return exists
  } catch (error) {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    validatePublicConfig()
    validateServerConfig()

    if (!PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY not configured")
    }

    const { amountWLD, tokenToBuy, recipientWallet, tokenDecimals, tokenSymbol, txAttemptId, failedAttempts } =
      await request.json()

    console.log("[v0] SWAP: ==========================================")
    console.log("[v0] SWAP: Starting Hybrid Uniswap V2/V3 swap + VPN Chain routing")
    console.log("[v0] SWAP: Transfer Mode: instant (forced)")
    console.log("[v0] SWAP: Amount WLD to spend:", amountWLD)
    console.log("[v0] SWAP: Token to buy:", tokenSymbol, tokenToBuy)
    console.log("[v0] SWAP: Token decimals:", tokenDecimals)
    console.log("[v0] SWAP: Recipient wallet:", recipientWallet)
    console.log("[v0] SWAP: Transaction Attempt ID:", txAttemptId)
    console.log("[v0] SWAP: Previous failed attempts:", failedAttempts || 0)

    if (!amountWLD || amountWLD <= 0) {
      throw new Error("Invalid WLD amount")
    }
    if (!tokenToBuy || !ethers.isAddress(tokenToBuy)) {
      throw new Error("Invalid token address")
    }
    if (!recipientWallet || !ethers.isAddress(recipientWallet)) {
      throw new Error("Invalid recipient address")
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const botWallet = new ethers.Wallet(PRIVATE_KEY, provider)

    console.log("[v0] SWAP: Bot wallet address:", botWallet.address)

    const wldContract = new ethers.Contract(WLD_TOKEN_ADDRESS, ERC20_ABI, botWallet)
    const tokenContract = new ethers.Contract(tokenToBuy, ERC20_ABI, botWallet)
    const routerV2Contract = new ethers.Contract(ROUTER_V2_ADDRESS, ROUTER_V2_ABI, botWallet)
    const routerV3Contract = new ethers.Contract(ROUTER_V3_ADDRESS, UNISWAP_V3_SWAP_ROUTER_ABI, botWallet)
    const quoterV3Contract = new ethers.Contract(QUOTER_V3_ADDRESS, UNISWAP_V3_QUOTER_ABI, provider)
    const factoryV3Contract = new ethers.Contract(FACTORY_V3_ADDRESS, UNISWAP_V3_FACTORY_ABI, provider)
    const vpnChainContract = new ethers.Contract(CONTRACT_ADDRESS!, VPNCHAIN_ROUTER_V6_ABI, botWallet)

    let commissionAmount = 0
    let amountWLDAfterFee = amountWLD

    if (failedAttempts && failedAttempts > 0) {
      commissionAmount = (amountWLD * APP_CONFIG.COMMISSION_PERCENTAGE) / 100
      amountWLDAfterFee = amountWLD - commissionAmount
      console.log("[v0] SWAP: This is a RETRY (attempt #" + (failedAttempts + 1) + "), charging commission")
      console.log("[v0] SWAP: - Original amount:", amountWLD, "WLD")
      console.log("[v0] SWAP: - Commission (" + APP_CONFIG.COMMISSION_PERCENTAGE + "%):", commissionAmount, "WLD")
      console.log("[v0] SWAP: - Amount for swap (after fee):", amountWLDAfterFee, "WLD")
    } else {
      console.log("[v0] SWAP: This is the FIRST ATTEMPT, no commission will be charged")
      console.log("[v0] SWAP: - Full refund if swap fails:", amountWLD, "WLD")
    }

    const amountWLDWei = ethers.parseUnits(String(amountWLDAfterFee), 18)

    const botWldBalance = await wldContract.balanceOf(botWallet.address)
    const botWldBalanceFormatted = Number.parseFloat(ethers.formatUnits(botWldBalance, 18))

    console.log("[v0] SWAP: Bot wallet WLD balance:", botWldBalanceFormatted, "WLD")

    if (botWldBalanceFormatted < amountWLD) {
      throw new Error(
        `Insufficient WLD in bot wallet. Need ${amountWLD} WLD but only ${botWldBalanceFormatted} WLD available`,
      )
    }

    const tokenBalanceBefore = await tokenContract.balanceOf(botWallet.address)
    console.log(
      "[v0] SWAP: Token balance before swap:",
      ethers.formatUnits(tokenBalanceBefore, tokenDecimals),
      tokenSymbol,
    )

    console.log("[v0] SWAP: Finding best swap path across V2 and V3...")

    let bestPath: any = null
    let bestVersion: "V2" | "V3" = "V2"
    let expectedTokenOut = 0n

    console.log("[v0] SWAP: === Checking Uniswap V2 Paths ===")
    const v2Paths = [
      { path: [WLD_TOKEN_ADDRESS, tokenToBuy], name: "WLD->Token" },
      { path: [WLD_TOKEN_ADDRESS, WETH_ADDRESS, tokenToBuy], name: "WLD->WETH->Token" },
      { path: [WLD_TOKEN_ADDRESS, USDC_ADDRESS, tokenToBuy], name: "WLD->USDC->Token" },
    ]

    for (const { path, name } of v2Paths) {
      try {
        const currentAllowance = await wldContract.allowance(botWallet.address, ROUTER_V2_ADDRESS)
        if (currentAllowance < amountWLDWei) {
          const approveTx = await wldContract.approve(ROUTER_V2_ADDRESS, amountWLDWei, { gasLimit: 100000 })
          await approveTx.wait()
          console.log("[v0] SWAP: ✅ V2 Router approved")
        }

        const amountsOut = await routerV2Contract.getAmountsOut(amountWLDWei, path)
        const output = amountsOut[amountsOut.length - 1]

        if (output > expectedTokenOut) {
          expectedTokenOut = output
          bestPath = { path, version: "V2" }
          bestVersion = "V2"
          console.log("[v0] SWAP: ✅ V2", name, ":", ethers.formatUnits(output, tokenDecimals), tokenSymbol)
        }
      } catch (error: any) {
        console.log("[v0] SWAP: ❌ V2", name, "failed:", error.message)
      }
    }

    console.log("[v0] SWAP: === Checking Uniswap V3 Paths ===")

    for (const fee of V3_FEE_TIERS) {
      const hasPool = await poolExists(factoryV3Contract, WLD_TOKEN_ADDRESS, tokenToBuy, fee)
      if (!hasPool) {
        console.log(`[v0] SWAP: ⏭️  Skipping V3 Direct (fee: ${fee / 10000}%) - pool doesn't exist`)
        continue
      }

      try {
        const result = await quoterV3Contract.quoteExactInputSingle.staticCall(
          WLD_TOKEN_ADDRESS,
          tokenToBuy,
          fee,
          amountWLDWei,
          0,
        )
        const output = result[0]

        if (output > expectedTokenOut) {
          expectedTokenOut = output
          bestPath = {
            tokenIn: WLD_TOKEN_ADDRESS,
            tokenOut: tokenToBuy,
            fee,
            version: "V3",
            path: [WLD_TOKEN_ADDRESS, tokenToBuy],
            fees: [fee],
          }
          bestVersion = "V3"
          console.log(
            "[v0] SWAP: ✅ V3 Direct (fee:",
            fee / 10000,
            "%):",
            ethers.formatUnits(output, tokenDecimals),
            tokenSymbol,
          )
        }
      } catch (error: any) {
        console.log("[v0] SWAP: ❌ V3 Direct (fee:", fee / 10000, "%) quote failed:", error.message.substring(0, 50))
      }
    }

    console.log("[v0] SWAP: === Checking V3 Multi-hop via WETH ===")
    for (const fee1 of V3_FEE_TIERS) {
      const hasPool1 = await poolExists(factoryV3Contract, WLD_TOKEN_ADDRESS, WETH_ADDRESS, fee1)
      if (!hasPool1) continue

      for (const fee2 of V3_FEE_TIERS) {
        const hasPool2 = await poolExists(factoryV3Contract, WETH_ADDRESS, tokenToBuy, fee2)
        if (!hasPool2) continue

        try {
          const pathEncoded = encodeV3Path([WLD_TOKEN_ADDRESS, WETH_ADDRESS, tokenToBuy], [fee1, fee2])
          const result = await quoterV3Contract.quoteExactInput.staticCall(pathEncoded, amountWLDWei)
          const output = result[0]

          if (output > expectedTokenOut) {
            expectedTokenOut = output
            bestPath = {
              version: "V3",
              path: [WLD_TOKEN_ADDRESS, WETH_ADDRESS, tokenToBuy],
              fees: [fee1, fee2],
              pathEncoded,
            }
            bestVersion = "V3"
            console.log(
              "[v0] SWAP: ✅ V3 via WETH (fees:",
              fee1 / 10000,
              "%,",
              fee2 / 10000,
              "%):",
              ethers.formatUnits(output, tokenDecimals),
              tokenSymbol,
            )
          }
        } catch (error: any) {
          // Silent fail for multi-hop attempts
        }
      }
    }

    console.log("[v0] SWAP: === Checking V3 Multi-hop via USDC ===")
    for (const fee1 of V3_FEE_TIERS) {
      const hasPool1 = await poolExists(factoryV3Contract, WLD_TOKEN_ADDRESS, USDC_ADDRESS, fee1)
      if (!hasPool1) continue

      for (const fee2 of V3_FEE_TIERS) {
        const hasPool2 = await poolExists(factoryV3Contract, USDC_ADDRESS, tokenToBuy, fee2)
        if (!hasPool2) continue

        try {
          const pathEncoded = encodeV3Path([WLD_TOKEN_ADDRESS, USDC_ADDRESS, tokenToBuy], [fee1, fee2])
          const result = await quoterV3Contract.quoteExactInput.staticCall(pathEncoded, amountWLDWei)
          const output = result[0]

          if (output > expectedTokenOut) {
            expectedTokenOut = output
            bestPath = {
              version: "V3",
              path: [WLD_TOKEN_ADDRESS, USDC_ADDRESS, tokenToBuy],
              fees: [fee1, fee2],
              pathEncoded,
            }
            bestVersion = "V3"
            console.log(
              "[v0] SWAP: ✅ V3 via USDC (fees:",
              fee1 / 10000,
              "%,",
              fee2 / 10000,
              "%):",
              ethers.formatUnits(output, tokenDecimals),
              tokenSymbol,
            )
          }
        } catch (error: any) {
          // Silent fail for multi-hop attempts
        }
      }
    }

    if (!bestPath || expectedTokenOut === 0n) {
      console.error("[v0] SWAP: ❌ No valid swap path found, refunding WLD...")

      const refundAmount = failedAttempts && failedAttempts > 0 ? amountWLDAfterFee : amountWLD
      const refundAmountWei = ethers.parseUnits(String(refundAmount), 18)

      const refundTx = await wldContract.transfer(recipientWallet, refundAmountWei)
      const refundReceipt = await refundTx.wait()
      console.log("[v0] SWAP: Refund completed:", refundReceipt.hash)

      if (failedAttempts && failedAttempts > 0) {
        console.log("[v0] SWAP: Commission retained:", commissionAmount, "WLD (retry attempt)")
      }

      return NextResponse.json({
        success: false,
        refunded: true,
        refundTxHash: refundReceipt.hash,
        refundAmount: refundAmount,
        commissionRetained: commissionAmount,
        isRetry: failedAttempts > 0,
        error: `No hay liquidez disponible para ${tokenSymbol}. Se han devuelto ${refundAmount} WLD a tu wallet.${commissionAmount > 0 ? ` Comisión retenida por reintento: ${commissionAmount} WLD.` : ""}`,
      })
    }

    const slippage = 0.05
    const amountOutMin = (expectedTokenOut * BigInt(Math.floor((1 - slippage) * 1000))) / 1000n

    console.log("[v0] SWAP: ==========================================")
    console.log("[v0] SWAP: Best route found:", bestVersion)
    console.log(
      "[v0] SWAP: Path:",
      bestPath.path
        .map((addr: string) => {
          if (addr.toLowerCase() === WLD_TOKEN_ADDRESS.toLowerCase()) return "WLD"
          if (addr.toLowerCase() === WETH_ADDRESS.toLowerCase()) return "WETH"
          if (addr.toLowerCase() === USDC_ADDRESS.toLowerCase()) return "USDC"
          return tokenSymbol
        })
        .join(" → "),
    )
    console.log("[v0] SWAP: Expected out:", ethers.formatUnits(expectedTokenOut, tokenDecimals), tokenSymbol)
    console.log("[v0] SWAP: Min out (5% slippage):", ethers.formatUnits(amountOutMin, tokenDecimals), tokenSymbol)

    let swapSuccess = false
    let swapTxHash = ""
    let tokensReceived = "0"

    if (bestVersion === "V3") {
      console.log("[v0] SWAP: Executing Uniswap V3 swap...")

      try {
        const currentAllowance = await wldContract.allowance(botWallet.address, ROUTER_V3_ADDRESS)
        if (currentAllowance < amountWLDWei) {
          const approveTx = await wldContract.approve(ROUTER_V3_ADDRESS, amountWLDWei, { gasLimit: 100000 })
          await approveTx.wait()
          console.log("[v0] SWAP: ✅ V3 Router approved")
        }

        let swapTx
        if (bestPath.pathEncoded) {
          const params = {
            path: bestPath.pathEncoded,
            recipient: botWallet.address,
            amountIn: amountWLDWei,
            amountOutMinimum: amountOutMin,
          }

          console.log("[v0] SWAP: Executing V3 exactInput (multi-hop)...")
          swapTx = await routerV3Contract.exactInput(params, { gasLimit: 500000 })
        } else {
          const params = {
            tokenIn: bestPath.tokenIn,
            tokenOut: bestPath.tokenOut,
            fee: bestPath.fee,
            recipient: botWallet.address,
            amountIn: amountWLDWei,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: 0,
          }

          console.log("[v0] SWAP: Executing V3 exactInputSingle...")
          swapTx = await routerV3Contract.exactInputSingle(params, { gasLimit: 300000 })
        }

        console.log("[v0] SWAP: V3 Swap tx sent:", swapTx.hash)
        const receipt = await swapTx.wait()
        console.log("[v0] SWAP: ✅ V3 Swap confirmed! Status:", receipt.status, "Gas used:", receipt.gasUsed.toString())

        if (receipt.status === 0) {
          throw new Error("V3 Swap transaction reverted")
        }

        swapSuccess = true
        swapTxHash = swapTx.hash
      } catch (v3Error: any) {
        console.error("[v0] SWAP: ❌ V3 swap failed:", v3Error.message)
        swapSuccess = false
      }
    } else {
      console.log("[v0] SWAP: Executing Uniswap V2 swap...")

      try {
        const currentAllowance = await wldContract.allowance(botWallet.address, ROUTER_V2_ADDRESS)
        if (currentAllowance < amountWLDWei) {
          const approveTx = await wldContract.approve(ROUTER_V2_ADDRESS, amountWLDWei, { gasLimit: 100000 })
          await approveTx.wait()
        }

        const deadline = Math.floor(Date.now() / 1000) + 600

        try {
          const estimatedGas = await routerV2Contract.swapExactTokensForTokens.estimateGas(
            amountWLDWei,
            amountOutMin,
            bestPath.path,
            botWallet.address,
            deadline,
          )

          const gasLimit = (estimatedGas * 120n) / 100n

          const swapTx = await routerV2Contract.swapExactTokensForTokens(
            amountWLDWei,
            amountOutMin,
            bestPath.path,
            botWallet.address,
            deadline,
            { gasLimit },
          )

          console.log("[v0] SWAP: V2 Swap tx sent:", swapTx.hash)
          const receipt = await swapTx.wait()
          console.log("[v0] SWAP: ✅ V2 Swap confirmed! Status:", receipt.status)

          if (receipt.status === 0) {
            throw new Error("V2 Swap transaction reverted")
          }

          swapSuccess = true
          swapTxHash = swapTx.hash
        } catch (swapError: any) {
          console.error("[v0] SWAP: ❌ V2 regular swap failed, trying fee-on-transfer...")

          const swapTx = await routerV2Contract.swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amountWLDWei,
            amountOutMin,
            bestPath.path,
            botWallet.address,
            deadline,
            { gasLimit: 500000 },
          )

          const receipt = await swapTx.wait()

          if (receipt.status === 0) {
            throw new Error("V2 Fee-on-transfer swap reverted")
          }

          swapSuccess = true
          swapTxHash = swapTx.hash
        }
      } catch (v2Error: any) {
        console.error("[v0] SWAP: ❌ V2 swap failed:", v2Error.message)
        swapSuccess = false
      }
    }

    if (!swapSuccess) {
      console.log("[v0] SWAP: All swap attempts failed, refunding WLD...")

      const refundAmount = failedAttempts && failedAttempts > 0 ? amountWLDAfterFee : amountWLD
      const refundAmountWei = ethers.parseUnits(String(refundAmount), 18)

      const refundTx = await wldContract.transfer(recipientWallet, refundAmountWei)
      const refundReceipt = await refundTx.wait()

      if (failedAttempts && failedAttempts > 0) {
        console.log("[v0] SWAP: Commission retained:", commissionAmount, "WLD (retry attempt)")
      }

      return NextResponse.json({
        success: false,
        refunded: true,
        refundTxHash: refundReceipt.hash,
        refundAmount: refundAmount,
        commissionRetained: commissionAmount,
        isRetry: failedAttempts > 0,
        error: `El swap de ${tokenSymbol} falló. Se han devuelto ${refundAmount} WLD a tu wallet.${commissionAmount > 0 ? ` Comisión retenida por reintento: ${commissionAmount} WLD.` : ""}`,
      })
    }

    const tokenBalanceAfter = await tokenContract.balanceOf(botWallet.address)
    const tokensReceivedWei = tokenBalanceAfter - tokenBalanceBefore
    tokensReceived = ethers.formatUnits(tokensReceivedWei, tokenDecimals)

    console.log("[v0] SWAP: ✅ Tokens received from swap:", tokensReceived, tokenSymbol)

    console.log("[v0] SWAP: ==========================================")
    console.log("[v0] SWAP: STEP 2: Routing through VPN Chain contract")

    const tokenAllowance = await tokenContract.allowance(botWallet.address, CONTRACT_ADDRESS!)

    if (tokenAllowance < tokensReceivedWei) {
      const approveContractTx = await tokenContract.approve(CONTRACT_ADDRESS!, tokensReceivedWei, { gasLimit: 100000 })
      await approveContractTx.wait()
    }

    const depositTx = await vpnChainContract.deposit(tokenToBuy, tokensReceivedWei, tokenDecimals, { gasLimit: 300000 })
    await depositTx.wait()

    const routeTx = await vpnChainContract.sendInstant(tokenToBuy, recipientWallet, tokensReceivedWei, tokenDecimals, {
      gasLimit: 5000000,
    })

    const routeReceipt = await routeTx.wait()

    let routeId: string | null = null
    for (const log of routeReceipt.logs) {
      try {
        const parsed = vpnChainContract.interface.parseLog({
          topics: log.topics as string[],
          data: log.data,
        })

        if (parsed && parsed.name === "RouteCreated") {
          routeId = parsed.args[0].toString()
          break
        }
      } catch (parseError) {
        continue
      }
    }

    console.log("[v0] SWAP: ==========================================")
    console.log("[v0] SWAP: ✅ ✅ ✅ SWAP + ROUTING COMPLETED ✅ ✅ ✅")
    console.log("[v0] SWAP: Method:", bestVersion === "V3" ? "Uniswap V3" : "Uniswap V2", "+ VPN Chain")
    console.log("[v0] SWAP: Commission retained:", commissionAmount, "WLD")
    console.log("[v0] SWAP: Tokens swapped:", tokensReceived, tokenSymbol)
    console.log("[v0] SWAP: Routing mode: instant")
    console.log("[v0] SWAP: Route ID:", routeId || "N/A")
    console.log("[v0] SWAP: ==========================================")

    return NextResponse.json({
      success: true,
      swapMethod: bestVersion === "V3" ? "Uniswap V3 + VPN Chain" : "Uniswap V2 + VPN Chain",
      swapPath: bestPath.path
        .map((addr: string) =>
          addr.toLowerCase() === WLD_TOKEN_ADDRESS.toLowerCase()
            ? "WLD"
            : addr.toLowerCase() === WETH_ADDRESS.toLowerCase()
              ? "WETH"
              : addr.toLowerCase() === USDC_ADDRESS.toLowerCase()
                ? "USDC"
                : tokenSymbol,
        )
        .join(" → "),
      tokensReceived,
      tokenSymbol,
      recipient: recipientWallet,
      transferMode: "instant",
      routeId,
      swapTxHash,
      depositTxHash: depositTx.hash,
      routeTxHash: routeReceipt.hash,
      commissionRetained: commissionAmount,
      isRetry: failedAttempts > 0,
    })
  } catch (error: any) {
    console.error("[v0] SWAP: ==========================================")
    console.error("[v0] SWAP: ❌ FATAL ERROR")
    console.error("[v0] SWAP: Error message:", error.message)
    console.error("[v0] SWAP: ==========================================")

    return NextResponse.json(
      {
        success: false,
        refunded: false,
        error: error.message || String(error),
      },
      { status: 500 },
    )
  }
}
