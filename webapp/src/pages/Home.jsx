import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Server, Play, Radio } from 'lucide-react'
import ParticlesBackground from '../components/Particles'

export default function Home() {
  const cards = [
    {
      title: 'Launch Compute Dashboard',
      description: 'View and manage all compute nodes',
      icon: Server,
      link: '/nodes',
      gradient: 'from-cyan-500 to-blue-500'
    },
    {
      title: 'View Active Nodes',
      description: 'Monitor GPU nodes and their status',
      icon: Server,
      link: '/nodes',
      gradient: 'from-blue-500 to-purple-500'
    },
    {
      title: 'Stream GPU Session',
      description: 'Connect to remote GPU via Moonlight',
      icon: Radio,
      link: '/stream',
      gradient: 'from-purple-500 to-pink-500'
    },
  ]

  return (
    <div className="relative min-h-screen overflow-hidden">
      <ParticlesBackground />
      
      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[90vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          <motion.h1
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-6xl md:text-8xl font-bold mb-4 font-['Orbitron']"
          >
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
              ⚡ NeuraX
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-400 mb-12"
          >
            Decentralized Compute for Everyone
          </motion.p>

          {/* CTA Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-16">
            {cards.map((card, index) => {
              const Icon = card.icon
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="group"
                >
                  <Link to={card.link}>
                    <div className="glass rounded-xl p-6 h-full border border-cyan-500/20 hover:border-cyan-500/50 transition-all cursor-pointer">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-gray-200 group-hover:text-cyan-400 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-gray-400 text-sm">
                        {card.description}
                      </p>
                      <div className="mt-4 text-cyan-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Launch →
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {/* Quick Action Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-12"
          >
            <Link to="/tasks">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5" />
                  <span>Run Compute Job</span>
                </div>
              </motion.button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

