import { useEffect, useRef, useState } from 'react'
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { useHeadStore } from '../store/useHeadStore'

/**
 * HeadTracker Component
 * Handles webcam access and MediaPipe FaceLandmarker for real-time face tracking
 * Extracts eye bridge position and normalizes to -1 to 1 range
 */
export function HeadTracker() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const faceLandmarkerRef = useRef(null)
  const animationFrameRef = useRef(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showDebug, setShowDebug] = useState(true)
  
  const { updatePosition, setTracking, headPosition, isCalibrated } = useHeadStore()
  
  // Initialize MediaPipe FaceLandmarker
  useEffect(() => {
    // Check if already initialized
    if (faceLandmarkerRef.current && videoRef.current?.srcObject) {
      console.log('Already initialized, skipping')
      return
    }
    
    let mounted = true
    let streamRef = null
    
    async function initializeFaceLandmarker() {
      try {
        setIsLoading(true)
        console.log('Starting initialization...')
        
        // Only create FaceLandmarker if not already created
        if (!faceLandmarkerRef.current) {
          console.log('Loading MediaPipe WASM...')
          // Load MediaPipe WASM files
          const filesetResolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
          )
          
          console.log('Creating FaceLandmarker...')
          // Create FaceLandmarker
          const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: false,
            outputFacialTransformationMatrixes: true
          })
          
          if (mounted) {
            faceLandmarkerRef.current = landmarker
            console.log('FaceLandmarker initialized successfully')
          }
        }
        
        // Request webcam access
        console.log('Requesting camera access...')
        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: 'user'
            }
          })
          console.log('Camera access granted')
        } catch (videoErr) {
          console.warn('Failed with ideal constraints, trying basic:', videoErr)
          stream = await navigator.mediaDevices.getUserMedia({ video: true })
        }
        
        streamRef = stream
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        
        if (!videoRef.current) {
          console.error('Video element not found!')
          return
        }
        
        console.log('Setting up video element...')
        const video = videoRef.current
        video.srcObject = stream
        
        // Use a promise-based approach for video loading
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = () => {
            console.log('Video metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight)
            resolve()
          }
          video.onerror = (e) => {
            console.error('Video error:', e)
            reject(new Error('Video failed to load'))
          }
          // Timeout fallback
          setTimeout(() => resolve(), 3000)
        })
        
        // Play video
        try {
          await video.play()
          console.log('Video playing!')
        } catch (playErr) {
          console.warn('Autoplay blocked, trying muted:', playErr)
          video.muted = true
          await video.play()
        }
        
        if (mounted) {
          setIsLoading(false)
          setTracking(true)
          startTracking()
        }
        
      } catch (err) {
        console.error('Failed to initialize face tracking:', err)
        if (mounted) {
          let errorMsg = err.message || 'Unknown error'
          if (err.name === 'NotAllowedError') {
            errorMsg = 'Camera permission denied. Please allow camera access and reload.'
          } else if (err.name === 'NotFoundError') {
            errorMsg = 'No camera found. Please connect a webcam.'
          } else if (err.name === 'NotReadableError') {
            errorMsg = 'Camera is in use by another app. Close other apps using the camera.'
          } else if (err.name === 'OverconstrainedError') {
            errorMsg = 'Camera does not support required settings.'
          }
          setError(errorMsg)
          setIsLoading(false)
        }
      }
    }
    
    initializeFaceLandmarker()
    
    return () => {
      mounted = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (streamRef) {
        streamRef.getTracks().forEach(track => track.stop())
      }
    }
  }, [])
  
  // Main tracking loop
  function startTracking() {
    const video = videoRef.current
    const canvas = canvasRef.current
    const landmarker = faceLandmarkerRef.current
    
    if (!video || !landmarker) return
    
    const ctx = canvas?.getContext('2d')
    let lastTime = -1
    
    function detect() {
      if (!video || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detect)
        return
      }
      
      const now = performance.now()
      if (now === lastTime) {
        animationFrameRef.current = requestAnimationFrame(detect)
        return
      }
      lastTime = now
      
      // Always draw the video feed first (so user sees camera is working)
      if (ctx && showDebug && canvas) {
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 240
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        
        // Draw mirrored video
        ctx.save()
        ctx.scale(-1, 1)
        ctx.drawImage(video, -canvas.width, 0)
        ctx.restore()
      }
      
      try {
        const results = landmarker.detectForVideo(video, now)
        
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
          const landmarks = results.faceLandmarks[0]
          
          // Get eye landmarks for calculating head position
          // Landmark 168 is the bridge of the nose (between eyes)
          // Left eye: 33, Right eye: 263
          // Nose tip: 1
          const leftEye = landmarks[33]
          const rightEye = landmarks[263]
          const noseBridge = landmarks[168]
          
          // Calculate the center point between eyes
          const eyeCenter = {
            x: (leftEye.x + rightEye.x) / 2,
            y: (leftEye.y + rightEye.y) / 2,
            z: (leftEye.z + rightEye.z) / 2
          }
          
          // Calculate eye distance (for depth estimation)
          const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) +
            Math.pow(rightEye.y - leftEye.y, 2)
          )
          
          // Normalize coordinates to -1 to 1 range
          // MediaPipe returns 0-1, we want center to be 0
          // X: flip because webcam is mirrored
          // Y: flip because screen Y is inverted
          // Z: use eye distance as depth proxy
          const normalizedX = -((eyeCenter.x - 0.5) * 2) // -1 to 1, flipped
          const normalizedY = -((eyeCenter.y - 0.5) * 2) // -1 to 1, flipped
          
          // Z depth: closer = larger eye distance
          // Baseline eye distance ~0.15 at normal distance
          // Map to a reasonable depth range (0.3 to 1.2 meters conceptually)
          const baselineEyeDistance = 0.12
          const normalizedZ = Math.max(0.3, Math.min(1.5, baselineEyeDistance / eyeDistance))
          
          updatePosition({
            x: normalizedX,
            y: normalizedY,
            z: normalizedZ
          })
          
          // Draw eye tracking overlay
          if (ctx && showDebug) {
            // Draw eye positions
            const mirroredLeftX = canvas.width - leftEye.x * canvas.width
            const mirroredRightX = canvas.width - rightEye.x * canvas.width
            
            ctx.fillStyle = '#00ff88'
            ctx.beginPath()
            ctx.arc(mirroredLeftX, leftEye.y * canvas.height, 5, 0, Math.PI * 2)
            ctx.fill()
            
            ctx.fillStyle = '#00ff88'
            ctx.beginPath()
            ctx.arc(mirroredRightX, rightEye.y * canvas.height, 5, 0, Math.PI * 2)
            ctx.fill()
            
            // Draw center point
            const mirroredCenterX = canvas.width - eyeCenter.x * canvas.width
            ctx.fillStyle = '#ff3366'
            ctx.beginPath()
            ctx.arc(mirroredCenterX, eyeCenter.y * canvas.height, 8, 0, Math.PI * 2)
            ctx.fill()
          }
        } else {
          // No face detected - draw indicator
          if (ctx && showDebug) {
            ctx.fillStyle = 'rgba(255, 51, 102, 0.8)'
            ctx.font = '12px sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('No face detected', canvas.width / 2, canvas.height - 10)
          }
        }
      } catch (err) {
        console.error('Detection error:', err)
      }
      
      animationFrameRef.current = requestAnimationFrame(detect)
    }
    
    detect()
  }
  
  if (error) {
    return (
      <div className="head-tracker head-tracker--error">
        <div className="tracker-panel">
          <h3>⚠ Camera Error</h3>
          <p>{error}</p>
          <p className="hint">Please allow camera access and reload</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="head-tracker">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: 'none' }}
      />
      
      <div className="tracker-panel">
        <div className="tracker-header">
          <span className={`status-dot ${isLoading ? 'loading' : 'active'}`} />
          <span>Head Tracking</span>
          <button 
            className="toggle-debug"
            onClick={() => setShowDebug(!showDebug)}
          >
            {showDebug ? '◉' : '○'}
          </button>
        </div>
        
        {isLoading ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Initializing camera...</span>
          </div>
        ) : (
          <>
            {showDebug && (
              <canvas
                ref={canvasRef}
                className="debug-canvas"
              />
            )}
            
            <div className="position-display">
              <div className="coord">
                <span className="label">X</span>
                <span className="value">{headPosition.x.toFixed(3)}</span>
              </div>
              <div className="coord">
                <span className="label">Y</span>
                <span className="value">{headPosition.y.toFixed(3)}</span>
              </div>
              <div className="coord">
                <span className="label">Z</span>
                <span className="value">{headPosition.z.toFixed(3)}</span>
              </div>
            </div>
            
            <div className={`calibration-status ${isCalibrated ? 'calibrated' : ''}`}>
              {isCalibrated ? '✓ Calibrated' : 'Press SPACE to calibrate'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

