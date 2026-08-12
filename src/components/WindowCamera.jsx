import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Matrix4 } from 'three'
import { useHeadStore } from '../store/useHeadStore'

/**
 * WindowCamera Component
 * Implements asymmetric (off-axis) view frustum projection
 * 
 * The key insight: the monitor is a "window" into the virtual world.
 * When the user moves their head, we must:
 * 1. Move the camera to match their eye position
 * 2. Skew the frustum so the near plane stays aligned with the screen
 * 
 * This creates the illusion that objects exist behind/in front of the screen.
 * 
 * Reference: Johnny Lee's Wii head tracking, CAVE systems, etc.
 */
export function WindowCamera({ 
  screenWidth = 0.5,    // Physical screen width in meters (adjust to your monitor)
  screenHeight = 0.3,   // Physical screen height in meters
  near = 0.01,          // Near clipping plane
  far = 100,            // Far clipping plane
  sensitivity = 0.3     // How much camera moves relative to head
}) {
  const { camera, size } = useThree()
  const headPosition = useHeadStore(state => state.headPosition)
  const prevMatrix = useRef(new Matrix4())
  
  // Store original camera settings
  const originalFov = useRef(camera.fov)
  
  useEffect(() => {
    // Disable automatic projection matrix updates
    // We'll compute it ourselves
    camera.matrixAutoUpdate = true
    
    return () => {
      // Restore normal camera behavior on unmount
      camera.projectionMatrix.copy(prevMatrix.current)
    }
  }, [camera])
  
  useFrame(() => {
    // Get normalized head position (-1 to 1)
    const { x, y, z } = headPosition
    
    // Convert normalized position to physical position
    // The user's head is positioned at some distance from the screen
    // Z is the distance from screen (in meters, approximately)
    const eyeX = x * screenWidth * sensitivity
    const eyeY = y * screenHeight * sensitivity
    const eyeZ = z * 1.0  // Z already in a reasonable range (0.3 to 1.5)
    
    // Move camera to eye position
    // The camera moves OPPOSITE to head movement to create parallax
    // Actually, for window illusion, camera should match eye position
    camera.position.set(eyeX, eyeY, eyeZ)
    
    // Look at the screen center (origin)
    // The screen is at Z=0, we look through it
    camera.lookAt(0, 0, 0)
    
    // Compute off-axis frustum
    // The screen acts as the projection plane (near plane conceptually)
    // We need to skew the frustum based on eye offset
    
    // Calculate the boundaries of the screen as seen from eye position
    const halfWidth = screenWidth / 2
    const halfHeight = screenHeight / 2
    
    // Distance from eye to screen (the "near" plane for perspective math)
    // We use eyeZ as the distance to the virtual screen plane
    const screenDist = Math.max(0.1, eyeZ)
    
    // Calculate asymmetric frustum bounds
    // These are the edges of the screen relative to the eye position
    // projected onto the near clipping plane
    const nearOverDist = near / screenDist
    
    // Left edge of screen is at (-halfWidth - eyeX) from eye
    // Right edge is at (halfWidth - eyeX)
    // Top is at (halfHeight - eyeY)
    // Bottom is at (-halfHeight - eyeY)
    const left = (-halfWidth - eyeX) * nearOverDist
    const right = (halfWidth - eyeX) * nearOverDist
    const bottom = (-halfHeight - eyeY) * nearOverDist
    const top = (halfHeight - eyeY) * nearOverDist
    
    // Build the off-axis projection matrix
    camera.projectionMatrix.makePerspective(left, right, bottom, top, near, far)
    
    // Update inverse projection matrix (needed for some Three.js features)
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
    
    // Store for cleanup
    prevMatrix.current.copy(camera.projectionMatrix)
  })
  
  return null
}

/**
 * Alternative implementation using the standard OpenGL off-axis formula
 * This is mathematically equivalent but shows the underlying matrix construction
 */
export function WindowCameraManual({ 
  screenWidth = 0.5,
  screenHeight = 0.3,
  near = 0.01,
  far = 100,
  sensitivity = 0.3
}) {
  const { camera } = useThree()
  const headPosition = useHeadStore(state => state.headPosition)
  
  useFrame(() => {
    const { x, y, z } = headPosition
    
    const eyeX = x * screenWidth * sensitivity
    const eyeY = y * screenHeight * sensitivity  
    const eyeZ = Math.max(0.1, z)
    
    camera.position.set(eyeX, eyeY, eyeZ)
    camera.lookAt(0, 0, 0)
    
    // Manual projection matrix construction
    // Following the generalized perspective projection formula
    const halfW = screenWidth / 2
    const halfH = screenHeight / 2
    
    // Screen corners in world space (screen at z=0)
    const pa = { x: -halfW, y: -halfH, z: 0 } // bottom-left
    const pb = { x: halfW, y: -halfH, z: 0 }  // bottom-right  
    const pc = { x: -halfW, y: halfH, z: 0 }  // top-left
    
    // Eye position
    const pe = { x: eyeX, y: eyeY, z: eyeZ }
    
    // Orthonormal basis for screen
    const vr = { x: 1, y: 0, z: 0 }  // right vector
    const vu = { x: 0, y: 1, z: 0 }  // up vector
    const vn = { x: 0, y: 0, z: 1 }   // normal (pointing at viewer)
    
    // Distance from eye to screen
    const d = eyeZ
    
    // Screen extent from eye
    const l = (-halfW - eyeX) * near / d
    const r = (halfW - eyeX) * near / d
    const b = (-halfH - eyeY) * near / d
    const t = (halfH - eyeY) * near / d
    
    camera.projectionMatrix.makePerspective(l, r, b, t, near, far)
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
  })
  
  return null
}

