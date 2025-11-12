import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import SimpleCodeEditor from '../components/SimpleCodeEditor'
import TaskConsole from '../components/TaskConsole'
import { Play, Upload, AlertCircle, Sparkles, Box } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

export default function Tasks() {
  const { socket, connected } = useSocket()
  const [mode, setMode] = useState('ai') // 'ai', 'blender', 'autocad'
  const [code, setCode] = useState(`# Welcome to NeuraX Cloud Compute
# Enter your Python code here

import math

# Example: Calculate factorial
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

result = factorial(10)
print(f"Factorial of 10 = {result}")
`)
  const [currentJob, setCurrentJob] = useState(null)
  const [logs, setLogs] = useState([])
  const [error, setError] = useState(null)

  // Restore last job from localStorage on mount
  useEffect(() => {
    try {
      const savedJob = localStorage.getItem('neurax_current_job')
      const savedLogs = localStorage.getItem('neurax_current_logs')
      if (savedJob) {
        const job = JSON.parse(savedJob)
        setCurrentJob(job)
        if (savedLogs) setLogs(JSON.parse(savedLogs))
        // Try to refresh job status
        const serverURL = getServerURL()
        fetch(`${serverURL}/status/${job.job_id}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setCurrentJob(prev => ({ ...prev, ...data, output_files: data.output_files || prev?.output_files || [] }))
            }
          })
          .catch(() => {})
      }
    } catch (e) {
      // ignore
    }
  }, [])

  // Persist current job and logs
  useEffect(() => {
    try {
      if (currentJob) localStorage.setItem('neurax_current_job', JSON.stringify(currentJob))
      localStorage.setItem('neurax_current_logs', JSON.stringify(logs))
    } catch (e) {
      // ignore
    }
  }, [currentJob, logs])

  // Listen for job logs
  useEffect(() => {
    if (!socket) return

    const handleJobLog = (data) => {
      if (data.job_id && (!currentJob || data.job_id === currentJob?.job_id)) {
        setLogs(prev => [...prev, data.message || data.log])
      }
    }

    const handleJobStatus = (data) => {
      if (data.job_id && (!currentJob || data.job_id === currentJob?.job_id)) {
        setCurrentJob(prev => ({ 
          ...(prev || {}), 
          ...data,
          job_id: data.job_id || prev?.job_id,
          output_files: data.output_files || prev?.output_files || []
        }))
        if (data.status === 'completed' || data.status === 'failed') {
          setLogs(prev => [...prev, `\n[${data.status.toUpperCase()}] Job finished with exit code: ${data.exit_code || 0}`])
        }
      }
    }

    socket.on('job_log', handleJobLog)
    socket.on('job_status', handleJobStatus)

    return () => {
      socket.off('job_log', handleJobLog)
      socket.off('job_status', handleJobStatus)
    }
  }, [socket, currentJob])

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setCode(e.target.result)
      }
      reader.readAsText(file)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/x-python': ['.py'],
      'application/x-blender': ['.blend'],
      'application/acad': ['.dwg'],
    },
  })

  const handleSubmit = async () => {
    if (!socket || !connected) {
      setError('Not connected to server. Please check your connection.')
      return
    }

    // Validation based on mode
    if (mode === 'ai' && !code.trim()) {
      setError('Please enter some code to execute.')
      return
    }

    setError(null)
    setLogs([])
    try {
      const serverURL = getServerURL()
      let payload = { mode }
      if (mode === 'ai') {
        payload.code = code
      } else if (mode === 'blender') {
        payload.file_path = 'test_cube.blend'
        payload.args = '--render-test'
      } else if (mode === 'autocad') {
        payload.file_path = 'test_drawing.dwg'
        payload.args = '--export-test'
      }
      const response = await fetch(`${serverURL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }
      const result = await response.json()
      if (result.job_id) {
        const newJob = { job_id: result.job_id, status: 'queued', mode }
        setCurrentJob(newJob)
        localStorage.setItem('neurax_current_job', JSON.stringify(newJob))
        setLogs([`[INFO] Job ${result.job_id.slice(0, 8)}... submitted successfully`])
        localStorage.setItem('neurax_current_logs', JSON.stringify([`[INFO] Job ${result.job_id.slice(0, 8)}... submitted successfully`]))
        socket.emit('subscribe_job_logs', { job_id: result.job_id })
      } else {
        setError(result.error || 'Failed to submit job')
      }
    } catch (error) {
      console.error('Job submission error:', error)
      setError(`Connection failed: ${error.message}. Please check your internet connection or VPN.`)
    }
  }

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

  return (
    <div className="min-h-screen p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <h1 className="text-4xl font-bold mb-8 font-['Orbitron'] bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Run Compute Job
        </h1>

        {/* Mode Selector */}
        <div className="mb-6">
          <label className="text-sm text-gray-400 mb-2 block">Select Task Mode</label>
          <div className="flex gap-2">
            <button
              onClick={() => setMode('ai')}
              className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                mode === 'ai'
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>AI/Python</span>
            </button>
            <button
              onClick={() => setMode('blender')}
              className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                mode === 'blender'
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>Blender</span>
            </button>
            <button
              onClick={() => setMode('autocad')}
              className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                mode === 'autocad'
                  ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600'
              }`}
            >
              <Box className="w-4 h-4" />
              <span>AutoCAD</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 mb-6 border border-red-500/30 bg-red-500/10"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        {/* Connection Status */}
        {!connected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 mb-6 border border-yellow-500/30 bg-yellow-500/10"
          >
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-5 h-5" />
              <span>Connecting to server... Please wait.</span>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Upload Zone */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div
              {...getRootProps()}
              className={`glass rounded-xl p-8 border-2 border-dashed cursor-pointer transition-all ${
                isDragActive
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-600 hover:border-cyan-500/50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-300 mb-2">
                  {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-gray-500">
                  .py, .blend, .dwg
                </p>
              </div>
            </div>
          </motion.div>

          {/* Center: Code Editor or Mode Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-1"
          >
            <div className="glass rounded-xl p-4 h-full">
              {mode === 'ai' ? (
                <>
                  <SimpleCodeEditor value={code} onChange={setCode} />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={!connected || !code.trim()}
                    className="w-full mt-4 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Execute Python Code</span>
                  </motion.button>
                </>
              ) : mode === 'blender' ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <Box className="w-16 h-16 text-cyan-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-200 mb-2">Blender Render Task</h3>
                  <p className="text-gray-400 text-center mb-6">
                    This will create a simple cube scene and render it.
                    <br />
                    <span className="text-sm">Resolution: 200x200 pixels</span>
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={!connected}
                    className="px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Start Blender Render</span>
                  </motion.button>
                  <p className="text-xs text-gray-500 mt-4">Expected time: 30-90 seconds</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <Box className="w-16 h-16 text-cyan-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-200 mb-2">AutoCAD Task</h3>
                  <p className="text-gray-400 text-center mb-6">
                    AutoCAD automation task
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSubmit}
                    disabled={!connected}
                    className="px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-lg shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.8)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    <span>Start AutoCAD Task</span>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Right: Live Console */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <TaskConsole job={currentJob} logs={logs} jobId={currentJob?.job_id} />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

