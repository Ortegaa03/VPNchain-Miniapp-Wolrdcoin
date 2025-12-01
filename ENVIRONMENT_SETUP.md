# Environment Variables Setup Guide

This document explains all environment variables required for the VPNchain Miniapp and how to configure them securely in Vercel.

## 🔐 Security First

**IMPORTANT:** All sensitive variables (private keys, tokens, etc.) are stored in Vercel's secure environment variables system. They are **NEVER** hardcoded in the source code.

## 📋 Required Environment Variables

### Public Variables (Client-Side)
These variables are prefixed with `NEXT_PUBLIC_` and are accessible in the browser:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Smart contract address on Worldchain | `0x203fDB78376f90893309b87d704567b2C5341E2a` |
| `NEXT_PUBLIC_RPC_URL` | RPC endpoint for blockchain connection | `https://worldchain-mainnet.g.alchemy.com/public` |
| `NEXT_PUBLIC_CHAIN_ID` | Blockchain chain ID (480 = Worldchain) | `480` |
| `NEXT_PUBLIC_DEBUG_MODE` | Enable debug logs panel | `false` |

### Private Variables (Server-Side Only)
These variables are **ONLY** accessible in API routes and server components:

| Variable | Description | How to Get |
|----------|-------------|------------|
| `WLD_TOKEN_ADDRESS` | WLD Token contract address | Get from Worldchain docs |
| `SUPPORT_WALLET` | Wallet address for refunds | Your support wallet address |
| `SUPPORT_EMAIL` | Support contact email | Your email |
| `ADMIN_USER_ID` | Telegram user ID for admin access | Send `/start` to @userinfobot on Telegram |
| `PRIVATE_KEY` | Private key of contract owner wallet | **CRITICAL: Keep secret!** |
| `TELEGRAM_BOT_TOKEN` | Bot token for notifications | Get from @BotFather on Telegram |

## 🚀 Setup in Vercel

### Method 1: Via Vercel Dashboard (Recommended)

1. Go to your project in Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable one by one:
   - Enter the variable name (e.g., `ADMIN_USER_ID`)
   - Enter the value
   - Select which environments (Production, Preview, Development)
   - Click **Save**

### Method 2: Via Vercel CLI

\`\`\`bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variables
vercel env add ADMIN_USER_ID
vercel env add PRIVATE_KEY
vercel env add TELEGRAM_BOT_TOKEN
# ... etc for each variable
\`\`\`

## 🧪 Local Development Setup

1. Copy the example file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Fill in your values in `.env`:
   \`\`\`env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
   ADMIN_USER_ID=123456789
   PRIVATE_KEY=0x...
   # ... etc
   \`\`\`

3. **NEVER** commit the `.env` file to git (it's already in `.gitignore`)

## 🔍 How to Get Your Telegram User ID

1. Open Telegram
2. Search for `@userinfobot`
3. Send `/start` to the bot
4. The bot will reply with your user ID
5. Copy this number to `ADMIN_USER_ID`

## 🤖 How to Get Telegram Bot Token

1. Open Telegram
2. Search for `@BotFather`
3. Send `/newbot` and follow instructions
4. Copy the token provided
5. Add it to `TELEGRAM_BOT_TOKEN`

## ⚠️ Security Best Practices

1. **Never commit secrets to git** - Use `.env` for local, Vercel dashboard for production
2. **Rotate keys if exposed** - If your `PRIVATE_KEY` is ever exposed, move funds immediately
3. **Use different keys for dev/prod** - Don't use production private keys in development
4. **Limit access** - Only give team members access to environment variables they need
5. **Monitor wallet activity** - Watch for unauthorized transactions

## 🐛 Troubleshooting

### "ADMIN_USER_ID not configured" Error
- Make sure you added `ADMIN_USER_ID` in Vercel environment variables
- Verify the value is just the number (no quotes, no spaces)
- Redeploy after adding the variable

### "PRIVATE_KEY not configured" Error
- Add `PRIVATE_KEY` in Vercel (Settings → Environment Variables)
- Make sure it starts with `0x`
- Ensure the wallet has ETH for gas fees

### Admin Panel Shows "Unauthorized"
- Verify your Telegram user ID is correct (use @userinfobot)
- Check that `ADMIN_USER_ID` matches your actual Telegram ID
- Make sure you're logged into Telegram Web App
- Check browser console for errors

### Transactions Failing
- Verify `PRIVATE_KEY` wallet is the contract owner
- Ensure wallet has ETH for gas fees
- Check `NEXT_PUBLIC_CONTRACT_ADDRESS` is correct
- Verify `NEXT_PUBLIC_RPC_URL` is accessible

## 📝 Validation

The app now validates all environment variables on startup. If any are missing, you'll see clear error messages indicating which variables need to be configured.

Check the Vercel deployment logs or browser console for validation errors.
