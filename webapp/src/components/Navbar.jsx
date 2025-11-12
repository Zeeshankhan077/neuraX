import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, Server, Play, Radio, History, Settings, FileText } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'

export default function Navbar() {
  const location = useLocation()
  const { connected } = useSocket()

  const navItems = [
    { path: '/', label: 'Home', icon: Zap },
    { path: '/nodes', label: 'Nodes', icon: Server },
    { path: '/tasks', label: 'Tasks', icon: Play },
    { path: '/notebook', label: 'Notebook', icon: FileText },
    { path: '/stream', label: 'Stream', icon: Radio },
    { path: '/history', label: 'History', icon: History },
    { path: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="glass-strong border-b border-cyan-500/20 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
            >
              <Zap className="w-8 h-8 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
            </motion.div>
            <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-magenta-400 bg-clip-text text-transparent font-['Orbitron']">
              NeuraX
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-4 py-2 rounded-lg transition-all ${
                    isActive
                      ? 'text-cyan-400'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/30 rounded-lg glow-cyan"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className="relative flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400 hidden sm:inline">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}


