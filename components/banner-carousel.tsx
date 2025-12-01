'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Banner = {
  id: string
  image: string
  link?: string
}

const BANNERS: Banner[] = [
  {
    id: '1',
    image: 'https://files.catbox.moe/81xduw.png',
    link: 'https://t.me/vpnchain_bot', // Optional link when clicking banner
  },
  {
    id: '2',
    image: 'https://files.catbox.moe/6on5ps.png',
    link: 'https://t.me/vpnchain_bot', // Optional link when clicking banner
  },
  // Add more banners here in the future
  // {
  //   id: '2',
  //   image: 'https://your-image-url.png',
  //   link: 'https://your-link.com',
  // },
]

export function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Auto-slide every 5 seconds
  useEffect(() => {
    if (BANNERS.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % BANNERS.length)
  }

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length)
  }

  const handleBannerClick = () => {
    const banner = BANNERS[currentIndex]
    if (banner.link) {
      window.open(banner.link, '_blank')
    }
  }

  if (BANNERS.length === 0) return null

  return (
    <div className="relative w-full px-2">
      {/* Banner Container */}
      <div
        className="relative w-full h-[120px] rounded-2xl overflow-hidden cursor-pointer group"
        onClick={handleBannerClick}
      >
        {/* Banner Image */}
        <img
          src={BANNERS[currentIndex].image || "/placeholder.svg"}
          alt={`Banner ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    </div>
  )
}
