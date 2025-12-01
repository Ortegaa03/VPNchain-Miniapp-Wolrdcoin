export type Token = {
  symbol: string
  name: string
  address: string
  decimals: number
  icon: string
  entrypointAddress?: string
}

export const SUPPORTED_TOKENS: Token[] = [
  {
    symbol: 'WLD',
    name: 'Worldcoin',
    address: process.env.WLD_TOKEN_ADDRESS || '0x2cFc85d8E48F8EAB294be644d9E25C3030863003',
    decimals: 18,
    icon: 'https://files.catbox.moe/yldpb0.png',
    entrypointAddress: process.env.NEXT_PUBLIC_WLD_ENTRYPOINT || '0x2cFc85d8E48F8EAB294be644d9E25C3030863003',
  },
  {
    symbol: 'TSN',
    name: 'TSN',
    address: process.env.TSN_TOKEN_ADDRESS || '0xa25D59bf1e9ac8395b77E7807fB27eA0a48d7c55',
    decimals: 18,
    icon: 'https://files.catbox.moe/7vjkxg.png',
    entrypointAddress: process.env.NEXT_PUBLIC_TSN_ENTRYPOINT || '0xa25D59bf1e9ac8395b77E7807fB27eA0a48d7c55',
  },
]

export const getTokenBySymbol = (symbol: string): Token | undefined => {
  return SUPPORTED_TOKENS.find(token => token.symbol === symbol)
}

export const getTokenByAddress = (address: string): Token | undefined => {
  return SUPPORTED_TOKENS.find(
    token => token.address.toLowerCase() === address.toLowerCase()
  )
}
