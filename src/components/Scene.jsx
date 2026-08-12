import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Grid, Box, Sphere, Line, Text } from '@react-three/drei'
import * as THREE from 'three'

/**
 * Scene Component
 * Creates the 3D environment that demonstrates the head-coupled perspective effect
 * Objects are placed "inside" the monitor (negative Z) and some in front (positive Z)
 */
export function Scene() {
  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[0, 0, -2]} intensity={0.5} color="#00ffaa" />
      
      {/* The "monitor frame" - visual reference for the window edge */}
      <MonitorFrame />
      
      {/* Background grid - deep inside the monitor */}
      <BackgroundGrid />
      
      {/* Floating objects at different depths */}
      <FloatingObjects />
      
      {/* Wireframe room behind the screen */}
      <WireframeRoom />
      
      {/* Reference cube at origin */}
      <CenterMarker />
    </>
  )
}

/**
 * Visual representation of the monitor "window frame"
 */
function MonitorFrame() {
  const frameWidth = 0.52
  const frameHeight = 0.32
  const frameDepth = 0.02
  const thickness = 0.015
  
  const frameColor = '#1a1a2e'
  const glowColor = '#00ffaa'
  
  return (
    <group position={[0, 0, 0]}>
      {/* Top bar */}
      <mesh position={[0, frameHeight/2 + thickness/2, 0]}>
        <boxGeometry args={[frameWidth + thickness*2, thickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} emissive={glowColor} emissiveIntensity={0.1} />
      </mesh>
      
      {/* Bottom bar */}
      <mesh position={[0, -frameHeight/2 - thickness/2, 0]}>
        <boxGeometry args={[frameWidth + thickness*2, thickness, frameDepth]} />
        <meshStandardMaterial color={frameColor} emissive={glowColor} emissiveIntensity={0.1} />
      </mesh>
      
      {/* Left bar */}
      <mesh position={[-frameWidth/2 - thickness/2, 0, 0]}>
        <boxGeometry args={[thickness, frameHeight, frameDepth]} />
        <meshStandardMaterial color={frameColor} emissive={glowColor} emissiveIntensity={0.1} />
      </mesh>
      
      {/* Right bar */}
      <mesh position={[frameWidth/2 + thickness/2, 0, 0]}>
        <boxGeometry args={[thickness, frameHeight, frameDepth]} />
        <meshStandardMaterial color={frameColor} emissive={glowColor} emissiveIntensity={0.1} />
      </mesh>
      
      {/* Corner glow dots */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, y], i) => (
        <mesh key={i} position={[x * frameWidth/2, y * frameHeight/2, 0.01]}>
          <sphereGeometry args={[0.008, 16, 16]} />
          <meshBasicMaterial color={glowColor} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Grid that stretches into the distance behind the screen
 */
function BackgroundGrid() {
  return (
    <group position={[0, -0.15, -2]}>
      <Grid 
        args={[4, 4]}
        cellSize={0.1}
        cellThickness={0.5}
        cellColor="#00ffaa"
        sectionSize={0.5}
        sectionThickness={1}
        sectionColor="#0066ff"
        fadeDistance={5}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />
    </group>
  )
}

/**
 * Objects floating at various depths to demonstrate parallax
 */
function FloatingObjects() {
  const sphereRef = useRef()
  const cube1Ref = useRef()
  const cube2Ref = useRef()
  const torusRef = useRef()
  
  useFrame((state) => {
    const t = state.clock.elapsedTime
    
    // Gentle floating animations
    if (sphereRef.current) {
      sphereRef.current.position.y = Math.sin(t * 0.5) * 0.02
      sphereRef.current.rotation.y = t * 0.3
    }
    
    if (cube1Ref.current) {
      cube1Ref.current.rotation.x = t * 0.2
      cube1Ref.current.rotation.y = t * 0.3
    }
    
    if (cube2Ref.current) {
      cube2Ref.current.rotation.x = -t * 0.15
      cube2Ref.current.rotation.z = t * 0.25
    }
    
    if (torusRef.current) {
      torusRef.current.rotation.x = t * 0.4
      torusRef.current.rotation.y = t * 0.2
    }
  })
  
  return (
    <>
      {/* Main floating sphere - center, behind screen */}
      <mesh ref={sphereRef} position={[0, 0, -0.5]}>
        <sphereGeometry args={[0.08, 32, 32]} />
        <meshStandardMaterial 
          color="#ff3366"
          emissive="#ff3366"
          emissiveIntensity={0.3}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      
      {/* Wireframe cube - left side, deeper */}
      <mesh ref={cube1Ref} position={[-0.15, 0.05, -0.8]}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
        <meshStandardMaterial 
          color="#00ffaa"
          wireframe={true}
          emissive="#00ffaa"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Solid cube - right side, closer */}
      <mesh ref={cube2Ref} position={[0.18, -0.03, -0.3]}>
        <boxGeometry args={[0.05, 0.05, 0.05]} />
        <meshStandardMaterial 
          color="#0088ff"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      
      {/* Torus - in front of screen! */}
      <mesh ref={torusRef} position={[-0.1, 0.08, 0.15]}>
        <torusGeometry args={[0.03, 0.01, 16, 32]} />
        <meshStandardMaterial 
          color="#ffaa00"
          emissive="#ffaa00"
          emissiveIntensity={0.4}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>
      
      {/* Small floating particles at various depths */}
      <Particles />
    </>
  )
}

/**
 * Floating particles that emphasize depth
 */
function Particles() {
  const particles = [
    { pos: [0.12, 0.1, -1.2], color: '#ff3366', size: 0.012 },
    { pos: [-0.18, -0.08, -0.9], color: '#00ffaa', size: 0.008 },
    { pos: [0.08, -0.12, -1.5], color: '#0088ff', size: 0.015 },
    { pos: [-0.05, 0.12, -0.6], color: '#ffaa00', size: 0.006 },
    { pos: [0.2, 0.05, -0.4], color: '#ff3366', size: 0.01 },
    { pos: [-0.22, 0.02, -1.1], color: '#00ffaa', size: 0.009 },
    { pos: [0.15, -0.1, 0.1], color: '#ff00ff', size: 0.007 }, // In front!
    { pos: [-0.08, -0.05, 0.08], color: '#00ffff', size: 0.008 }, // In front!
  ]
  
  const groupRef = useRef()
  
  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.position.y += Math.sin(t * 0.5 + i) * 0.0002
      })
    }
  })
  
  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[p.size, 16, 16]} />
          <meshBasicMaterial color={p.color} />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Wireframe room behind the screen to show depth
 */
