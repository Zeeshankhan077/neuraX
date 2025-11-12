import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { SocketProvider } from './hooks/useSocket'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Nodes from './pages/Nodes'
import Tasks from './pages/Tasks'
import Notebook from './pages/Notebook'
import Stream from './pages/Stream'
import History from './pages/History'
import Settings from './pages/Settings'

function App() {
  return (
    <SocketProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-[#050505] via-[#0a0a0a] to-[#1a1a1a]">
          <Navbar />
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/nodes" element={<Nodes />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/notebook" element={<Notebook />} />
              <Route path="/stream" element={<Stream />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </AnimatePresence>
        </div>
      </Router>
    </SocketProvider>
  )
}

export default App
