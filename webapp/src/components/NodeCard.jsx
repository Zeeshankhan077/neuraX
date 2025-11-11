import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Cpu, HardDrive, Wifi } from 'lucide-react'

export default function NodeCard({ node }) {
  const isReady = node.status === 'ready'
  
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className="glass rounded-xl p-6 border border-cyan-500/20 hover:border-cyan-500/50 transition-all relative overflow-hidden"
    >
      {/* Animated Radar Pulse for Active Nodes */}
      {isReady && (
        <motion.div
          className="absolute inset-0 rounded-xl border-2 border-cyan-500/30"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Status Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {isReady ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="font-semibold text-gray-200">{node.device || 'Unknown Device'}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${
          isReady ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isReady ? 'Ready' : 'Offline'}
        </span>
      </div>

      {/* Tailscale IP */}
      {node.tailscale_ip && (
        <div className="flex items-center gap-2 mb-3 text-sm text-cyan-400">
          <Wifi className="w-4 h-4" />
          <span>{node.tailscale_ip}</span>
        </div>
      )}

      {/* GPU Info */}
      {node.gpu && node.gpu !== 'N/A' && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">GPU</div>
          <div className="text-sm font-medium text-gray-200">{node.gpu}</div>
          {node.vram_gb && (
            <div className="text-xs text-gray-400 mt-1">{node.vram_gb} GB VRAM</div>
          )}
        </div>
      )}

      {/* Installed Tools */}
      {node.installed_tools && node.installed_tools.length > 0 && (
        <div className="mb-4">
          <div className="text-xs text-gray-400 mb-2">Installed Tools</div>
          <div className="flex flex-wrap gap-2">
            {node.installed_tools.slice(0, 4).map((tool, i) => (
              <span
                key={i}
                className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30"
              >
                {tool}
              </span>
            ))}
            {node.installed_tools.length > 4 && (
              <span className="text-xs px-2 py-1 text-gray-400">
                +{node.installed_tools.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Hover Specs */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        whileHover={{ opacity: 1, height: 'auto' }}
        className="overflow-hidden"
      >
        <div className="pt-4 border-t border-gray-700/50 mt-4">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-gray-400">
              <Cpu className="w-3 h-3" />
              <span>CPU: N/A</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <HardDrive className="w-3 h-3" />
              <span>RAM: N/A</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}





