import { create } from 'zustand'

/**
 * Zustand store for head tracking state
 * Manages normalized head coordinates, calibration offset, and tracking status
 */
export const useHeadStore = create((set, get) => ({
  // Raw head position from MediaPipe (normalized -1 to 1)
  rawPosition: { x: 0, y: 0, z: 0.6 },
  
  // Smoothed head position (after lerp)
  smoothedPosition: { x: 0, y: 0, z: 0.6 },
  
  // Calibration offset (set when user presses Space)
  calibrationOffset: { x: 0, y: 0, z: 0 },
  
  // Final position = smoothed - calibration
  headPosition: { x: 0, y: 0, z: 0.6 },
  
  // Tracking status
  isTracking: false,
  isCalibrated: false,
  
  // Smoothing factor (0 = no smoothing, 1 = infinite smoothing)
  smoothingFactor: 0.85,
  
  // Update raw position and apply smoothing
  updatePosition: (newRaw) => {
    const state = get()
    const alpha = 1 - state.smoothingFactor
    
    // Lerp smoothing
    const smoothed = {
      x: state.smoothedPosition.x + (newRaw.x - state.smoothedPosition.x) * alpha,
      y: state.smoothedPosition.y + (newRaw.y - state.smoothedPosition.y) * alpha,
      z: state.smoothedPosition.z + (newRaw.z - state.smoothedPosition.z) * alpha,
    }
    
    // Apply calibration offset
    const final = {
      x: smoothed.x - state.calibrationOffset.x,
      y: smoothed.y - state.calibrationOffset.y,
      z: smoothed.z - state.calibrationOffset.z,
    }
    
    set({
      rawPosition: newRaw,
      smoothedPosition: smoothed,
      headPosition: final,
    })
  },
  
  // Set current position as center (calibration)
  calibrate: () => {
    const state = get()
    set({
      calibrationOffset: { ...state.smoothedPosition },
      headPosition: { x: 0, y: 0, z: state.smoothedPosition.z },
      isCalibrated: true,
    })
    console.log('Calibrated! Current position set as center.')
  },
  
  // Reset calibration
  resetCalibration: () => {
    set({
      calibrationOffset: { x: 0, y: 0, z: 0 },
      isCalibrated: false,
    })
  },
  
  // Set tracking status
  setTracking: (status) => set({ isTracking: status }),
  
  // Set smoothing factor
  setSmoothingFactor: (factor) => set({ smoothingFactor: Math.max(0, Math.min(0.99, factor)) }),
}))

