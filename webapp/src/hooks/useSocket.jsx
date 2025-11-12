import { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'

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

const SocketContext = createContext(null)

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [computeNodes, setComputeNodes] = useState([])
  const [jobHistory, setJobHistory] = useState([])

  useEffect(() => {
    const SERVER_URL = getServerURL()
    console.log('Connecting to server:', SERVER_URL)
    
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to server:', SERVER_URL)
      setConnected(true)
      console.log('📡 Requesting compute nodes list...')
      newSocket.emit('get_compute_nodes')
    })

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason)
      setConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error.message)
      setConnected(false)
    })

    newSocket.on('compute_nodes_list', (nodes) => {
      console.log(`📋 Received compute nodes list: ${nodes?.length || 0} node(s)`, nodes)
      if (Array.isArray(nodes)) {
        setComputeNodes(nodes)
      } else {
        console.warn('⚠️  compute_nodes_list is not an array:', nodes)
        setComputeNodes([])
      }
    })

    newSocket.on('compute_node_registered', (node) => {
      console.log('🆕 New node registered:', node)
      setComputeNodes(prev => {
        const exists = prev.find(n => n.node_id === node.node_id)
        if (exists) {
          return prev.map(n => n.node_id === node.node_id ? node : n)
        }
        return [...prev, node]
      })
    })

    newSocket.on('job_status', (data) => {
      setJobHistory(prev => {
        const existing = prev.find(j => j.job_id === data.job_id)
        if (existing) {
          return prev.map(j => j.job_id === data.job_id ? { ...j, ...data } : j)
        }
        return [...prev, data]
      })
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, connected, computeNodes, jobHistory, setJobHistory }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider')
  }
  return context
}


