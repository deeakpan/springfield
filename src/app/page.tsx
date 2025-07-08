"use client";

import { motion } from "framer-motion";
import {
  Map,
  Coins,
  Palette,
  Globe,
  Users,
  Zap,
  Star,
  ArrowRight,
  Heart,
  Sparkles,
  Building2,
  Wallet,
  Grid3X3,
  MousePointer
} from "lucide-react";
import { ConnectButton } from '@rainbow-me/rainbowkit';

// Feature Card Component
const FeatureCard = ({ icon: Icon, title, description, color, delay, gradient }: any) => (
  <motion.div
    className={`p-8 rounded-lg border-2 border-black shadow-lg hover:shadow-xl transition-all duration-300 ${color}`}
    whileHover={{ scale: 1.02, y: -5 }}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
  >
    <div className={`w-16 h-16 rounded-md ${gradient} border-2 border-black flex items-center justify-center mb-6`}>
      <Icon className="w-8 h-8 text-black" />
    </div>
    <h3 className="text-2xl font-bold mb-3 text-black">{title}</h3>
    <p className="text-gray-700 leading-relaxed">{description}</p>
  </motion.div>
);

// Special Feature Card for the middle tile auction
const SpecialFeatureCard = ({ delay }: any) => (
  <motion.div
    className="p-8 rounded-lg border-2 border-black bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg hover:shadow-xl transition-all duration-300 col-span-full lg:col-span-2"
    whileHover={{ scale: 1.02, y: -5 }}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
  >
    <div className="flex items-center justify-between mb-6">
      <div className="w-16 h-16 rounded-md bg-red-500 border-2 border-black flex items-center justify-center">
        <Star className="w-8 h-8 text-black" />
      </div>
      <div className="text-right">
        <div className="bg-red-500 text-black px-3 py-1 rounded-md font-bold text-sm border-2 border-black">
          AUCTION
        </div>
      </div>
    </div>
    <h3 className="text-2xl font-bold mb-3 text-black">Center Area Auction</h3>
    <p className="text-gray-800 leading-relaxed mb-4">
      The center area (tiles 17-23, rows 8-12) is Springfield's premium auction spot! This is a 7x5 block (7 columns by 5 rows) at the heart of the grid. Highest bidder gets 48 hours of maximum visibility. 
      Perfect for project launches, announcements, or maximum exposure. Bidding handled automatically by smart contracts.
    </p>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div className="bg-white/80 p-3 rounded border border-black">
        <div className="font-bold text-black">Current Bid</div>
        <div className="text-green-600 font-bold">1,250 $SPRFD</div>
      </div>
      <div className="bg-white/80 p-3 rounded border border-black">
        <div className="font-bold text-black">Time Left</div>
        <div className="text-red-600 font-bold">12h 34m</div>
      </div>
    </div>
    <div className="mt-4 p-3 bg-white/80 rounded border border-black">
      <div className="text-sm text-gray-700">
        <span className="font-bold text-black">How it works:</span> Place your bid in $SPRFD. Highest bidder wins the 48-hour rental period. 
        Smart contract automatically assigns the center area to the winning wallet.
      </div>
    </div>
  </motion.div>
);

// Stats Component
const StatCard = ({ number, label, icon: Icon, delay }: any) => (
  <motion.div
    className="text-center p-6"
    whileHover={{ scale: 1.05 }}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
  >
    <div className="w-20 h-20 rounded-md bg-green-500 border-2 border-black flex items-center justify-center mx-auto mb-4 shadow-lg">
      <Icon className="w-10 h-10 text-black" />
    </div>
    <div className="text-4xl font-bold text-yellow-300 mb-2">{number}</div>
    <div className="text-white font-medium">{label}</div>
  </motion.div>
);