function WireframeRoom() {
  const roomWidth = 1
  const roomHeight = 0.6
  const roomDepth = 3
  const roomZ = -1.5 - roomDepth/2
  
  const lineColor = '#003366'
  
  // Create line points for room edges
  const edges = [
    // Back wall corners
    [[-roomWidth/2, -roomHeight/2, roomZ - roomDepth/2], [roomWidth/2, -roomHeight/2, roomZ - roomDepth/2]],
    [[roomWidth/2, -roomHeight/2, roomZ - roomDepth/2], [roomWidth/2, roomHeight/2, roomZ - roomDepth/2]],
    [[roomWidth/2, roomHeight/2, roomZ - roomDepth/2], [-roomWidth/2, roomHeight/2, roomZ - roomDepth/2]],
    [[-roomWidth/2, roomHeight/2, roomZ - roomDepth/2], [-roomWidth/2, -roomHeight/2, roomZ - roomDepth/2]],
    
    // Connecting lines to front
    [[-roomWidth/2, -roomHeight/2, roomZ - roomDepth/2], [-roomWidth/2, -roomHeight/2, -0.5]],
    [[roomWidth/2, -roomHeight/2, roomZ - roomDepth/2], [roomWidth/2, -roomHeight/2, -0.5]],
    [[roomWidth/2, roomHeight/2, roomZ - roomDepth/2], [roomWidth/2, roomHeight/2, -0.5]],
    [[-roomWidth/2, roomHeight/2, roomZ - roomDepth/2], [-roomWidth/2, roomHeight/2, -0.5]],
  ]
  
  return (
    <group>
      {edges.map((points, i) => (
        <Line
          key={i}
          points={points}
          color={lineColor}
          lineWidth={1}
          opacity={0.5}
          transparent
        />
      ))}
      
      {/* Floor grid lines */}
      {Array.from({ length: 10 }).map((_, i) => {
        const z = -0.5 - i * 0.4
        return (
          <Line
            key={`floor-${i}`}
            points={[[-roomWidth/2, -roomHeight/2, z], [roomWidth/2, -roomHeight/2, z]]}
            color={lineColor}
            lineWidth={0.5}
            opacity={0.3}
            transparent
          />
        )
      })}
      
      {/* Side grid lines */}
      {Array.from({ length: 5 }).map((_, i) => {
        const x = -roomWidth/2 + i * (roomWidth/4)
        return (
          <Line
            key={`side-${i}`}
            points={[[x, -roomHeight/2, -0.5], [x, -roomHeight/2, roomZ - roomDepth/2]]}
            color={lineColor}
            lineWidth={0.5}
            opacity={0.3}
            transparent
          />
        )
      })}
    </group>
  )
}

/**
 * Center marker at origin
 */
function CenterMarker() {
  return (
    <group position={[0, 0, -0.01]}>
      {/* Small cross at center */}
      <Line
        points={[[-0.02, 0, 0], [0.02, 0, 0]]}
        color="#ffffff"
        lineWidth={2}
      />
      <Line
        points={[[0, -0.02, 0], [0, 0.02, 0]]}
        color="#ffffff"
        lineWidth={2}
      />
    </group>
  )
}

