import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon, Key, Network, Palette, RefreshCw } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'

export default function Settings() {
  const { connected } = useSocket()
  const [theme, setTheme] = useState('dark')
  const [accentColor, setAccentColor] = useState('cyan')

  const accentColors = [
    { name: 'Cyan', value: 'cyan', color: '#00FFFF' },
    { name: 'Magenta', value: 'magenta', color: '#FF00FF' },
    { name: 'Neon Blue', value: 'blue', color: '#0099FF' },
  ]

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-8">
          <SettingsIcon className="w-8 h-8 text-cyan-400" />
          <h1 className="text-4xl font-bold font-['Orbitron'] bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Settings
          </h1>
        </div>

        <div className="space-y-6">
          {/* Profile */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Profile</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Username</label>
                <input
                  type="text"
                  defaultValue="neurax_user"
                  className="w-full px-4 py-2 bg-black/50 border border-gray-700 rounded-lg text-gray-200 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Node ID</label>
                <input
                  type="text"
                  defaultValue="auto-generated"
                  disabled
                  className="w-full px-4 py-2 bg-black/30 border border-gray-700 rounded-lg text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Tailnet Connection */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Network className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-gray-200">Tailnet Connection</h3>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-200">Status</div>
                <div className={`text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
                  {connected ? 'Connected' : 'Disconnected'}
                </div>
              </div>
              <button className="px-4 py-2 glass rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all text-cyan-400 text-sm">
                Join Tailnet
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-gray-200">Theme</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Color Mode</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme('dark')}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      theme === 'dark'
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setTheme('light')}
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      theme === 'light'
                        ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                        : 'border-gray-700 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Accent Color</label>
                <div className="flex gap-2">
                  {accentColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setAccentColor(color.value)}
                      className={`w-12 h-12 rounded-lg border-2 transition-all ${
                        accentColor === color.value
                          ? 'border-white scale-110'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                      style={{ backgroundColor: color.color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-200">Actions</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between px-4 py-3 glass rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-all text-left">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-200">Regenerate SSH Key</span>
                </div>
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-3 glass rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-all text-left">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-200">Join Tailnet</span>
                </div>
              </button>
              
              <button className="w-full flex items-center justify-between px-4 py-3 glass rounded-lg border border-gray-700 hover:border-cyan-500/50 transition-all text-left">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-cyan-400" />
                  <span className="text-gray-200">Reset Sandbox Containers</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}







