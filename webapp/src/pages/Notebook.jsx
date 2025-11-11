import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket'
import { Play, RotateCcw, Trash2, Plus, Code, FileText } from 'lucide-react'
import Editor from '@monaco-editor/react'

export default function Notebook() {
  const { socket, connected } = useSocket()
  const [cells, setCells] = useState([
    { 
      id: 1, 
      type: 'code', 
      content: `# Welcome to NeuraX Notebook
# Try running this GPU task to use full GPU power!

import sys
import time

def test_gpu_power():
    """Test GPU with matrix multiplication using full GPU power."""
    print("=" * 60)
    print("GPU POWER TEST - Small Task")
    print("=" * 60)
    
    # Try PyTorch first
    try:
        import torch
        print(f"\\nPyTorch version: {torch.__version__}")
        
        if torch.cuda.is_available():
            device = torch.device('cuda')
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            
            print(f"GPU Detected: {gpu_name}")
            print(f"GPU Memory: {gpu_memory:.2f} GB")
            
            print("\\nRunning GPU Task (Full Power)...")
            
            # Small but intensive task
            size = 2048
            print(f"Matrix Size: {size}x{size}")
            
            start_time = time.time()
            a = torch.randn(size, size, device=device)
            b = torch.randn(size, size, device=device)
            
            compute_start = time.time()
            result = torch.matmul(a, b)
            torch.cuda.synchronize()
            compute_time = time.time() - compute_start
            
            # Additional operations to stress GPU
            result = torch.matmul(result, a)
            torch.cuda.synchronize()
            
            total_time = time.time() - start_time
            
            print(f"Computation time: {compute_time:.3f}s")
            print(f"Total time: {total_time:.3f}s")
            
            memory_allocated = torch.cuda.memory_allocated(0) / 1024**3
            print(f"\\nGPU Memory Used: {memory_allocated:.2f} GB")
            
            # Calculate GFLOPS
            flops = 2 * size ** 3
            gflops = (flops / compute_time) / 1e9
            print(f"\\nPerformance: {gflops:.2f} GFLOPS")
            
            print("\\nGPU Task Completed Successfully!")
            return {'gpu_name': gpu_name, 'gflops': gflops, 'time': compute_time}
        else:
            print("\\nCUDA not available - using CPU fallback")
            import numpy as np
            size = 512
            a = np.random.randn(size, size)
            b = np.random.randn(size, size)
            start = time.time()
            result = np.matmul(a, b)
            print(f"CPU computation: {time.time() - start:.3f}s")
            return {'device': 'CPU'}
    except ImportError:
        print("\\nPyTorch not available - using NumPy CPU")
        import numpy as np
        size = 512
        a = np.random.randn(size, size)
        b = np.random.randn(size, size)
        start = time.time()
        result = np.matmul(a, b)
        print(f"CPU computation: {time.time() - start:.3f}s")
        return {'device': 'CPU'}

test_gpu_power()`, 
      output: '', 
      status: 'idle' 
    },
  ])
  const [sessionId, setSessionId] = useState(null)
  const [sandboxStatus, setSandboxStatus] = useState('ready')

  // Create notebook session on mount with retry logic
  useEffect(() => {
    const createSession = async (retries = 3) => {
      if (!sessionId) {
        for (let i = 0; i < retries; i++) {
          try {
            const serverURL = getServerURL()
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout
            
            const response = await fetch(`${serverURL}/notebook/create_session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal
            })
            
            clearTimeout(timeoutId)
            
            if (response.ok) {
              const data = await response.json()
              if (data.session_id) {
                setSessionId(data.session_id)
                return // Success, exit retry loop
              }
            } else {
              throw new Error(`Server returned ${response.status}`)
            }
          } catch (error) {
            if (error.name === 'AbortError') {
              console.error(`Session creation timeout (attempt ${i + 1}/${retries})`)
            } else {
              console.error(`Failed to create session (attempt ${i + 1}/${retries}):`, error)
            }
            
            if (i < retries - 1) {
              // Wait before retry (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
            } else {
              // Last attempt failed - use Socket.IO as fallback
              if (socket && connected) {
                socket.emit('create_notebook_session', {}, (response) => {
                  if (response?.session_id) {
                    setSessionId(response.session_id)
                  }
                })
              }
            }
          }
        }
      }
    }
    
    // Wait a bit for server to be ready
    const timer = setTimeout(() => {
      createSession()
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [sessionId, socket, connected])

  const addCell = (type = 'code') => {
    const newCell = {
      id: Date.now(),
      type,
      content: type === 'code' ? '' : type === 'markdown' ? '# Markdown Cell' : '',
      output: '',
      status: 'idle'
    }
    setCells([...cells, newCell])
  }

  const updateCell = (id, content) => {
    setCells(cells.map(cell => 
      cell.id === id ? { ...cell, content } : cell
    ))
  }

  const executeCell = async (cellId) => {
    const cell = cells.find(c => c.id === cellId)
    if (!cell || cell.type !== 'code') return

    // Update cell status
    setCells(prevCells => prevCells.map(c => 
      c.id === cellId ? { ...c, status: 'running', output: '' } : c
    ))

    if (!socket || !connected) {
      setCells(prevCells => prevCells.map(c => 
        c.id === cellId ? { ...c, status: 'error', output: 'ERROR: Not connected to server. Please check your connection.' } : c
      ))
      return
    }

    // Ensure we have a session ID
    let currentSessionId = sessionId
    if (!currentSessionId) {
      // Try Socket.IO first (more reliable)
      if (socket && connected) {
        return new Promise((resolve) => {
          socket.emit('create_notebook_session', {}, (response) => {
            if (response?.session_id) {
              currentSessionId = response.session_id
              setSessionId(currentSessionId)
              // Retry execution with new session
              setTimeout(() => executeCell(cellId), 100)
            } else {
              setCells(prevCells => prevCells.map(c => 
                c.id === cellId ? { ...c, status: 'error', output: 'ERROR: Failed to create session via Socket.IO. Please check server connection.' } : c
              ))
            }
            resolve()
          })
        })
      }
      
      // Fallback to HTTP
      try {
        const serverURL = getServerURL()
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        const sessionResponse = await fetch(`${serverURL}/notebook/create_session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        if (!sessionResponse.ok) {
          throw new Error(`Server error: ${sessionResponse.status}`)
        }
        
        const sessionData = await sessionResponse.json()
        if (sessionData.session_id) {
          currentSessionId = sessionData.session_id
          setSessionId(currentSessionId)
        } else {
          throw new Error('No session_id in response')
        }
      } catch (error) {
        const errorMsg = error.name === 'AbortError' 
          ? 'Connection timeout. Is the server running on ' + getServerURL() + '?'
          : `Failed to create session: ${error.message}`
        
        setCells(prevCells => prevCells.map(c => 
          c.id === cellId ? { ...c, status: 'error', output: `ERROR: ${errorMsg}\n\nMake sure:\n1. Server is running: ${getServerURL()}\n2. No firewall blocking the connection` } : c
        ))
        return
      }
    }

    try {
      const serverURL = getServerURL()
      const response = await fetch(`${serverURL}/notebook/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: currentSessionId,
          cell_id: cellId,
          code: cell.content,
          mode: 'notebook'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Server error: ${response.status}`)
      }

      const result = await response.json()
      if (result.job_id) {
        // Subscribe to logs
        socket.emit('subscribe_job_logs', { job_id: result.job_id })
        
        // Set multiple timeouts for better feedback
        const timeouts = []
        
        // 10s warning
        timeouts.push(setTimeout(() => {
          setCells(prevCells => prevCells.map(c => {
            if (c.id === cellId && c.status === 'running' && !c.output.trim()) {
              return {
                ...c,
                output: c.output + '\n⏳ Still executing... (10s elapsed)\n'
              }
            }
            return c
          }))
        }, 10000))
        
        // 30s warning
        timeouts.push(setTimeout(() => {
          setCells(prevCells => prevCells.map(c => {
            if (c.id === cellId && c.status === 'running') {
              return {
                ...c,
                output: c.output + '\n⏳ Still executing... (30s elapsed)\n'
              }
            }
            return c
          }))
        }, 30000))
        
        // 60s timeout
        timeouts.push(setTimeout(() => {
          setCells(prevCells => prevCells.map(c => {
            if (c.id === cellId && c.status === 'running') {
              return {
                ...c,
                status: 'error',
                output: c.output + '\n\nExecution timeout (60s). The job may still be running on the server.\nCheck server logs or try a simpler task.'
              }
            }
            return c
          }))
        }, 60000))
        
        // Store timeouts to clear if cell completes
        setCells(prevCells => prevCells.map(c => {
          if (c.id === cellId) {
            return { ...c, _timeouts: timeouts }
          }
          return c
        }))
      } else {
        throw new Error('No job_id returned from server')
      }
    } catch (error) {
      setCells(prevCells => prevCells.map(c => 
        c.id === cellId ? { ...c, status: 'error', output: `ERROR: ${error.message}\n\nMake sure the server is running on ${getServerURL()}` } : c
      ))
    }
  }

  const restartSandbox = async () => {
    if (!socket || !sessionId) return
    
    setSandboxStatus('restarting')
    socket.emit('restart_notebook_sandbox', { session_id: sessionId }, (response) => {
      if (response?.success) {
        setSandboxStatus('ready')
        setCells(cells.map(c => ({ ...c, output: '', status: 'idle' })))
      }
    })
  }

  const clearOutput = (cellId) => {
    setCells(cells.map(c => 
      c.id === cellId ? { ...c, output: '' } : c
    ))
  }

  const deleteCell = (cellId) => {
    setCells(cells.filter(c => c.id !== cellId))
  }

  const getServerURL = () => {
    if (import.meta.env.VITE_SIGNALING_SERVER_URL) {
      return import.meta.env.VITE_SIGNALING_SERVER_URL
    }
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:10000'
    }
    return 'https://neurax-server.onrender.com'
  }

  // Listen for cell output events
  useEffect(() => {
    if (!socket) return

    const handleCellOutput = (data) => {
      console.log('Received cell_output:', data) // Debug log
      setCells(prevCells => 
        prevCells.map(cell => {
          if (data.cell_id === cell.id) {
            const newOutput = data.output || ''
            const newStatus = data.status || (newOutput ? 'running' : cell.status)
            
            // Clear timeouts if completing
            if (newStatus === 'completed' || newStatus === 'failed') {
              if (cell._timeouts) {
                cell._timeouts.forEach(clearTimeout)
              }
            }
            
            return {
              ...cell,
              // Replace output on completion/failure, append during execution
              output: (newStatus === 'completed' || newStatus === 'failed') 
                ? newOutput  
                : cell.output + newOutput,
              status: newStatus,
              _timeouts: undefined // Clear timeouts reference
            }
          }
          return cell
        })
      )
    }

    const handleJobLog = (data) => {
      // Listen to job logs for real-time output
      if (data.job_id && data.log) {
        // Extract cell_id from job_id pattern: session_id_cell_id_timestamp
        const jobParts = data.job_id.split('_')
        if (jobParts.length >= 2) {
          const cellIdStr = jobParts[1]
          const cellId = parseInt(cellIdStr)
          
          setCells(prevCells => 
            prevCells.map(cell => {
              if (cell.id === cellId && cell.status === 'running') {
                return {
                  ...cell,
                  output: cell.output + (data.log || '') + '\n'
                }
              }
              return cell
            })
          )
        } else {
          // Fallback: update any running cell
          setCells(prevCells => 
            prevCells.map(cell => {
              if (cell.status === 'running') {
                return {
                  ...cell,
                  output: cell.output + (data.log || '') + '\n'
                }
              }
              return cell
            })
          )
        }
      }
    }

    socket.on('cell_output', handleCellOutput)
    socket.on('job_log', handleJobLog)

    return () => {
      socket.off('cell_output', handleCellOutput)
      socket.off('job_log', handleJobLog)
    }
  }, [socket])

  // Show connection warning if not connected and no session
  if (!connected && !sessionId) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-xl p-8 border border-red-500/30 max-w-md text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-red-400">Not Connected</h2>
          <p className="text-gray-400 mb-4">
            Unable to connect to the server at <code className="text-cyan-400">{getServerURL()}</code>
          </p>
          <div className="text-left bg-black/50 p-4 rounded-lg mb-4">
            <p className="text-sm text-gray-300 mb-2">Please ensure:</p>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>Server is running on port 10000</li>
              <li>No firewall is blocking the connection</li>
              <li>Server URL is correct: {getServerURL()}</li>
            </ul>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
          >
            Retry Connection
          </button>
        </motion.div>
      </div>
    )
  }

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
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl font-bold mb-2 font-['Orbitron'] bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent"
            >
              NeuraX Notebook
            </motion.h1>
            <p className="text-gray-400 flex items-center gap-2">
              <span>Interactive compute notebook</span>
              <span className="text-gray-600">•</span>
              <span className="text-cyan-400">Colab/Kaggle style</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-2 glass rounded-lg border border-gray-700">
              <div className={`w-2 h-2 rounded-full ${
                sandboxStatus === 'ready' ? 'bg-green-500 animate-pulse' : 
                sandboxStatus === 'restarting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-red-500'
              }`} />
              <span className="text-sm text-gray-300">
                Sandbox: <span className="text-cyan-400 capitalize">{sandboxStatus}</span>
              </span>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={restartSandbox}
              disabled={sandboxStatus === 'restarting'}
              className="px-4 py-2 glass rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-400 text-sm">Restart Sandbox</span>
            </motion.button>
          </div>
        </div>

        {/* Add Cell Buttons */}
        <div className="flex gap-2 mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => addCell('code')}
            className="px-4 py-2 glass rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <Code className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm">Code Cell</span>
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => addCell('markdown')}
            className="px-4 py-2 glass rounded-lg border border-gray-700 hover:border-gray-600 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-gray-400" />
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Markdown</span>
          </motion.button>
        </div>

        {/* Notebook Cells */}
        <div className="space-y-4">
          <AnimatePresence>
            {cells.map((cell, index) => (
              <motion.div
                key={cell.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass rounded-xl p-5 border border-gray-700 hover:border-cyan-500/30 transition-all shadow-lg hover:shadow-cyan-500/10"
              >
                {/* Cell Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {cell.type === 'code' && <Code className="w-4 h-4 text-cyan-400" />}
                    {cell.type === 'markdown' && <FileText className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm text-gray-400">Cell {index + 1}</span>
                    {cell.status === 'running' && (
                      <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                        Running...
                      </span>
                    )}
                    {cell.status === 'error' && (
                      <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded">
                        Error
                      </span>
                    )}
                    {cell.status === 'completed' && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                        ✓ Completed
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {cell.type === 'code' && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => executeCell(cell.id)}
                          disabled={cell.status === 'running' || !connected}
                          className="p-2 glass rounded-lg hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                          title="Run Cell"
                        >
                          <Play className="w-4 h-4 text-cyan-400" />
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => clearOutput(cell.id)}
                          className="p-2 glass rounded-lg hover:bg-gray-700 transition-colors"
                          title="Clear Output"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
                        </motion.button>
                      </>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteCell(cell.id)}
                      className="p-2 glass rounded-lg hover:bg-red-500/20 transition-colors"
                      title="Delete Cell"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </motion.button>
                  </div>
                </div>

                {/* Cell Editor */}
                {cell.type === 'code' ? (
                  <div className="mb-3 rounded-lg overflow-hidden border border-gray-700/50">
                    <Editor
                      height="250px"
                      defaultLanguage="python"
                      value={cell.content}
                      onChange={(value) => updateCell(cell.id, value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: 'on',
                        smoothScrolling: true,
                        cursorBlinking: 'smooth',
                        fontFamily: "'Fira Code', 'Consolas', monospace",
                      }}
                      loading={
                        <div className="flex items-center justify-center h-full bg-gray-900">
                          <div className="text-gray-400">Loading editor...</div>
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <textarea
                    value={cell.content}
                    onChange={(e) => updateCell(cell.id, e.target.value)}
                    className="w-full h-40 bg-black/50 border border-gray-700 rounded-lg p-4 text-gray-200 font-mono text-sm resize-y focus:border-cyan-500/50 focus:outline-none transition-colors"
                    placeholder="Markdown content..."
                  />
                )}

                {/* Cell Output */}
                {(cell.output || cell.status === 'running') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`mt-3 p-4 rounded-lg border font-mono text-sm max-h-96 overflow-y-auto ${
                      cell.status === 'error' 
                        ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                        : cell.status === 'running'
                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                        : 'bg-black/50 border-gray-700 text-gray-300'
                    }`}
                  >
                    {cell.status === 'running' && !cell.output && (
                      <div className="flex items-center gap-2 text-blue-400">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span>Executing...</span>
                      </div>
                    )}
                    {cell.output && (
                      <pre className="whitespace-pre-wrap break-words">{cell.output}</pre>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {cells.length === 0 && (
          <div className="text-center py-12 glass rounded-xl">
            <Code className="w-16 h-16 mx-auto mb-4 text-gray-500 opacity-50" />
            <p className="text-gray-400 mb-4">No cells yet</p>
            <button
              onClick={() => addCell('code')}
              className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/30 hover:bg-cyan-500/30 transition-all"
            >
              Add Code Cell
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

