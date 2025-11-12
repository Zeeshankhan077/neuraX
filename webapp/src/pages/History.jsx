import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import { History as HistoryIcon, Download, Filter, ChevronDown, ChevronUp } from 'lucide-react'

export default function History() {
  const { jobHistory } = useSocket()
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState({})

  const filters = ['all', 'ai', 'blender', 'autocad', 'custom']
  const filteredJobs = filter === 'all' 
    ? jobHistory 
    : jobHistory.filter(job => job.mode === filter)

  const toggleExpand = (jobId) => {
    setExpanded(prev => ({ ...prev, [jobId]: !prev[jobId] }))
  }

  const exportToCSV = () => {
    const csv = [
      ['Job ID', 'Mode', 'Status', 'Runtime', 'Exit Code'],
      ...jobHistory.map(job => [
        job.job_id,
        job.mode || 'unknown',
        job.status || 'unknown',
        job.runtime || 'N/A',
        job.exit_code || 'N/A'
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `neurax-jobs-${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl font-bold font-['Orbitron'] bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Job History
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 glass rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-sm">Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-gray-400" />
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'glass text-gray-400 hover:text-gray-200 border border-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredJobs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass rounded-xl p-12 text-center"
              >
                <HistoryIcon className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
                <p className="text-gray-400">No job history yet</p>
              </motion.div>
            ) : (
              filteredJobs.map((job, index) => (
                <motion.div
                  key={job.job_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="glass rounded-xl p-6 border border-gray-700 hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        job.status === 'completed' ? 'bg-green-500' :
                        job.status === 'failed' ? 'bg-red-500' :
                        job.status === 'running' ? 'bg-cyan-500 animate-pulse' :
                        'bg-yellow-500'
                      }`} />
                      <div>
                        <div className="font-semibold text-gray-200 capitalize">{job.mode || 'unknown'}</div>
                        <div className="text-xs text-gray-400 font-mono">{job.job_id?.slice(0, 8)}...</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${
                          job.status === 'completed' ? 'text-green-400' :
                          job.status === 'failed' ? 'text-red-400' :
                          'text-yellow-400'
                        }`}>
                          {job.status || 'unknown'}
                        </div>
                        {job.runtime && (
                          <div className="text-xs text-gray-400">{job.runtime.toFixed(2)}s</div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => toggleExpand(job.job_id)}
                        className="p-2 glass rounded-lg hover:bg-cyan-500/10 transition-colors"
                      >
                        {expanded[job.job_id] ? (
                          <ChevronUp className="w-4 h-4 text-cyan-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-cyan-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {expanded[job.job_id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-gray-700"
                    >
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Exit Code:</span>
                          <span className="text-gray-200">{job.exit_code ?? 'N/A'}</span>
                        </div>
                        {job.logs && job.logs.length > 0 && (
                          <div>
                            <div className="text-gray-400 mb-2">Logs:</div>
                            <div className="bg-black/50 rounded p-3 font-mono text-xs max-h-40 overflow-y-auto">
                              {job.logs.slice(-10).map((log, i) => (
                                <div key={i} className="text-gray-300">{log}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}







