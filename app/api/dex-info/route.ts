import { NextRequest, NextResponse } from 'next/server'

// DexScreener API endpoint
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex'

export async function POST(request: NextRequest) {
  try {
    const { tokenAddress, chainId = 'worldchain' } = await request.json()

    console.log('[v0] DEX-INFO: Fetching pool info for token:', tokenAddress)
    console.log('[v0] DEX-INFO: Chain:', chainId)

    if (!tokenAddress) {
      throw new Error('Token address is required')
    }

    // Search for token pairs using DexScreener API
    const response = await fetch(`${DEXSCREENER_API}/tokens/${tokenAddress}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[v0] DEX-INFO: DexScreener response:', JSON.stringify(data, null, 2))

    if (!data.pairs || data.pairs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No liquidity pools found for this token',
      })
    }

    // Filter pairs for the specified chain
    const chainPairs = data.pairs.filter((pair: any) => 
      pair.chainId?.toLowerCase() === chainId.toLowerCase()
    )

    if (chainPairs.length === 0) {
      console.log('[v0] DEX-INFO: No pairs found on', chainId)
      return NextResponse.json({
        success: false,
        error: `No liquidity pools found on ${chainId}`,
      })
    }

    // Sort by liquidity (USD) and get the best pool
    const sortedPairs = chainPairs.sort((a: any, b: any) => {
      const liquidityA = parseFloat(a.liquidity?.usd || '0')
      const liquidityB = parseFloat(b.liquidity?.usd || '0')
      return liquidityB - liquidityA
    })

    const bestPair = sortedPairs[0]

    console.log('[v0] DEX-INFO: Best pool found:')
    console.log('[v0] DEX-INFO:   DEX:', bestPair.dexId)
    console.log('[v0] DEX-INFO:   Pair Address:', bestPair.pairAddress)
    console.log('[v0] DEX-INFO:   Base Token:', bestPair.baseToken?.symbol)
    console.log('[v0] DEX-INFO:   Quote Token:', bestPair.quoteToken?.symbol)
    console.log('[v0] DEX-INFO:   Liquidity:', bestPair.liquidity?.usd)
    console.log('[v0] DEX-INFO:   Price USD:', bestPair.priceUsd)
    console.log('[v0] DEX-INFO:   Info object:', JSON.stringify(bestPair.info, null, 2))

    return NextResponse.json({
      success: true,
      dexId: bestPair.dexId,
      pairAddress: bestPair.pairAddress,
      baseToken: bestPair.baseToken,
      quoteToken: bestPair.quoteToken,
      liquidity: bestPair.liquidity,
      priceUsd: bestPair.priceUsd,
      chainId: bestPair.chainId,
      url: bestPair.url,
      info: bestPair.info,
    })
  } catch (error: any) {
    console.error('[v0] DEX-INFO: Error:', error.message)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch DEX information',
      },
      { status: 500 }
    )
  }
}
