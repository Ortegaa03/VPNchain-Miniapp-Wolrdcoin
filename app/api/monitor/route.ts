import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { APP_CONFIG, validateServerConfig, validatePublicConfig } from '@/lib/config'

const RPC_URL = APP_CONFIG.RPC_URL
const CONTRACT_ADDRESS = APP_CONFIG.CONTRACT_ADDRESS

const VALID_AMOUNTS = [5, 10, 20, 50, 100]
const MAX_TRANSACTION_AGE_SECONDS = APP_CONFIG.MAX_TRANSACTION_AGE_SECONDS

const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function decimals() view returns (uint8)',
]

const sessionStartBlocks = new Map<string, { block: number; timestamp: number }>()
const processedTransactions = new Set<string>()

export async function POST(request: NextRequest) {
  try {
    validatePublicConfig()
    validateServerConfig()

    if (!RPC_URL) {
      throw new Error('NEXT_PUBLIC_RPC_URL not configured in environment variables')
    }

    if (!CONTRACT_ADDRESS) {
      throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS not configured in environment variables')
    }

    const { amount, sender, sessionId, tokenAddress, to } = await request.json()

    if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
      throw new Error('Valid token address required')
    }

    const recipientWallet = to || CONTRACT_ADDRESS

    console.log('[v0] ============ MONITORING REQUEST ============')
    console.log('[v0] Session ID:', sessionId)
    console.log('[v0] Expected amount:', amount)
    console.log('[v0] Token address:', tokenAddress)
    console.log('[v0] Sender address:', sender)
    console.log('[v0] Recipient address:', recipientWallet)
    console.log('[v0] Monitoring type:', to ? 'SWAP' : 'SEND')

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

    let decimals = 18
    try {
      decimals = await tokenContract.decimals()
      console.log('[v0] Token decimals:', decimals)
    } catch (error) {
      console.warn('[v0] Could not fetch decimals, using default 18')
    }

    const currentBlock = await provider.getBlockNumber()
    const currentTimestamp = Math.floor(Date.now() / 1000)
    
    console.log('[v0] Current block:', currentBlock)
    console.log('[v0] Current timestamp:', currentTimestamp)

    if (!sessionStartBlocks.has(sessionId)) {
      sessionStartBlocks.set(sessionId, { 
        block: currentBlock, 
        timestamp: currentTimestamp 
      })
      console.log('[v0] 🆕 New session - Starting from block:', currentBlock)
      return NextResponse.json({ detected: false })
    }

    const sessionInfo = sessionStartBlocks.get(sessionId)!
    const startBlock = sessionInfo.block
    
    console.log('[v0] Scanning from block:', startBlock, 'to', currentBlock)
    console.log('[v0] Session age:', currentTimestamp - sessionInfo.timestamp, 'seconds')

    if (currentTimestamp - sessionInfo.timestamp > MAX_TRANSACTION_AGE_SECONDS) {
      console.log('[v0] ⏰ Session expired')
      return NextResponse.json({ detected: false, expired: true })
    }

    const checksumSender = ethers.getAddress(sender)
    const checksumRecipient = ethers.getAddress(recipientWallet)
    
    console.log('[v0] Checksum sender:', checksumSender)
    console.log('[v0] Checksum recipient:', checksumRecipient)
    
    const filter = tokenContract.filters.Transfer(checksumSender, checksumRecipient)
    
    const events = await tokenContract.queryFilter(filter, startBlock, currentBlock)

    console.log('[v0] Events found:', events.length)

    if (events.length === 0) {
      return NextResponse.json({ detected: false })
    }

    const expectedAmountWei = ethers.parseUnits(String(amount), decimals)
    const tolerance = ethers.parseUnits('0.01', decimals)
    
    console.log('[v0] Expected amount (Wei):', expectedAmountWei.toString())
    console.log('[v0] Tolerance (Wei):', tolerance.toString())
    
    for (const event of events) {
      if ('args' in event && event.args) {
        const eventAmountWei = event.args[2] as bigint
        const eventAmount = parseFloat(ethers.formatUnits(eventAmountWei, decimals))
        const txHash = event.transactionHash
        
        console.log('[v0] ==================')
        console.log('[v0] Transaction:', txHash)
        console.log('[v0] Event amount (Wei):', eventAmountWei.toString())
        console.log('[v0] Event amount:', eventAmount)
        
        const block = await provider.getBlock(event.blockNumber)
        if (!block) continue
        
        const txAge = currentTimestamp - Number(block.timestamp)
        console.log('[v0] Transaction age:', txAge, 'seconds')
        
        if (txAge > MAX_TRANSACTION_AGE_SECONDS) {
          console.log('[v0] ⏰ Transaction too old, skipping')
          continue
        }
        
        const txKey = `${sessionId}:${txHash}:${eventAmount}`
        
        if (processedTransactions.has(txKey)) {
          console.log('[v0] ⏭️ Already processed')
          continue
        }
        
        const difference = eventAmountWei > expectedAmountWei 
          ? eventAmountWei - expectedAmountWei 
          : expectedAmountWei - eventAmountWei
        
        console.log('[v0] Difference (Wei):', difference.toString())
        console.log('[v0] Is within tolerance?', difference <= tolerance)
        
        if (difference <= tolerance) {
          console.log('[v0] ✅ CORRECT AMOUNT DETECTED!')
          processedTransactions.add(txKey)
          
          sessionStartBlocks.set(sessionId, { 
            block: currentBlock + 1, 
            timestamp: currentTimestamp 
          })
          
          return NextResponse.json({ detected: true })
        } else {
          console.log('[v0] ⚠️ Wrong amount - Difference too large')
          
          const isValidAmount = VALID_AMOUNTS.some(valid => {
            const validWei = ethers.parseUnits(String(valid), decimals)
            const diff = eventAmountWei > validWei ? eventAmountWei - validWei : validWei - eventAmountWei
            return diff <= tolerance
          })
          
          if (!isValidAmount && eventAmountWei > 0n) {
            console.log('[v0] 🔄 Invalid amount - will refund')
            processedTransactions.add(txKey)
            
            sessionStartBlocks.set(sessionId, { 
              block: currentBlock + 1, 
              timestamp: sessionInfo.timestamp 
            })
            
            return NextResponse.json({ 
              detected: false,
              incorrectTransfer: {
                amount: eventAmount.toString(),
                amountWei: eventAmountWei.toString()
              }
            })
          }
        }
      }
    }

    sessionStartBlocks.set(sessionId, { 
      block: currentBlock + 1, 
      timestamp: sessionInfo.timestamp 
    })

    return NextResponse.json({ detected: false })
  } catch (error) {
    console.error('[v0] ❌ ERROR in monitor API')
    console.error('[v0] Error message:', error instanceof Error ? error.message : 'Unknown')
    
    return NextResponse.json({ 
      detected: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
