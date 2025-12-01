export async function POST(request: Request) {
  try {
    const { tokenAddress, amountWLD } = await request.json()
    
    // WorldChain chain ID for DEXScreener
    const WORLDCHAIN_ID = 'worldchain'
    const WLD_ADDRESS = '0x2cFc85d8E48F8EAB294be644d9E25C3030863003'
    
    // Get token pair data from DEXScreener
    const searchResponse = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    )
    
    if (!searchResponse.ok) {
      throw new Error('Failed to fetch token data from DEXScreener')
    }
    
    const data = await searchResponse.json()
    
    // Find the pair on WorldChain
    const worldchainPair = data.pairs?.find(
      (pair: any) => pair.chainId === WORLDCHAIN_ID || pair.chainId === 'worldchain'
    )
    
    if (!worldchainPair) {
      return Response.json({ 
        success: false, 
        error: 'Token no encontrado en WorldChain',
        estimatedAmount: '0'
      })
    }
    
    // Calculate estimated amount
    const tokenPriceUSD = parseFloat(worldchainPair.priceUsd || '0')
    const wldPriceUSD = 2.5 // Approximate WLD price, you could fetch this dynamically
    
    const wldValueUSD = amountWLD * wldPriceUSD
    const estimatedTokens = tokenPriceUSD > 0 ? wldValueUSD / tokenPriceUSD : 0
    
    return Response.json({
      success: true,
      estimatedAmount: estimatedTokens.toFixed(4),
      tokenPriceUSD: tokenPriceUSD.toFixed(6),
      wldPriceUSD: wldPriceUSD.toFixed(2),
      pairAddress: worldchainPair.pairAddress,
      dexId: worldchainPair.dexId,
      liquidity: worldchainPair.liquidity?.usd || 0
    })
    
  } catch (error: any) {
    console.error('[v0] DEXScreener API Error:', error)
    return Response.json({ 
      success: false, 
      error: error.message || 'Error al obtener precio del token',
      estimatedAmount: '0'
    })
  }
}
