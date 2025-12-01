import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { APP_CONFIG, validateServerConfig, validatePublicConfig } from '@/lib/config'
import { VPNCHAIN_ROUTER_V6_ABI } from '@/lib/contract-abi'

const RPC_URL = APP_CONFIG.RPC_URL
const CONTRACT_ADDRESS = APP_CONFIG.CONTRACT_ADDRESS
const PRIVATE_KEY = process.env.PRIVATE_KEY

const CONTRACT_ABI = VPNCHAIN_ROUTER_V6_ABI

export async function POST(request: NextRequest) {
  try {
    validatePublicConfig()
    validateServerConfig()
    
    if (!PRIVATE_KEY) {
      console.error('[v0] EXECUTE: PRIVATE_KEY not configured')
      throw new Error('PRIVATE_KEY not configured in environment variables')
    }

    if (!RPC_URL) {
      throw new Error('NEXT_PUBLIC_RPC_URL not configured in environment variables')
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS not configured in environment variables')
    }

    const { amount, recipient, transferMode, tokenAddress, tokenDecimals, tokenSymbol } = await request.json()

    const decimals = tokenDecimals || 18
    const amountWei = ethers.parseUnits(String(amount), decimals)

    console.log('[v0] ==========================================')
    console.log('[v0] EXECUTE: Starting execution process')
    console.log('[v0] EXECUTE: Mode:', transferMode === 'secure' ? 'SECURE (24-48h, scheduled hops)' : 'INSTANT (immediate hops)')
    console.log('[v0] EXECUTE: Token:', tokenSymbol || 'Unknown')
    console.log('[v0] EXECUTE: Token Address:', tokenAddress)
    console.log('[v0] EXECUTE: Token Decimals:', decimals)
    console.log('[v0] EXECUTE: Amount:', amount, tokenSymbol || 'tokens')
    console.log('[v0] EXECUTE: Amount in wei:', amountWei.toString())
    console.log('[v0] EXECUTE: Recipient:', recipient)
    console.log('[v0] EXECUTE: Contract:', CONTRACT_ADDRESS)
    console.log('[v0] EXECUTE: RPC:', RPC_URL)

    if (!amount || amount <= 0) {
      throw new Error('Invalid amount: must be greater than 0')
    }
    if (!recipient || !ethers.isAddress(recipient)) {
      throw new Error('Invalid recipient address')
    }
    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      throw new Error('Invalid token address')
    }

    console.log('[v0] EXECUTE: Waiting 2 seconds before proceeding (bot delay)...')
    await new Promise(resolve => setTimeout(resolve, 2000))

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider)
    
    console.log('[v0] EXECUTE: Wallet address:', wallet.address)
    
    const ethBalance = await provider.getBalance(wallet.address)
    console.log('[v0] EXECUTE: Wallet ETH balance:', ethers.formatEther(ethBalance), 'ETH')
    
    if (ethBalance === 0n) {
      console.error('[v0] EXECUTE: No ETH for gas fees')
      throw new Error('Wallet has no ETH for gas fees. Please fund the wallet.')
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet) as any
    
    console.log('[v0] EXECUTE: Contract instance created successfully')
    console.log('[v0] EXECUTE: Contract has sendInstant:', typeof contract.sendInstant === 'function')
    console.log('[v0] EXECUTE: Contract has sendSecure:', typeof contract.sendSecure === 'function')

    try {
      const contractOwner = await contract.owner()
      console.log('[v0] EXECUTE: Contract owner:', contractOwner)
      console.log('[v0] EXECUTE: Wallet is owner:', contractOwner.toLowerCase() === wallet.address.toLowerCase())
      
      if (contractOwner.toLowerCase() !== wallet.address.toLowerCase()) {
        throw new Error(`Wallet ${wallet.address} is not the contract owner. Owner is ${contractOwner}`)
      }
    } catch (error: any) {
      console.error('[v0] EXECUTE: Failed to verify owner:', error.message)
      throw new Error(`Failed to verify contract owner: ${error.message}`)
    }

    try {
      const userBalance = await contract.GetUserBalance(tokenAddress, wallet.address, decimals)
      console.log('[v0] EXECUTE: Owner internal balance:', ethers.formatUnits(userBalance, decimals), tokenSymbol)
      
      const contractBalance = await contract.GetContractBalance(tokenAddress, decimals)
      console.log('[v0] EXECUTE: Contract balance:', ethers.formatUnits(contractBalance, decimals), tokenSymbol)
      
      const totalAvailableWei = userBalance + contractBalance
      const totalAvailable = parseFloat(ethers.formatUnits(totalAvailableWei, decimals))
      
      console.log('[v0] EXECUTE: Total available:', totalAvailable, tokenSymbol)
      console.log('[v0] EXECUTE: Amount needed:', amount, tokenSymbol)
      
      if (totalAvailable < amount) {
        console.error('[v0] EXECUTE: Insufficient funds')
        throw new Error(
          `Insufficient funds. Total available: ${totalAvailable} ${tokenSymbol}, needs ${amount} ${tokenSymbol}`
        )
      }
      
      console.log('[v0] EXECUTE: Sufficient funds available')
      
    } catch (error: any) {
      console.error('[v0] EXECUTE: Failed to check funds:', error.message)
      throw new Error(`Failed to check contract funds: ${error.message}`)
    }

    const functionName = transferMode === 'secure' ? 'sendSecure' : 'sendInstant'
    console.log('[v0] EXECUTE: Will call function:', functionName)

    console.log('[v0] EXECUTE: Building transaction parameters...')
    console.log('[v0] EXECUTE:   - tokenAddr:', tokenAddress)
    console.log('[v0] EXECUTE:   - recipient:', recipient)
    console.log('[v0] EXECUTE:   - amount (wei):', amountWei.toString())
    console.log('[v0] EXECUTE:   - tokenDecimals:', decimals)
    
    if (transferMode === 'secure') {
      console.log('[v0] EXECUTE:   - is48h: true (48 hours duration)')
      console.log('[v0] EXECUTE:   - hopsCountUser: 0 (let contract decide 6-12 hops)')
    }

    try {
      console.log('[v0] EXECUTE: Simulating transaction with .staticCall...')
      
      let simulationResult
      if (transferMode === 'secure') {
        simulationResult = await contract.sendSecure.staticCall(
          tokenAddress,
          recipient, 
          amountWei, 
          true, // is48h
          0,    // hopsCountUser
          decimals
        )
      } else {
        simulationResult = await contract.sendInstant.staticCall(
          tokenAddress,
          recipient, 
          amountWei,
          decimals
        )
      }
      
      console.log('[v0] EXECUTE: Simulation successful, will return Route ID:', simulationResult.toString())
    } catch (simError: any) {
      console.error('[v0] EXECUTE: Simulation failed')
      console.error('[v0] EXECUTE: Error message:', simError.message)
      console.error('[v0] EXECUTE: Error reason:', simError.reason)
      console.error('[v0] EXECUTE: Error code:', simError.code)
      
      let errorMsg = simError.reason || simError.message || 'Unknown simulation error'
      
      if (errorMsg.includes('insufficient') || errorMsg.includes('Insufficient')) {
        errorMsg = `Fondos insuficientes en el contrato. El owner debe depositar más ${tokenSymbol}.`
      } else if (errorMsg.includes('transfer failed') || errorMsg.includes('transferFrom')) {
        errorMsg = `Error al transferir tokens ${tokenSymbol}. Verifica que el contrato tenga allowance y balance.`
      } else if (errorMsg.includes('Not owner')) {
        errorMsg = 'Solo el owner del contrato puede ejecutar transferencias.'
      }
      
      throw new Error(`La transacción fallará: ${errorMsg}`)
    }

    let gasLimit: number
    try {
      console.log('[v0] EXECUTE: Estimating gas...')
      
      let gasEstimate
      if (transferMode === 'secure') {
        gasEstimate = await contract.sendSecure.estimateGas(
          tokenAddress,
          recipient, 
          amountWei, 
          true, 
          0,
          decimals
        )
      } else {
        gasEstimate = await contract.sendInstant.estimateGas(
          tokenAddress,
          recipient, 
          amountWei,
          decimals
        )
      }
      
      gasLimit = Math.floor(Math.min(Math.max(Number(gasEstimate) * 1.3, 500000), 8000000))
      console.log('[v0] EXECUTE: Gas estimate:', gasEstimate.toString())
      console.log('[v0] EXECUTE: Gas limit (1.3x with floor):', gasLimit)
    } catch (gasError: any) {
      console.error('[v0] EXECUTE: Gas estimation failed, using default 2M')
      console.error('[v0] EXECUTE: Gas error:', gasError.message)
      gasLimit = 2000000
    }

    const feeData = await provider.getFeeData()
    console.log('[v0] EXECUTE: Gas price:', feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : 'N/A', 'gwei')

    console.log('[v0] EXECUTE: Sending transaction to blockchain...')
    
    let tx
    try {
      if (transferMode === 'secure') {
        console.log('[v0] EXECUTE: Calling sendSecure(address, address, uint256, bool, uint256, uint8)')
        console.log('[v0] EXECUTE: Parameters:', {
          tokenAddress,
          recipient,
          amount: amountWei.toString(),
          is48h: true,
          hopsCountUser: 0,
          tokenDecimals: decimals
        })
        
        tx = await contract.sendSecure(
          tokenAddress,
          recipient, 
          amountWei, 
          true,
          0,
          decimals,
          {
            gasLimit: gasLimit,
            gasPrice: feeData.gasPrice || undefined,
          }
        )
      } else {
        console.log('[v0] EXECUTE: Calling sendInstant(address, address, uint256, uint8)')
        console.log('[v0] EXECUTE: Parameters:', {
          tokenAddress,
          recipient,
          amount: amountWei.toString(),
          tokenDecimals: decimals
        })
        
        tx = await contract.sendInstant(
          tokenAddress,
          recipient, 
          amountWei,
          decimals,
          {
            gasLimit: gasLimit,
            gasPrice: feeData.gasPrice || undefined,
          }
        )
      }
    } catch (txError: any) {
      console.error('[v0] EXECUTE: Transaction send failed')
      console.error('[v0] EXECUTE: Error:', txError.message)
      console.error('[v0] EXECUTE: Error code:', txError.code)
      console.error('[v0] EXECUTE: Error data:', txError.data)
      throw new Error(`No se pudo enviar la transacción: ${txError.message}`)
    }
    
    console.log('[v0] EXECUTE: Transaction sent successfully!')
    console.log('[v0] EXECUTE: Transaction hash:', tx.hash)
    
    if (!tx.data || tx.data === '0x' || tx.data === '') {
      console.error('[v0] EXECUTE: CRITICAL ERROR - Transaction data is empty!')
      throw new Error('Transaction data is empty - function call encoding failed')
    }
    
    console.log('[v0] EXECUTE: Explorer: https://worldchain-mainnet.explorer.alchemy.com/tx/' + tx.hash)
    console.log('[v0] EXECUTE: Waiting for confirmation (timeout 300s)...')
    
    const receipt = await tx.wait(1, 300000)
    
    console.log('[v0] EXECUTE: Transaction confirmed!')
    console.log('[v0] EXECUTE: Block:', receipt.blockNumber)
    console.log('[v0] EXECUTE: Gas used:', receipt.gasUsed.toString())
    console.log('[v0] EXECUTE: Status:', receipt.status === 1 ? 'SUCCESS ✅' : 'FAILED ❌')

    if (receipt.status === 0) {
      console.error('[v0] EXECUTE: Transaction reverted on-chain')
      throw new Error('Transaction was reverted on-chain')
    }

    let routeId: string | null = null
    
    console.log('[v0] EXECUTE: Parsing logs to find Route ID...')
    
    for (const log of receipt.logs) {
      try {
        const parsed = contract.interface.parseLog({ 
          topics: log.topics as string[], 
          data: log.data 
        })
        
        console.log('[v0] EXECUTE: Found event:', parsed?.name)
        
        if (parsed && parsed.name === 'RouteCreated') {
          routeId = parsed.args[0].toString()
          console.log('[v0] EXECUTE: ✅ Route ID extracted:', routeId)
          console.log('[v0] EXECUTE: Event details:', {
            id: parsed.args[0].toString(),
            sender: parsed.args[1],
            receiver: parsed.args[2],
            token: parsed.args[3],
            amount: ethers.formatUnits(parsed.args[4], decimals) + ' ' + tokenSymbol,
            steps: parsed.args[5]?.toString(),
            isSecure: parsed.args[6],
            tokenDecimals: parsed.args[7]
          })
          break
        }
        
        if (parsed && parsed.name === 'RouteCompleted') {
          console.log('[v0] EXECUTE: ✅ Route COMPLETED in same TX! (Instant mode)')
        }
      } catch (parseError) {
        continue
      }
    }
    
    if (!routeId) {
      console.warn('[v0] EXECUTE: ⚠️ Route ID not found in events')
    }
    
    console.log('[v0] EXECUTE: ==========================================')

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      transferId: routeId,
      mode: transferMode,
      tokenAddress,
      tokenSymbol,
      tokenDecimals: decimals,
      explorerUrl: `https://worldchain-mainnet.explorer.alchemy.com/tx/${receipt.hash}`
    })
    
  } catch (error: any) {
    console.error('[v0] ==========================================')
    console.error('[v0] EXECUTE: ❌ FATAL ERROR')
    console.error('[v0] EXECUTE: Error message:', error.message)
    console.error('[v0] EXECUTE: ==========================================')
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.reason || error.message || String(error),
      },
      { status: 500 }
    )
  }
}
