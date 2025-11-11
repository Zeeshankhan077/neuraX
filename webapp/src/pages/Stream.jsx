import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import { Radio, Monitor, Wifi, Zap } from 'lucide-react'

export default function Stream() {
  const { computeNodes } = useSocket()
  const [selectedNode, setSelectedNode] = useState(null)
  const [fps, setFps] = useState(60)
  const [bitrate, setBitrate] = useState('10 Mbps')
  const [latency, setLatency] = useState(15)

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-8">
          <Radio className="w-8 h-8 text-cyan-400" />
          <h1 className="text-4xl font-bold font-['Orbitron'] bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Stream Mode 🎮
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Node Selection */}
          <div className="lg:col-span-1">
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-200">Select Node</h3>
              <div className="space-y-2">
                {computeNodes.filter(n => n.status === 'ready').map((node) => (
                  <motion.button
                    key={node.node_id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedNode(node)}
                    className={`w-full p-4 rounded-lg border transition-all ${
                      selectedNode?.node_id === node.node_id
                        ? 'border-cyan-500 bg-cyan-500/10 glow-cyan'
                        : 'border-gray-700 hover:border-cyan-500/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Monitor className="w-5 h-5 text-cyan-400" />
                      <div className="text-left">
                        <div className="font-medium text-gray-200">{node.device}</div>
                        {node.tailscale_ip && (
                          <div className="text-xs text-gray-400">{node.tailscale_ip}</div>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Stats */}
            {selectedNode && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-6 mt-6"
              >
                <h3 className="text-lg font-semibold mb-4 text-gray-200">Stream Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">FPS</span>
                    <span className="text-cyan-400 font-semibold">{fps}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Bitrate</span>
                    <span className="text-cyan-400 font-semibold">{bitrate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Latency</span>
                    <span className="text-cyan-400 font-semibold">{latency}ms</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Video Stream */}
          <div className="lg:col-span-2">
            <div className="glass rounded-xl p-6">
              {selectedNode ? (
                <div>
                  <div className="aspect-video bg-black/50 rounded-lg mb-4 flex items-center justify-center border border-cyan-500/20">
                    <div className="text-center">
                      <Radio className="w-16 h-16 mx-auto mb-4 text-cyan-400/50" />
                      <p className="text-gray-400 mb-2">Stream from {selectedNode.device}</p>
                      <p className="text-sm text-gray-500">Sunshine stream will appear here</p>
                    </div>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)] transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    <span>Launch Moonlight Client</span>
                  </motion.button>
                </div>
              ) : (
                <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center border border-gray-700">
                  <div className="text-center text-gray-400">
                    <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Select a node to start streaming</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}





