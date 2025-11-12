import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Terminal, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import RenderPreview from './RenderPreview'

export default function TaskConsole({ job, logs, jobId }) {
  const consoleRef = useRef(null)

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight
    }
  }, [logs])

  const getStatusIcon = () => {
    if (!job) return null
    switch (job.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
      default:
        return <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />
    }
  }

  return (
    <div className="glass rounded-xl p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold text-gray-200">Live Console</h3>
        {job && (
          <div className="ml-auto flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-xs text-gray-400 capitalize">{job.status}</span>
          </div>
        )}
      </div>

      <div
        ref={consoleRef}
        className="flex-1 bg-black/50 rounded-lg p-4 font-mono text-sm overflow-y-auto max-h-[600px]"
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            <p>No logs yet...</p>
            <p className="text-xs mt-2">Submit a job to see output here</p>
          </div>
        ) : (
          <AnimatePresence>
            {logs.map((log, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-1"
              >
                <span className="text-cyan-400">[{new Date().toLocaleTimeString()}]</span>
                <span className="text-gray-300 ml-2">{log}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Render Preview for Blender tasks */}
      {job && job.mode === 'blender' && (
        <RenderPreview job={job} jobId={jobId} />
      )}
    </div>
  )
}


