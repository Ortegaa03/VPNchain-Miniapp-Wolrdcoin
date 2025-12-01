'use client'

import { useState, useEffect } from 'react'
import { X, Send, ShoppingCart, ExternalLink, TrendingUp, Trash2, Copy, Check } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Token } from '@/lib/tokens-config'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/translations'
import { deleteCustomToken, getCustomTokens } from '@/lib/storage-utils'
import { useToast } from '@/hooks/use-toast'
import { ResponsiveContainer, LineChart, Line, XAxis, Tooltip } from 'recharts'

type TokenDetails = {
  priceUSD: number | null
  change24h: number | null
  volume24h: number | null
  liquidity: number | null
  marketCap: number | null
  pairAddress?: string
  dexUrl?: string
  priceHistory?: Array<{ timestamp: number; price: number }>
}

type TimeRange = '24H' | '7D' | '1M' | 'MAX'

interface TokenDetailModalProps {
  isOpen: boolean
  onClose: () => void
  token: Token & { priceUSD: number | null; change24h: number | null }
  userBalance?: number
  onTokenDeleted?: () => void
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background/95 border border-border rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-muted-foreground mb-1">{payload[0].payload.time}</p>
        <p className="text-sm font-bold text-foreground">
          ${payload[0].value.toFixed(6)}
        </p>
      </div>
    )
  }
  return null
}

