"use client";

import { motion } from "framer-motion";
import { Map, Home, Grid3X3, ShoppingCart, Coins, Menu, X, Percent, Calculator, Layers, Heart } from "lucide-react";
import { useState } from "react";

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pricing model for new tile purchases
  const totalTiles = 765;
  const tierSize = 40; // every 40 sold
  const basePrice = 12000; // PEPU starting price
  const tierIncrement = 600; // +600 PEPU per tier
  const numTiers = Math.ceil(totalTiles / tierSize);

  const tiers = Array.from({ length: numTiers }).map((_, idx) => {
    const start = idx * tierSize;
    const end = Math.min(start + tierSize - 1, totalTiles - 1);
    const price = basePrice + idx * tierIncrement;
    return { idx, range: `${start}-${end}`, price };
  });

  return (
    <div className="min-h-screen bg-blue-900 text-white">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-blue-500 border-b-2 border-black shadow-lg">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-12 sm:h-16">
            <motion.div
              className="flex items-center space-x-2 sm:space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <a href="/" className="flex items-center space-x-2 sm:space-x-3 hover:opacity-80 transition-opacity">
                <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-green-500 border-2 border-black flex items-center justify-center shadow-lg">
                  <Map className="w-3 h-3 sm:w-6 sm:h-6 text-black" />
                </div>
                <span className="text-lg sm:text-2xl font-bold text-yellow-300 hidden sm:block">Springfield</span>
                <span className="text-sm font-bold text-yellow-300 sm:hidden">Home</span>
              </a>
            </motion.div>

            <motion.div
              className="hidden md:flex space-x-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <a href="/" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <Home className="w-4 h-4" />
                Home
              </a>
              <a href="/grid" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Grid
              </a>
              <a href="/marketplace" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Marketplace
              </a>
              <a href="/refund" className="text-white hover:text-green-400 font-medium transition-colors flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Refunds
              </a>
            </motion.div>

            <motion.button
              className="md:hidden p-2 rounded-md text-white hover:text-green-400 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </motion.button>
          </div>

          {/* Mobile nav */}
          <motion.div
            className={`md:hidden ${mobileMenuOpen ? 'block' : 'hidden'}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: mobileMenuOpen ? 1 : 0, height: mobileMenuOpen ? 'auto' : 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-2 pt-2 pb-3 space-y-1 bg-blue-600 border-t-2 border-black">
              <a href="/" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors border-b border-blue-500" onClick={() => setMobileMenuOpen(false)}>Home</a>
              <a href="/grid" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors border-b border-blue-500" onClick={() => setMobileMenuOpen(false)}>Grid</a>
              <a href="/marketplace" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors border-b border-blue-500" onClick={() => setMobileMenuOpen(false)}>Marketplace</a>
              <a href="/refund" className="block px-3 py-2 text-white hover:text-green-400 font-medium transition-colors" onClick={() => setMobileMenuOpen(false)}>Refunds</a>
            </div>
          </motion.div>
        </div>
      </nav>

      <div className="pt-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="inline-flex items-center bg-yellow-400 text-black px-3 py-1 rounded-md border-2 border-black mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Percent className="w-4 h-4 mr-2" />
            <span className="text-sm font-extrabold tracking-wide">Pricing & Fees</span>
          </motion.div>

          {/* Platform fee section */}
          <motion.div
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="bg-blue-800 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Percent className="w-5 h-5 text-yellow-300" />
                <h3 className="text-2xl font-bold">Platform Fee</h3>
              </div>
              <p className="text-white/90">Sales and rentals incur a <span className="font-bold text-yellow-300">5%</span> platform fee. Listings can be settled in <span className="font-bold text-yellow-300">PEPU (native)</span> or <span className="font-bold text-yellow-300">$SPRING</span> depending on the option you choose when listing.</p>
            </div>

            <div className="bg-blue-800 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Calculator className="w-5 h-5 text-yellow-300" />
                <h3 className="text-2xl font-bold">Rental Scenario</h3>
              </div>
              <p className="text-white/90">
                As the owner, you set a <span className="font-bold">daily price</span>. The <span className="font-bold">renter chooses the duration</span> (days) and pays <em>daily price × days</em>. Example: daily price 200 PEPU for 3 days = 600 PEPU. Platform fee is 5% (30 PEPU), you receive 570 PEPU. Payment can be PEPU or $SPRING based on your listing.
              </p>
            </div>

            <div className="bg-blue-800 border border-white/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Coins className="w-5 h-5 text-yellow-300" />
                <h3 className="text-2xl font-bold">Tile Sale</h3>
              </div>
              <p className="text-white/90">
                Set a sale price for your tile. When someone buys it, a <span className="font-bold">5% platform fee</span> is taken and you receive the remaining <span className="font-bold">95%</span>. Sales can be settled in <span className="font-bold">PEPU</span> or <span className="font-bold">$SPRING</span>, matching the sale configuration.
              </p>
            </div>
          </motion.div>

          {/* Purchase pricing tiers */}
          <motion.div
            className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-3xl font-bold mb-3">New Tile Purchase Pricing</h3>
            <p className="text-white/90 mb-4">
              We have <span className="font-bold text-yellow-300">{totalTiles}</span> tiles in total. The base purchase price starts at <span className="font-bold text-yellow-300">{basePrice.toLocaleString()} PEPU</span> and increases by <span className="font-bold text-yellow-300">{tierIncrement.toLocaleString()} PEPU</span> after every <span className="font-bold text-yellow-300">{tierSize}</span> tiles sold <span className="text-white/70">(~5% of the total grid)</span>.
            </p>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-white/80">
                    <th className="py-2 pr-4">Tier</th>
                    <th className="py-2 pr-4">Sold Range</th>
                    <th className="py-2 pr-4">Price (PEPU)</th>
                  </tr>
                </thead>
                <tbody>
                  {tiers.map(({ idx, range, price }) => (
                    <tr key={idx} className="border-t border-white/10">
                      <td className="py-2 pr-4 font-semibold text-white">{idx + 1}</td>
                      <td className="py-2 pr-4 text-white/90">{range}</td>
                      <td className="py-2 pr-4 text-yellow-300 font-bold">{price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-white/60 mt-3">
              Example: Tiles 0–39 cost 12,000 PEPU; tiles 40–79 cost 12,600 PEPU; tiles 80–119 cost 13,200 PEPU; tiles 120–159 cost 13,800 PEPU, and so on.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-t-2 border-black overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-green-500 border-2 border-black flex items-center justify-center">
                  <Map className="w-6 h-6 text-black" />
                </div>
                <span className="text-2xl font-bold">Springfield</span>
              </div>
              <p className="text-gray-300 leading-relaxed">
                The future of digital ownership and community building on the blockchain.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Platform</h3>
              <ul className="space-y-3 text-gray-300">
                <li><a href="#" className="hover:text-green-400 transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Grid Explorer</a></li>
                <li><a href="/pricing" className="hover:text-green-400 transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Community</h3>
              <ul className="space-y-3 text-gray-300">
                <li><a href="https://x.com/PEPUSpring2025?t=04sxvbharyQpKze1XWRCCg&s=35" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">X (Twitter)</a></li>
                <li><a href="https://t.me/PenkSpring" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">Telegram</a></li>
                <li><a href="https://t.me/d2eakpan" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">Support Telegram</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Products</h3>
              <ul className="space-y-3 text-gray-300">
                <li><a href="https://pepubank.net" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">PEPU Bank</a></li>
                <li><a href="https://superbridge.pepubank.net" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">Superbridge</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Support</h3>
              <ul className="space-y-3 text-gray-300">
                <li><a href="mailto:Springfieldteam12@gmail.com" className="hover:text-green-400 transition-colors">Contact Us</a></li>
                <li><a href="https://t.me/d2eakpan" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 transition-colors">Bug Report</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Springfield. Made with <Heart className="inline w-4 h-4 text-red-500" /> for the community.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


