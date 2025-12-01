import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { APP_CONFIG, validateServerConfig, validatePublicConfig } from '@/lib/config'
import { VPNCHAIN_ROUTER_V6_ABI } from '@/lib/contract-abi'

const RPC_URL = APP_CONFIG.RPC_URL
const CONTRACT_ADDRESS = APP_CONFIG.CONTRACT_ADDRESS
const PRIVATE_KEY = process.env.PRIVATE_KEY
const SUPPORT_WALLET = APP_CONFIG.SUPPORT_WALLET

const CONTRACT_ABI = VPNCHAIN_ROUTER_V6_ABI

export async function POST(request: NextRequest) {
  try {
    validatePublicConfig()
    validateServerConfig()

    if (!PRIVATE_KEY) {
      console.error('[v0] REFUND: PRIVATE_KEY not configured')
      throw new Error('PRIVATE_KEY not configured in environment variables')
    }

    if (!RPC_URL) {
      throw new Error('NEXT_PUBLIC_RPC_URL not configured in environment variables')
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS not configured in environment variables')
    }

    if (!SUPPORT_WALLET) {
      throw new Error('SUPPORT_WALLET not configured in environment variables')
    }

    const { amount, sender } = await request.json()

    const amountWei = ethers.parseUnits(String(amount), 18)

    console.log('[v0] ==========================================')
    console.log('[v0] REFUND: Starting REFUND process...')
    console.log('[v0] REFUND: Amount to refund:', amount, 'WLD')
    console.log('[v0] REFUND: Amount in wei:', amountWei.toString())
    console.log('[v0] REFUND: Sending to support wallet:', SUPPORT_WALLET)
    console.log('[v0] REFUND: Original sender was:', sender)
    console.log('[v0] REFUND: Contract:', CONTRACT_ADDRESS)

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    
    console.log('[v0] REFUND: Wallet address:', wallet.address)
    
    const balance = await provider.getBalance(wallet.address)
    console.log('[v0] REFUND: Wallet ETH balance:', ethers.formatEther(balance), 'ETH')
    
    if (balance === 0n) {
      throw new Error('Wallet has no ETH for gas fees')
    }

    console.log('[v0] REFUND: Waiting 5 seconds before processing refund...')
    await new Promise(resolve => setTimeout(resolve, 5000))

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet)

    try {
      console.log('[v0] REFUND: Simulating refund transaction...')
      await contract.sendInstant.staticCall(SUPPORT_WALLET, amountWei)
      console.log('[v0] REFUND: ✅ Simulation successful - Refund can proceed')
    } catch (simError: any) {
      console.error('[v0] REFUND: ❌ Simulation failed:', simError.message)
      throw new Error(`Refund will revert: ${simError.reason || simError.message}`)
    }

    let gasLimit: number
    try {
      console.log('[v0] REFUND: Estimating gas for refund...')
      const gasEstimate = await contract.sendInstant.estimateGas(SUPPORT_WALLET, amountWei)
      gasLimit = Math.min(Math.max(Number(gasEstimate) * 1.2, 100000), 3000000)
      console.log('[v0] REFUND: Gas estimate:', gasEstimate.toString())
      console.log('[v0] REFUND: Gas limit (with 1.2x multiplier):', gasLimit)
    } catch (gasError: any) {
      console.error('[v0] REFUND: Gas estimation failed, using default 500000')
      gasLimit = 500000
    }

    const feeData = await provider.getFeeData()
    console.log('[v0] REFUND: Gas price:', ethers.formatUnits(feeData.gasPrice || 0n, 'gwei'), 'gwei')

    console.log('[v0] REFUND: Executing REFUND sendInstant...')
    console.log('[v0] REFUND: Sending', amount, 'WLD to support wallet:', SUPPORT_WALLET)
    
    const tx = await contract.sendInstant(SUPPORT_WALLET, amountWei, {
      gasLimit: gasLimit,
      gasPrice: feeData.gasPrice,
    })
    
    console.log('[v0] REFUND: ✅ Refund transaction sent! Hash:', tx.hash)
    console.log('[v0] REFUND: Block explorer: https://worldchain-mainnet.explorer.alchemy.com/tx/' + tx.hash)
    console.log('[v0] REFUND: Waiting for confirmation...')
    
    const receipt = await tx.wait(1, 300000)
    
    console.log('[v0] REFUND: ✅ Refund confirmed!')
    console.log('[v0] REFUND: Block number:', receipt.blockNumber)
    console.log('[v0] REFUND: Gas used:', receipt.gasUsed.toString())
    console.log('[v0] REFUND: Status:', receipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌')
    console.log('[v0] REFUND: ==========================================')

    if (receipt.status === 0) {
      throw new Error('Refund transaction was reverted on-chain')
    }

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
    })
  } catch (error: any) {
    console.error('[v0] ==========================================')
    console.error('[v0] REFUND: ❌ ERROR EXECUTING REFUND')
    console.error('[v0] REFUND: Error message:', error.message)
    console.error('[v0] ==========================================')
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.reason || error.message || String(error),
      },
      { status: 500 }
    )
  }
}