export function TokenDetailModal({ 
  isOpen, 
  onClose, 
  token, 
  userBalance = 0,
  onTokenDeleted 
}: TokenDetailModalProps) {
  const router = useRouter()
  const { t } = useLanguage()
  const { toast } = useToast()
  const [details, setDetails] = useState<TokenDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>('24H')
  const [isCustomToken, setIsCustomToken] = useState(false)
  const [chartData, setChartData] = useState<Array<{ time: string; price: number }>>([])
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      fetchTokenDetails()
      checkIfCustomToken()
    } else {
      setIsAnimating(false)
    }
  }, [isOpen, token.address])

  const checkIfCustomToken = () => {
    const customTokens = getCustomTokens()
    const isCustom = customTokens.some(
      t => t.address.toLowerCase() === token.address.toLowerCase()
    )
    setIsCustomToken(isCustom)
  }

  const fetchTokenDetails = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`)
      
      if (!response.ok) {
        setDetails({
          priceUSD: token.priceUSD,
          change24h: token.change24h,
          volume24h: null,
          liquidity: null,
          marketCap: null,
        })
        generateFallbackChart(token.priceUSD, token.change24h)
        return
      }
      
      const data = await response.json()
      
      if (data.pairs && data.pairs.length > 0) {
        const worldchainPairs = data.pairs.filter((p: any) => 
          p.chainId?.toLowerCase() === 'worldchain'
        )
        
        if (worldchainPairs.length > 0) {
          const bestPair = worldchainPairs[0]
          const priceUSD = parseFloat(bestPair.priceUsd) || token.priceUSD
          const change24h = parseFloat(bestPair.priceChange?.h24) || token.change24h
          
          setDetails({
            priceUSD,
            change24h,
            volume24h: parseFloat(bestPair.volume?.h24) || null,
            liquidity: parseFloat(bestPair.liquidity?.usd) || null,
            marketCap: parseFloat(bestPair.marketCap) || null,
            pairAddress: bestPair.pairAddress,
            dexUrl: bestPair.url,
          })
          
          generateChartData(priceUSD, change24h)
        } else {
          setDetails({
            priceUSD: token.priceUSD,
            change24h: token.change24h,
            volume24h: null,
            liquidity: null,
            marketCap: null,
          })
          generateFallbackChart(token.priceUSD, token.change24h)
        }
      }
    } catch (error) {
      console.error('[v0] Error fetching token details:', error)
      setDetails({
        priceUSD: token.priceUSD,
        change24h: token.change24h,
        volume24h: null,
        liquidity: null,
        marketCap: null,
      })
      generateFallbackChart(token.priceUSD, token.change24h)
    } finally {
      setIsLoading(false)
    }
  }

  const generateChartData = (currentPrice: number | null, change24h: number | null) => {
    if (!currentPrice) {
      setChartData([])
      return
    }

    const points = 48
    const data: Array<{ time: string; price: number }> = []
    const changePercent = (change24h || 0) / 100
    const startPrice = currentPrice / (1 + changePercent)
    
    for (let i = 0; i <= points; i++) {
      const progress = i / points
      
      const trendPrice = startPrice + (startPrice * changePercent * progress)
      
      const microTrend = Math.sin(progress * Math.PI * 8) * 0.04
      const volatility = (Math.random() - 0.5) * 0.08
      
      const price = trendPrice * (1 + microTrend + volatility)
      
      const hoursAgo = 24 - (24 * progress)
      const timeLabel = hoursAgo === 0 ? 'Now' : 
                       hoursAgo < 1 ? `${Math.round(hoursAgo * 60)}m` :
                       `${Math.round(hoursAgo)}h`
      
      data.push({
        time: timeLabel,
        price: Math.max(price, 0)
      })
    }
    
    setChartData(data)
  }

  const generateFallbackChart = (currentPrice: number | null, change24h: number | null) => {
    if (currentPrice) {
      generateChartData(currentPrice, change24h)
    } else {
      setChartData([])
    }
  }

  const handleDelete = () => {
    if (isCustomToken) {
      deleteCustomToken(token.address)
      toast({
        title: t('tokenDetail.tokenDeleted'),
        description: t('tokenDetail.tokenDeletedDesc'),
      })
      onClose()
      onTokenDeleted?.()
    }
  }

  const handleSendClick = () => {
    localStorage.setItem('preselectedToken', JSON.stringify({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      icon: token.icon,
    }))
    onClose()
    router.push('/send')
  }

  const handleBuyClick = () => {
    localStorage.setItem('preselectedToken', JSON.stringify({
      address: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      icon: token.icon,
    }))
    onClose()
    router.push('/swap')
  }

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(token.address)
    setCopiedAddress(true)
    toast({
      title: 'Dirección copiada',
      description: 'La dirección del contrato se copió al portapapeles',
    })
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  const formatPrice = (price: number | null): string => {
    if (price === null) return t('dashboard.noData')
    if (price < 0.0001) return `$${price.toFixed(6)}`
    if (price < 0.01) return `$${price.toFixed(4)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toFixed(2)}`
  }

  const formatNumber = (num: number | null): string => {
    if (num === null) return t('dashboard.noData')
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}b`
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}m`
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}k`
    return `$${num.toFixed(2)}`
  }

  if (!isOpen) return null

  const isPositiveChange = (details?.change24h || token.change24h || 0) >= 0
  const displayPrice = hoveredPrice || details?.priceUSD || token.priceUSD

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      <div
        className={`fixed inset-x-0 bottom-0 z-[101] transition-transform duration-500 ease-out ${
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <Card className="bg-background rounded-t-[32px] rounded-b-none border-0 shadow-2xl pb-safe">
          {/* Header with pill indicator */}
          <div className="bg-background/95 backdrop-blur-sm rounded-t-[32px] pt-2.5 pb-2 px-5">
            <div className="flex justify-center mb-2.5">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Detalles del Token</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-7 w-7 p-0 rounded-full bg-muted/50"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Token Info */}
          <div className="px-5 pb-5 pt-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
                  {token.icon && !token.icon.includes('placeholder.svg') ? (
                    <img 
                      src={token.icon || "/placeholder.svg"} 
                      alt={token.symbol}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        const parent = e.currentTarget.parentElement
                        if (parent) {
                          const fallback = parent.querySelector('.fallback-symbol') as HTMLElement
                          if (fallback) fallback.style.display = 'flex'
                        }
                      }}
                    />
                  ) : null}
                  <div 
                    className="fallback-symbol w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10"
                    style={{ display: (token.icon && !token.icon.includes('placeholder.svg')) ? 'none' : 'flex' }}
                  >
                    <span className="text-lg font-bold text-primary">
                      {token.symbol.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold">{token.name}</h3>
                  <p className="text-[10px] text-muted-foreground">{token.symbol}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-base font-bold">
                  {formatPrice(displayPrice)}
                </p>
                {(details?.change24h || token.change24h) !== null && (
                  <p className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                    isPositiveChange ? 'text-green-500' : 'text-red-500'
                  }`}>
                    {isPositiveChange ? '▲' : '▼'} {Math.abs(details?.change24h || token.change24h || 0).toFixed(2)}%
                  </p>
                )}
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 ? (
              <div className="bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-xl p-2 h-[110px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={chartData}
                    onMouseMove={(state: any) => {
                      if (state?.activePayload?.[0]?.value) {
                        setHoveredPrice(state.activePayload[0].value)
                      }
                    }}
                    onMouseLeave={() => setHoveredPrice(null)}
                  >
                    <XAxis 
                      dataKey="time" 
                      stroke="currentColor"
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 7 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                      minTickGap={50}
                    />
                    <Tooltip 
                      content={<CustomTooltip />}
                      cursor={{ stroke: isPositiveChange ? '#10b981' : '#ef4444', strokeWidth: 1, strokeDasharray: '5 5' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke={isPositiveChange ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      dot={false}
                      animationDuration={1000}
                      activeDot={{ r: 3, strokeWidth: 2, stroke: isPositiveChange ? "#10b981" : "#ef4444" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-secondary/30 to-secondary/10 rounded-xl p-2.5 text-center h-[110px] flex items-center justify-center">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <p className="text-[10px]">{t('tokenDetail.chartComingSoon')}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 h-10 text-xs font-semibold rounded-xl shadow-lg"
                onClick={handleSendClick}
              >
                <Send className="h-3 w-3 mr-1.5" />
                Enviar
              </Button>
              <Button
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 h-10 text-xs font-semibold rounded-xl shadow-lg"
                onClick={handleBuyClick}
              >
                <ShoppingCart className="h-3 w-3 mr-1.5" />
                Comprar
              </Button>
            </div>

            {/* Market Stats */}
            {!isLoading && (
              <div className="grid grid-cols-3 gap-1.5">
                <div className="bg-secondary/20 rounded-lg p-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground mb-0.5">
                    Volumen 24h
                  </p>
                  <p className="text-[10px] font-bold break-words">
                    {formatNumber(details?.volume24h || null)}
                  </p>
                </div>
                <div className="bg-secondary/20 rounded-lg p-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground mb-0.5">
                    Cap. Mercado
                  </p>
                  <p className="text-[10px] font-bold break-words">
                    {formatNumber(details?.marketCap || null)}
                  </p>
                </div>
                <div className="bg-secondary/20 rounded-lg p-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground mb-0.5">
                    Liquidez
                  </p>
                  <p className="text-[10px] font-bold break-words">
                    {formatNumber(details?.liquidity || null)}
                  </p>
                </div>
              </div>
            )}

            {/* Contract Address Section */}
            <div 
              className="bg-secondary/20 rounded-xl p-2.5 cursor-pointer hover:bg-secondary/30 transition-colors"
              onClick={handleCopyAddress}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-[9px] text-muted-foreground mb-0.5">
                    Dirección del Contrato
                  </p>
                  <p className="text-[10px] font-mono font-semibold truncate">
                    {token.address}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 rounded-lg flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCopyAddress()
                  }}
                >
                  {copiedAddress ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Explorer Link & Delete Button */}
            <div className="grid grid-cols-2 gap-2">
              {details?.dexUrl && (
                <Button
                  variant="outline"
                  className="w-full h-9 rounded-xl text-[10px]"
                  onClick={() => window.open(details.dexUrl, '_blank')}
                >
                  <ExternalLink className="h-3 w-3 mr-1.5" />
                  Ver en Explorer
                </Button>
              )}
              
              {isCustomToken && (
                <Button
                  variant="destructive"
                  className={`w-full h-9 rounded-xl text-[10px] ${!details?.dexUrl ? 'col-span-2' : ''}`}
                  onClick={handleDelete}
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  Eliminar Token
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
