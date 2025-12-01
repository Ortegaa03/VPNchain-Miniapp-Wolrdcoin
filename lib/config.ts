export const APP_CONFIG = {
  // Edit this value to change the commission percentage shown in the UI
  COMMISSION_PERCENTAGE: 2,
  
  // ============================================
  // PUBLIC VARIABLES (accessible from client)
  // ============================================
  // These MUST have NEXT_PUBLIC_ prefix to be available in browser
  CONTRACT_ADDRESS: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
  CHAIN_ID: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '480'),
  
  // ============================================
  // PRIVATE VARIABLES (server-side only)
  // ============================================
  // These are ONLY accessible in API routes and server components
  // NEVER use these in client components or they will be undefined
  WLD_TOKEN_ADDRESS: process.env.WLD_TOKEN_ADDRESS,
  SUPPORT_WALLET: process.env.SUPPORT_WALLET,
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
  ADMIN_USER_ID: process.env.ADMIN_USER_ID,
  
  WETH_ADDRESS: '0x4200000000000000000000000000000000000006',
  
  // Maximum age in seconds for a transaction to be accepted (10 minutes = 600 seconds)
  MAX_TRANSACTION_AGE_SECONDS: 600,
  
  // Delay before executing send after detection (seconds)
  SEND_DELAY_SECONDS: 5,
  
  // Set to true to enable development logs panel, false for production
  DEBUG_MODE: process.env.NEXT_PUBLIC_DEBUG_MODE === 'true',
} as const

// Validation helper for server-side
export function validateServerConfig() {
  const required = {
    WLD_TOKEN_ADDRESS: APP_CONFIG.WLD_TOKEN_ADDRESS,
    SUPPORT_WALLET: APP_CONFIG.SUPPORT_WALLET,
    ADMIN_USER_ID: APP_CONFIG.ADMIN_USER_ID,
  }
  
  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key)
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please add them in Vercel project settings.`
    )
  }
}

// Validation helper for public config
export function validatePublicConfig() {
  const required = {
    NEXT_PUBLIC_CONTRACT_ADDRESS: APP_CONFIG.CONTRACT_ADDRESS,
    NEXT_PUBLIC_RPC_URL: APP_CONFIG.RPC_URL,
  }
  
  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key)
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required public environment variables: ${missing.join(', ')}. ` +
      `Please add them in Vercel project settings with NEXT_PUBLIC_ prefix.`
    )
  }
}
