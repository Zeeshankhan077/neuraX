import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Download, Loader2 } from 'lucide-react'

export default function RenderPreview({ job, jobId }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [jobWithFiles, setJobWithFiles] = useState(job)

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

  // Fetch job status if completed but no output_files
  useEffect(() => {
    if (job?.status === 'completed' && (!job.output_files || job.output_files.length === 0) && jobId) {
      const serverURL = getServerURL()
      console.log('[RenderPreview] Fetching job status to get output_files:', jobId)
      fetch(`${serverURL}/status/${jobId}`)
        .then(res => res.json())
        .then(data => {
          console.log('[RenderPreview] Fetched job status:', data)
          if (data.output_files && data.output_files.length > 0) {
            setJobWithFiles({ ...job, output_files: data.output_files })
          }
        })
        .catch(err => console.error('[RenderPreview] Failed to fetch job status:', err))
    } else if (job) {
      setJobWithFiles(job)
    }
  }, [job, jobId])

  useEffect(() => {
    const currentJob = jobWithFiles || job
    if (currentJob?.status === 'completed') {
      console.log('[RenderPreview] Job completed:', { jobId, output_files: currentJob.output_files, job: currentJob })
      
      if (currentJob?.output_files && currentJob.output_files.length > 0) {
        const renderFile = currentJob.output_files.find(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
        if (renderFile && jobId) {
          setLoading(true)
          const serverURL = getServerURL()
          const url = `${serverURL}/output/${jobId}/${renderFile}`
          console.log('[RenderPreview] Loading image from:', url)
          
          // Test if image loads (use window.Image to avoid shadowing by icon import)
          const img = new window.Image()
          img.onload = () => {
            console.log('[RenderPreview] Image loaded successfully:', url)
            setImageUrl(url)
            setLoading(false)
          }
          img.onerror = (e) => {
            console.error('[RenderPreview] Failed to load render image:', url, e)
            setLoading(false)
            // Try again after a short delay (file might still be writing)
            setTimeout(() => {
              const retryUrl = url + '?t=' + Date.now()
              console.log('[RenderPreview] Retrying image load:', retryUrl)
              const retryImg = new window.Image()
              retryImg.onload = () => {
                setImageUrl(retryUrl)
                setLoading(false)
              }
              retryImg.onerror = () => {
                console.error('[RenderPreview] Retry also failed')
                setLoading(false)
              }
              retryImg.src = retryUrl
            }, 2000)
          }
          img.src = url
        } else {
          console.warn('[RenderPreview] No render file found in output_files:', currentJob.output_files)
        }
      } else {
        // No render file found, but job completed
        console.warn('[RenderPreview] Blender job completed but no output_files:', currentJob)
      }
    }
  }, [job, jobWithFiles, jobId])

  const currentJob = jobWithFiles || job
  if (!currentJob || currentJob.mode !== 'blender') {
    return null
  }

  return (
    <div className="mt-4 glass rounded-xl p-4 border border-cyan-500/20">
      <div className="flex items-center gap-2 mb-3">
        <ImageIcon className="w-5 h-5 text-cyan-400" />
        <h4 className="font-semibold text-gray-200">Render Preview</h4>
      </div>

      {currentJob.status === 'running' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative aspect-video bg-black/50 rounded-lg flex items-center justify-center border border-cyan-500/30"
        >
          {/* Animated progress indicator */}
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-cyan-400 font-semibold mb-2"
            >
              Rendering...
            </motion.div>
            <div className="text-gray-400 text-sm">
              Creating scene and rendering image
            </div>
            
            {/* Progress bar animation */}
            <div className="mt-4 w-64 h-1 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                initial={{ width: '0%' }}
                animate={{ width: ['0%', '30%', '60%', '90%', '100%'] }}
                transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {currentJob.status === 'completed' && imageUrl && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative aspect-video bg-black/50 rounded-lg overflow-hidden border border-cyan-500/30"
          >
            <img
              src={imageUrl}
              alt="Blender render"
              className="w-full h-full object-contain"
              onError={() => setLoading(false)}
            />
            <div className="absolute top-2 right-2">
              <a
                href={imageUrl}
                download
                className="p-2 glass rounded-lg hover:bg-cyan-500/20 transition-colors"
                title="Download render"
              >
                <Download className="w-4 h-4 text-cyan-400" />
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {currentJob.status === 'completed' && !imageUrl && (
        <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center border border-gray-700">
          <div className="text-center text-gray-400">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No render output available</p>
            {currentJob.output_files && currentJob.output_files.length > 0 && (
              <p className="text-xs mt-2 text-gray-500">
                Files: {currentJob.output_files.join(', ')}
              </p>
            )}
            {loading && (
              <p className="text-xs mt-2 text-cyan-400">Loading image...</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

