import { useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { HeadTracker } from './components/HeadTracker'
import { WindowCamera } from './components/WindowCamera'
import { Scene } from './components/Scene'
import { useHeadStore } from './store/useHeadStore'

/**
 * Main App Component
 * Assembles the head-coupled perspective experience
 */
function App() {
  const { calibrate, isCalibrated, headPosition, smoothingFactor, setSmoothingFactor } = useHeadStore()
  
  // Handle keyboard events for calibration
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.code === 'Space') {
        e.preventDefault()
        calibrate()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [calibrate])
  
  return (
    <div className="app">
      {/* Background gradient */}
      <div className="background" />
      
      {/* Main 3D Canvas */}
      <div className="canvas-container">
        <Canvas
          gl={{ 
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
          }}
          camera={{ 
            fov: 50,
            near: 0.01,
            far: 100,
            position: [0, 0, 0.6]
          }}
        >
          <color attach="background" args={['#0a0a12']} />
          <fog attach="fog" args={['#0a0a12', 1, 5]} />
          
          <Suspense fallback={null}>
            <WindowCamera 
              screenWidth={0.5}
              screenHeight={0.3}
              sensitivity={0.4}
            />
            <Scene />
          </Suspense>
        </Canvas>
      </div>
      
      {/* Head Tracker UI */}
      <HeadTracker />
      
      {/* Instructions Panel */}
      <div className="instructions">
        <h1>Head-Coupled Perspective</h1>
        <p className="subtitle">Move your head to look around the virtual window</p>
        
        <div className="controls">
          <div className="control-item">
            <kbd>SPACE</kbd>
            <span>Calibrate center position</span>
          </div>
        </div>
        
        <div className="smoothing-control">
          <label>
            Smoothing: {(smoothingFactor * 100).toFixed(0)}%
            <input
              type="range"
              min="0"
              max="99"
              value={smoothingFactor * 100}
              onChange={(e) => setSmoothingFactor(e.target.value / 100)}
            />
          </label>
        </div>
        
        <div className="status-bar">
          <div className={`status-indicator ${isCalibrated ? 'active' : ''}`}>
            <span className="dot" />
            <span>{isCalibrated ? 'Calibrated' : 'Not Calibrated'}</span>
          </div>
          
          <div className="position-readout">
            <span>X: {headPosition.x.toFixed(2)}</span>
            <span>Y: {headPosition.y.toFixed(2)}</span>
            <span>Z: {headPosition.z.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {/* Tech credits */}
      <div className="credits">
        <span>React Three Fiber</span>
        <span>•</span>
        <span>MediaPipe</span>
        <span>•</span>
        <span>Zustand</span>
      </div>
    </div>
  )
}

export default App

