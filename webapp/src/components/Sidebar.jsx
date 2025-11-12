import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Home,
  History,
  Settings,
  Server,
  CheckCircle2,
  XCircle,
  Activity
} from 'lucide-react'

// Auto-detect server URL (same logic as App.jsx)
const getServerURL = () => {
  if (import.meta.env.VITE_SIGNALING_SERVER_URL) {
    return import.meta.env.VITE_SIGNALING_SERVER_URL
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:10000'
  }
  // Default to neurax-280 server if deployed on Render
  if (window.location.hostname.includes('render.com')) {
    return 'https://neurax-280.onrender.com'
  }
  return 'https://neurax-280.onrender.com'
}

const SERVER_URL = getServerURL()

export default function Sidebar({ connected, computeNodes, jobHistory }) {
  const [activeTab, setActiveTab] = useState('home')
  const [tailnetHealth, setTailnetHealth] = useState(null)

  // Fetch tailnet health
  useEffect(() => {
    const fetchTailnetHealth = async () => {
      try {
        const response = await fetch(`${SERVER_URL}/api/v1/tailnet/health`)
        const data = await response.json()
        if (data.status === 'success') {
          setTailnetHealth(data)
        }
      } catch (error) {
        console.error('Failed to fetch tailnet health:', error)
      }
    }

    if (connected) {
      fetchTailnetHealth()
      const interval = setInterval(fetchTailnetHealth, 30000) // Refresh every 30s
      return () => clearInterval(interval)
    }
  }, [connected])

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'critical': return 'text-orange-500'
      case 'limit_reached': return 'text-red-500'
      default: return 'text-gray-400'
    }
  }

  const getHealthBgColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/20 border-green-500/50'
      case 'warning': return 'bg-yellow-500/20 border-yellow-500/50'
      case 'critical': return 'bg-orange-500/20 border-orange-500/50'
      case 'limit_reached': return 'bg-red-500/20 border-red-500/50'
      default: return 'bg-gray-500/20 border-gray-500/50'
    }
  }

  return (
    <div className="glass rounded-lg p-4 h-full flex flex-col">
      {/* Navigation */}
      <nav className="space-y-2 mb-4">
        <button
          onClick={() => setActiveTab('home')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            activeTab === 'home'
              ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Home</span>
        </button>
        
        <button
          onClick={() => setActiveTab('history')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            activeTab === 'history'
              ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>History</span>
          {jobHistory.length > 0 && (
            <span className="ml-auto text-xs bg-neon-purple/30 px-2 py-0.5 rounded">
              {jobHistory.length}
            </span>
          )}
        </button>
        
        <button
          onClick={() => setActiveTab('settings')}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            activeTab === 'settings'
              ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/50'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </nav>

      {/* Connection Status */}
      <div className="mb-4 p-3 glass-strong rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Tailnet Health */}
      {tailnetHealth && (
        <div className={`mb-4 p-3 glass-strong rounded-lg border ${getHealthBgColor(tailnetHealth.health_status)}`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className={`w-4 h-4 ${getHealthColor(tailnetHealth.health_status)}`} />
            <span className="text-sm font-medium">Tailnet Health</span>
          </div>
          <div className="text-xs text-gray-400 mb-2">
            {tailnetHealth.message}
          </div>
          <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${getHealthColor(tailnetHealth.health_status).replace('text-', 'bg-')}`}
              style={{
                width: `${(tailnetHealth.device_count / tailnetHealth.max_devices) * 100}%`
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {tailnetHealth.device_count} / {tailnetHealth.max_devices} devices
            {tailnetHealth.device_count >= tailnetHealth.warning_threshold && (
              <span className="block text-yellow-400 mt-1">
                ⚠️ Approaching free plan limit
              </span>
            )}
          </div>
        </div>
      )}

      {/* Compute Nodes */}
      {activeTab === 'home' && (
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-neon-blue" />
            <h3 className="text-sm font-semibold">Compute Nodes</h3>
            <span className="ml-auto text-xs text-gray-400">
              {computeNodes.length}
            </span>
          </div>
          
          <div className="space-y-2">
            {computeNodes.length === 0 ? (
              <div className="text-sm text-gray-500 p-3 text-center">
                No compute nodes connected
              </div>
            ) : (
              computeNodes.map((node, idx) => (
                <motion.div
                  key={node.node_id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-strong p-3 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {node.status === 'ready' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">{node.device}</span>
                    </div>
                  </div>
                  
                  {node.tailscale_ip && (
                    <div className="text-xs text-neon-blue mb-1">
                      Tailscale: {node.tailscale_ip}
                    </div>
                  )}
                  
                  {node.gpu && (
                    <div className="text-xs text-gray-400 mb-1">
                      GPU: {node.gpu}
                    </div>
                  )}
                  
                  {node.installed_tools && node.installed_tools.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {node.installed_tools.slice(0, 3).map((tool, i) => (
                        <span
                          key={i}
                          className="text-xs bg-neon-blue/20 text-neon-blue px-2 py-0.5 rounded"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Job History */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto">
          {jobHistory.length === 0 ? (
            <div className="text-sm text-gray-500 p-3 text-center">
              No job history
            </div>
          ) : (
            <div className="space-y-2">
              {jobHistory.map((job) => (
                <div
                  key={job.job_id}
                  className="glass-strong p-3 rounded-lg text-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{job.mode}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        job.status === 'completed'
                          ? 'bg-green-500/20 text-green-400'
                          : job.status === 'running'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  {job.runtime && (
                    <div className="text-xs text-gray-400">
                      {job.runtime.toFixed(2)}s
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings */}
      {activeTab === 'settings' && (
        <div className="flex-1 text-sm text-gray-400 p-3">
          Settings panel coming soon
        </div>
      )}
    </div>
  )
}




