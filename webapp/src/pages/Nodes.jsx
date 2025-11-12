import { motion } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import NodeCard from '../components/NodeCard'
import { Plus, Activity, Server } from 'lucide-react'

export default function Nodes() {
  const { computeNodes, connected } = useSocket()

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 font-['Orbitron'] bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Compute Network Overview
            </h1>
            <p className="text-gray-400">
              {computeNodes.length} active node{computeNodes.length !== 1 ? 's' : ''} connected
            </p>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-3 glass rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all glow-cyan"
          >
            <Plus className="w-5 h-5 text-cyan-400" />
            <span className="text-cyan-400 font-medium">Add Node</span>
          </motion.button>
        </div>

        {/* Connection Status */}
        {!connected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-lg p-4 mb-6 border border-yellow-500/30"
          >
            <div className="flex items-center gap-2 text-yellow-400">
              <Activity className="w-5 h-5" />
              <span>Connecting to server...</span>
            </div>
          </motion.div>
        )}

        {/* Nodes Grid */}
        {computeNodes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl p-12 text-center"
          >
            <div className="text-gray-400 mb-4">
              <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No compute nodes connected</p>
              <p className="text-sm mt-2">Start a compute node to see it here</p>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {computeNodes.map((node, index) => (
              <motion.div
                key={node.node_id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <NodeCard node={node} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}