// Mini Grid Preview
const MiniGridPreview = () => (
  <div className="relative">
    <div className="grid grid-cols-6 gap-1 max-w-xs mx-auto">
      {Array.from({ length: 36 }, (_, i) => (
        <motion.div
          key={i}
          className="aspect-square rounded-sm cursor-pointer border border-black"
          style={{
            background: i % 6 === 0 ? '#FFD700' :
                       i % 6 === 1 ? '#4A90E2' :
                       i % 6 === 2 ? '#7ED321' :
                       i % 6 === 3 ? '#FF6B35' :
                       i % 6 === 4 ? '#E74C3C' :
                       '#9B59B6',
            animationDelay: `${i * 0.05}s`
          }}
          whileHover={{ scale: 1.2, rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
        />
      ))}
    </div>
    <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 border-2 border-black rounded-full animate-pulse" />
    <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-yellow-400 border-2 border-black rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
  </div>
);

export default function Home() {
  return (
    <div className="min-h-screen bg-blue-900 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-blue-500 border-b-2 border-black shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              className="flex items-center space-x-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="w-10 h-10 rounded-full bg-green-500 border-2 border-black flex items-center justify-center shadow-lg">
                <Map className="w-6 h-6 text-black" />
              </div>
              <span className="text-2xl font-bold text-yellow-300">
                Springfield
              </span>
            </motion.div>
            
            <motion.div
              className="hidden md:flex space-x-8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <a href="#features" className="text-white hover:text-green-400 font-medium transition-colors">Features</a>
              <a href="/grid" className="text-white hover:text-green-400 font-medium transition-colors">Grid</a>
              <a href="#pricing" className="text-white hover:text-green-400 font-medium transition-colors">Pricing</a>
              <a href="#community" className="text-white hover:text-green-400 font-medium transition-colors">Community</a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <ConnectButton.Custom>
                {({ account, chain, openConnectModal, openAccountModal, authenticationStatus, mounted }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus || authenticationStatus === 'authenticated');
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        type="button"
                        className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-base rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 max-w-[100px] sm:max-w-none truncate"
                      >
                        <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                        Connect Wallet
                      </button>
                    );
                  }
                  return (
                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-base rounded-md bg-green-500 text-black font-bold border-2 border-black hover:bg-green-400 transition-all duration-200 flex items-center gap-1 sm:gap-2 max-w-[100px] sm:max-w-none truncate"
                    >
                      <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                      {account.displayName}
                    </button>
                  );
                }}
              </ConnectButton.Custom>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-blue-900 relative overflow-visible">
        <div className="max-w-7xl mx-auto relative">
          {/* Bart image in hero, top-right */}
          <img
            src="/cool_bart-removebg-preview.png"
            alt="Cool Bart"
            className="block"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              maxWidth: 'clamp(80px, 15vw, 220px)',
              width: 'clamp(80px, 15vw, 220px)',
              minWidth: 60,
              zIndex: 20,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          />
          <div className="text-center mb-16">
            <motion.div
              className="inline-flex items-center space-x-2 bg-yellow-500 text-black px-4 py-2 rounded-md mb-6 border-2 border-black"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Sparkles className="w-5 h-5" />
              <span className="font-bold">The Onchain Attention Layer</span>
            </motion.div>
            <div className="text-sm text-yellow-200 mb-4 font-semibold">Built on Pepe Unchained L2 for speed, fun, and community.</div>

            <motion.h1
              className="text-5xl md:text-7xl font-bold mb-8 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-yellow-300">
                Springfield
              </span>
            </motion.h1>
            
            <motion.p
              className="text-xl md:text-2xl text-white mb-10 max-w-4xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              Own your piece of the digital world! Buy, customize, and showcase your tiles on our
              <span className="text-yellow-300 font-semibold"> 40x20 blockchain-powered grid</span>.
              From personal branding to project showcases, make your mark in Springfield!
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <a href="/grid" className="px-8 py-4 rounded-md bg-green-500 text-black font-bold text-lg hover:bg-green-400 transition-all duration-200 flex items-center space-x-2 border-2 border-black">
                <span>Start Exploring</span>
                <ArrowRight className="w-5 h-5" />
              </a>
            </motion.div>

            {/* Mini Grid Preview */}
            <motion.div
              className="mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <MiniGridPreview />
            </motion.div>

            <motion.div
              className="flex items-center justify-center space-x-6 text-sm text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="flex items-center space-x-2">
                <MousePointer className="w-4 h-4" />
                <span>Interactive Grid</span>
              </div>
              <div className="flex items-center space-x-2">
                <Coins className="w-4 h-4" />
                <span>Crypto Payments</span>
              </div>
              <div className="flex items-center space-x-2">
                <Palette className="w-4 h-4" />
                <span>Customizable</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Tokenomics Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-800">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              $SPRFD <span className="text-yellow-300">Tokenomics</span>
            </h2>
            <p className="text-xl text-white max-w-3xl mx-auto">
              Our native token powers the Springfield ecosystem with staking, burning, and governance
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <motion.div
              className="bg-white rounded-lg p-6 border-2 border-black text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 rounded-md bg-green-500 border-2 border-black flex items-center justify-center mx-auto mb-4">
                <Coins className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Dual Payments</h3>
              <p className="text-gray-700">Buy tiles with $SPRFD or $PEPU tokens</p>
            </motion.div>

            <motion.div
              className="bg-white rounded-lg p-6 border-2 border-black text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 rounded-md bg-red-500 border-2 border-black flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Token Burning</h3>
              <p className="text-gray-700">Staking burns tokens, creating price spikes</p>
            </motion.div>

            <motion.div
              className="bg-white rounded-lg p-6 border-2 border-black text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 rounded-md bg-blue-500 border-2 border-black flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Staking Rewards</h3>
              <p className="text-gray-700">Earn rewards and participate in governance</p>
            </motion.div>

            <motion.div
              className="bg-white rounded-lg p-6 border-2 border-black text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <div className="w-16 h-16 rounded-md bg-purple-500 border-2 border-black flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Community DAO</h3>
              <p className="text-gray-700">Vote on features and shape Springfield's future</p>
            </motion.div>
          </div>

          {/* Rental System Showcase */}
          <motion.div
            className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-8 border-2 border-black"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-3xl font-bold text-black mb-4">Tile Rental System</h3>
                <p className="text-gray-800 mb-6">
                  Own multiple tiles? Rent them out to other projects and earn passive income! 
                  The rental marketplace allows projects to get visibility while tile owners earn $SPRFD.
                </p>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full border border-black"></div>
                    <span className="text-black font-semibold">Set your own rental prices</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full border border-black"></div>
                    <span className="text-black font-semibold">48-hour minimum rental periods</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full border border-black"></div>
                    <span className="text-black font-semibold">Automatic payment in $SPRFD</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full border border-black"></div>
                    <span className="text-black font-semibold">Center tiles auctioned by Springfield</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 border-2 border-black">
                <h4 className="text-xl font-bold text-black mb-4">Center Tile Auctions</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Center Area (tiles 17-23, rows 8-12)</span>
                    <span className="font-bold text-red-600">Auction Only</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Rental Period</span>
                    <span className="font-bold text-black">48 Hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Current Bid</span>
                    <span className="font-bold text-green-600">1,250 $SPRFD</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-gray-700 font-bold">User-Owned Tiles</span>
                    <span className="font-bold text-blue-600">Set Your Price</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Why Choose <span className="text-yellow-300">Springfield</span>?
            </h2>
            <p className="text-xl text-white max-w-3xl mx-auto">
              Experience the future of digital ownership with our innovative platform
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Coins}
              title="Dual Token Payments"
              description="Buy tiles with $SPRFD (our native token) or $PEPU. Staking $SPRFD burns tokens, creating price spikes and scarcity."
              color="bg-gradient-to-br from-green-100 to-green-200"
              gradient="bg-green-500"
              delay={0.1}
            />
            <FeatureCard
              icon={Palette}
              title="Customizable Tiles"
              description="Add your name, wallet address, images, NFTs, website links, and more. Make each tile uniquely yours with rich customization options."
              color="bg-gradient-to-br from-blue-100 to-blue-200"
              gradient="bg-blue-500"
              delay={0.2}
            />
            <FeatureCard
              icon={Globe}
              title="Website Integration"
              description="Connect your tiles directly to your website, social media, or any online presence. Drive traffic and showcase your projects."
              color="bg-gradient-to-br from-purple-100 to-purple-200"
              gradient="bg-purple-500"
              delay={0.3}
            />
            <FeatureCard
              icon={Building2}
              title="Project Showcases"
              description="Perfect for projects to display logos, links, and information. Rent out your tiles to other projects for passive income."
              color="bg-gradient-to-br from-orange-100 to-orange-200"
              gradient="bg-orange-500"
              delay={0.4}
            />
            <FeatureCard
              icon={Zap}
              title="Instant Updates"
              description="Real-time updates across the entire Springfield grid. Changes are reflected instantly with blockchain transparency."
              color="bg-gradient-to-br from-red-100 to-red-200"
              gradient="bg-red-500"
              delay={0.5}
            />
            <FeatureCard
              icon={Users}
              title="Rental Marketplace"
              description="Own multiple tiles? Set your own rental prices and rent them out to others! Create passive income streams while helping projects get visibility."
              color="bg-gradient-to-br from-pink-100 to-pink-200"
              gradient="bg-pink-500"
              delay={0.6}
            />
            
            {/* Special Center Tile Auction Feature */}
            <SpecialFeatureCard delay={0.7} />
            
            <FeatureCard
              icon={Star}
              title="Staking Rewards"
              description="Stake $SPRFD tokens to earn rewards and participate in governance. Burning mechanism creates deflationary pressure."
              color="bg-gradient-to-br from-yellow-100 to-yellow-200"
              gradient="bg-yellow-500"
              delay={0.8}
            />
            <FeatureCard
              icon={Heart}
              title="Community Driven"
              description="Join a vibrant community of creators, developers, and digital enthusiasts. Vote on features and shape Springfield's future."
              color="bg-gradient-to-br from-indigo-100 to-indigo-200"
              gradient="bg-indigo-500"
              delay={0.9}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Springfield <span className="text-yellow-300">Numbers</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCard number="1,600" label="Total Tiles" icon={Map} delay={0.1} />
            <StatCard number="500+" label="Active Users" icon={Users} delay={0.2} />
            <StatCard number="100+" label="Projects" icon={Building2} delay={0.3} />
            <StatCard number="24/7" label="Live Updates" icon={Zap} delay={0.4} />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
              Ready to Join <span className="text-yellow-300">Springfield</span>?
            </h2>
            <p className="text-xl text-white mb-10">
              Don't miss out on the digital revolution. Secure your tiles today and become part of the future!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="px-8 py-4 rounded-md bg-green-500 text-black font-bold text-lg hover:bg-green-400 transition-all duration-200 flex items-center space-x-2 border-2 border-black">
                <Wallet className="w-5 h-5" />
                <span>Connect Wallet</span>
              </button>
              <button className="px-8 py-4 rounded-md bg-white text-black font-bold text-lg hover:bg-gray-100 transition-all duration-200 flex items-center space-x-2 border-2 border-black">
                <Sparkles className="w-5 h-5" />
                <span>Learn More</span>
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16 px-4 sm:px-6 lg:px-8 border-t-2 border-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
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
                <li><a href="#" className="hover:text-green-400 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Documentation</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Community</h3>
              <ul className="space-y-3 text-gray-300">
                <li><a href="#" className="hover:text-green-400 transition-colors">Discord</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Twitter</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Telegram</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Blog</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">Support</h3>
              <ul className="space-y-3 text-gray-300">
                <li><a href="#" className="hover:text-green-400 transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-green-400 transition-colors">Bug Report</a></li>
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
