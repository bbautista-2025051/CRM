import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { BackgroundPlus } from "@/components/background-plus/BackgroundPlus"
import { cn } from "@/lib/utils"
import { Icon } from "@/components/ui/Icon"

interface CryptoData {
  id: string
  symbol: string
  name: string
  image: string
  current_price: number
  market_cap: number
  market_cap_rank: number
  price_change_percentage_24h: number
  total_volume: number
  high_24h: number
  low_24h: number
  sparkline_in_7d: { price: number[] }
}

const mockCryptoData = [
  {
    id: "bitcoin",
    symbol: "btc",
    name: "Bitcoin",
    image: "https://cdn.21st.dev/assets/mirror/39/39d2790e598859909bf6cb1ed16377e3b220f7e8f2152ca733f70f28abb969b5.png",
    current_price: 43250.5,
    market_cap: 847500000000,
    market_cap_rank: 1,
    price_change_percentage_24h: 2.45,
    total_volume: 18500000000,
    high_24h: 44100.25,
    low_24h: 42800.75,
    sparkline_in_7d: { price: [42000, 42500, 43000, 42800, 43200, 43500, 43250] },
  },
  {
    id: "ethereum",
    symbol: "eth",
    name: "Ethereum",
    image: "https://cdn.21st.dev/assets/mirror/52/5212de593ffa17b5acc04260fe702e32b3bb815f2eda4d7ca15b085967bd39f3.png",
    current_price: 2650.75,
    market_cap: 318500000000,
    market_cap_rank: 2,
    price_change_percentage_24h: -1.25,
    total_volume: 12500000000,
    high_24h: 2720.5,
    low_24h: 2620.25,
    sparkline_in_7d: { price: [2700, 2680, 2650, 2670, 2640, 2660, 2650] },
  },
  {
    id: "binancecoin",
    symbol: "bnb",
    name: "BNB",
    image: "https://cdn.21st.dev/assets/mirror/c8/c8f109417aa3e33fa63a791dac00beed96d3e8bc452ffab61587e006603c18d5.png",
    current_price: 315.25,
    market_cap: 47200000000,
    market_cap_rank: 4,
    price_change_percentage_24h: 0.85,
    total_volume: 1250000000,
    high_24h: 320.5,
    low_24h: 312.75,
    sparkline_in_7d: { price: [310, 312, 315, 318, 314, 316, 315] },
  },
  {
    id: "solana",
    symbol: "sol",
    name: "Solana",
    image: "https://cdn.21st.dev/assets/mirror/22/225eee32e447c82796f9393d3cd749655bfac3df0e65ad5eae2227d148a9a952.png",
    current_price: 98.45,
    market_cap: 43500000000,
    market_cap_rank: 5,
    price_change_percentage_24h: 3.75,
    total_volume: 2100000000,
    high_24h: 102.25,
    low_24h: 95.5,
    sparkline_in_7d: { price: [95, 97, 99, 96, 98, 100, 98] },
  },
]

interface CryptoDashboardProps {
  selectedCoins?: string[]
  onCoinSelect?: (coinId: string) => void
}

const CryptoDashboard: React.FC<CryptoDashboardProps> = () => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCoins, setSelectedCoins] = useState<string[]>([
    "bitcoin",
    "ethereum",
    "binancecoin",
    "solana",
    "cardano",
    "chainlink",
    "avalanche-2",
    "polkadot",
  ])
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const fetchCryptoData = useCallback(async () => {
    try {
      setError(null)
      const coinIds = selectedCoins.join(",")
      const urls = [
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h`,
        `https://cors-anywhere.herokuapp.com/https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h`,
      ]
      let data = null
      for (const url of urls) {
        try {
          const response = await fetch(url)
          if (response.ok) {
            data = await response.json()
            break
          }
        } catch {
          continue
        }
      }
      if (data) setCryptoData(data)
      else throw new Error("All API endpoints failed")
    } catch {
      setCryptoData(mockCryptoData)
      setError("Using demo data - API unavailable")
    } finally {
      setLoading(false)
    }
  }, [selectedCoins])

  useEffect(() => {
    fetchCryptoData()
    const interval = setInterval(fetchCryptoData, 60000)
    return () => clearInterval(interval)
  }, [fetchCryptoData])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleAddCoin = (coin: CryptoData) => {
    if (!selectedCoins.includes(coin.id)) {
      setSelectedCoins((prev) => [...prev, coin.id])
    }
  }

  const handleRemoveCoin = (coinId: string) => {
    setSelectedCoins((prev) => prev.filter((id) => id !== coinId))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-300">Loading crypto data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <BackgroundPlus
        plusColor="#3b82f6"
        plusSize={60}
        fade={true}
      />

      <div className="relative max-w-7xl mx-auto">
        <div className="mb-8 sm:mb-12 text-center">
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 dark:from-zinc-100 dark:via-zinc-300 dark:to-zinc-100 bg-clip-text text-transparent tracking-tight mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Crypto Dashboard
          </motion.h1>
          <motion.p
            className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Professional real-time cryptocurrency market analytics with interactive charts
          </motion.p>

          {error && (
            <motion.div
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-400/50 bg-amber-50/80 text-amber-800 dark:border-amber-600/50 dark:bg-amber-900/20 dark:text-amber-300 backdrop-blur-sm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {error}
            </motion.div>
          )}

          <motion.button
            onClick={() => setIsSearchOpen(true)}
            className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-xl border border-zinc-300/50 bg-white/80 text-zinc-900 hover:bg-white hover:border-zinc-400 shadow-lg hover:shadow-xl transition-all duration-200 dark:border-zinc-700/50 dark:bg-zinc-900/80 dark:text-zinc-100 dark:hover:bg-zinc-900 backdrop-blur-sm"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <span className="font-medium">Search Cryptocurrencies</span>
            <kbd className="bg-zinc-100 px-2 py-1 rounded-md text-xs border border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 font-mono">
              ⌘K
            </kbd>
          </motion.button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
          <AnimatePresence mode="popLayout">
            {
              cryptoData.map((crypto, index) => (
                <div
                  key={crypto.id}
                  className="group rounded-xl bg-white dark:bg-zinc-900 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      name="map"
                      className="w-8 h-8 shrink-0 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center"
                      size={20}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">
                        {crypto.name}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-medium tracking-wider">
                        {crypto.symbol}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Market Cap</span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        ${crypto.market_cap.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">24h Change</span>
                      <span className={`font-bold text-${crypto.price_change_percentage_24h >= 0 ? "emerald-600" : "rose-600"} dark:text-${crypto.price_change_percentage_24h >= 0 ? "emerald-400" : "rose-400"}`}>
                        {crypto.price_change_percentage_24h}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            }
          </AnimatePresence>
        </div>

        <div className="mt-8">
          <Icon name="search" className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mr-2" size={18} />
          <input
            type="text"
            placeholder="Search cryptocurrencies..."
            className="w-full px-3 py-2 rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:focus:ring-zinc-400"
            onFocus={() => setIsSearchOpen(true)}
          />
        </div>
      </div>
    </div>
  )
}

export default CryptoDashboard