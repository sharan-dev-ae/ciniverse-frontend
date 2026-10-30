import { Html, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Seat } from '../../../types/domain'
import { useBookingStore } from '../../../stores/bookingStore'
import { getLookAtQuaternion, getModePose, getSeatWorldPosition, OVERVIEW_TARGET, SCREEN_CENTER, type CameraMode } from '../utils/camera'

export type { CameraMode } from '../utils/camera'
const stateColors = { available: '#692337', selected: '#e11d48', held: '#d6ad60', booked: '#343741', disabled: '#15171d' }

function CinemaSeat({ seat }: { seat: Seat }) {
  const selected = useBookingStore(state => state.selectedSeats.some(item => item.id === seat.id))
  const toggle = useBookingStore(state => state.toggleSeat)
  const [hovered, setHovered] = useState(false)
  const position = useMemo(() => getSeatWorldPosition(seat), [seat])
  const color = selected ? stateColors.selected : stateColors[seat.status]
  return <group position={position} scale={seat.category === 'vip' ? 1.12 : 1}
    onPointerOver={event => { event.stopPropagation(); setHovered(true); document.body.style.cursor = seat.status === 'available' ? 'pointer' : 'not-allowed' }}
    onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
    onClick={event => { event.stopPropagation(); if (seat.status === 'available') toggle(seat) }}>
    <RoundedBox args={[.78, .25, .78]} radius={.1} position={[0, .25, .05]}><meshStandardMaterial color={color} roughness={.6} /></RoundedBox>
    <RoundedBox args={[.8, .95, .18]} radius={.1} position={[0, .82, .35]} rotation={[-.08, 0, 0]}><meshStandardMaterial color={color} roughness={.65} /></RoundedBox>
    <mesh position={[-.53, .42, .1]}><boxGeometry args={[.16, .16, .78]} /><meshStandardMaterial color="#2b2023" /></mesh>
    <mesh position={[.53, .42, .1]}><boxGeometry args={[.16, .16, .78]} /><meshStandardMaterial color="#2b2023" /></mesh>
    <Text position={[0, 1.05, .24]} fontSize={.16} color="#f8fafc" anchorX="center">{seat.id}</Text>
    {hovered && <Html center position={[0, 1.55, 0]}><div className="pointer-events-none w-44 rounded-xl border border-white/10 bg-ink/95 p-3 text-xs shadow-2xl"><p className="font-bold text-white">Seat {seat.id}</p><p className="mt-1 capitalize text-muted">Row {seat.row} · {seat.category} · ${seat.price}</p><p className="mt-1 capitalize text-gold">{selected ? 'selected' : seat.status}</p></div></Html>}
  </group>
}

interface SavedCamera { position: THREE.Vector3; quaternion: THREE.Quaternion; target: THREE.Vector3; fov: number }
function CameraController({ mode, seat, controls }: { mode: CameraMode; seat: Seat | null; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree()
  const previousMode = useRef<CameraMode>('overview')
  const savedOverview = useRef<SavedCamera | null>(null)
  const targetPosition = useRef(new THREE.Vector3())
  const targetQuaternion = useRef(new THREE.Quaternion())
  const transitionActive = useRef(false)

  useEffect(() => {
    if (previousMode.current === 'overview' && mode !== 'overview') {
      savedOverview.current = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), target: controls.current?.target.clone() ?? OVERVIEW_TARGET.clone(), fov: (camera as THREE.PerspectiveCamera).fov }
    }
    if (mode === 'overview') {
      const saved = savedOverview.current
      if (saved) {
        targetPosition.current.copy(saved.position); targetQuaternion.current.copy(saved.quaternion)
        ;(camera as THREE.PerspectiveCamera).fov = saved.fov; (camera as THREE.PerspectiveCamera).updateProjectionMatrix()
      } else {
        targetPosition.current.set(0, 10, 18); targetQuaternion.current.copy(getLookAtQuaternion(targetPosition.current, OVERVIEW_TARGET))
      }
    } else if (seat) {
      const pose = getModePose(mode, seat)!
      targetPosition.current.copy(pose.position); targetQuaternion.current.copy(pose.quaternion)
    }
    if (controls.current) controls.current.enabled = false
    transitionActive.current = true; previousMode.current = mode
  }, [camera, controls, mode, seat])

  useFrame((_, delta) => {
    if (!transitionActive.current) return
    const damping = 1 - Math.exp(-5.2 * Math.min(delta, .1))
    camera.position.lerp(targetPosition.current, damping); camera.quaternion.slerp(targetQuaternion.current, damping)
    const positionDone = camera.position.distanceToSquared(targetPosition.current) < .0004
    const rotationDone = 1 - Math.abs(camera.quaternion.dot(targetQuaternion.current)) < .00002
    if (positionDone && rotationDone) {
      camera.position.copy(targetPosition.current); camera.quaternion.copy(targetQuaternion.current); transitionActive.current = false
      if (mode === 'overview' && controls.current) { controls.current.target.copy(savedOverview.current?.target ?? OVERVIEW_TARGET); controls.current.enabled = true; controls.current.update() }
    }
  })
  return null
}

function CinematicScreen() {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 520
    const context = canvas.getContext('2d')!; const sky = context.createLinearGradient(0, 0, 0, canvas.height)
    sky.addColorStop(0, '#070a1c'); sky.addColorStop(.55, '#38224b'); sky.addColorStop(1, '#d35b42'); context.fillStyle = sky; context.fillRect(0, 0, canvas.width, canvas.height)
    const sun = context.createRadialGradient(850, 235, 4, 850, 235, 145); sun.addColorStop(0, 'rgba(255,235,190,.95)'); sun.addColorStop(.35, 'rgba(255,120,90,.45)'); sun.addColorStop(1, 'rgba(255,80,80,0)'); context.fillStyle = sun; context.fillRect(0, 0, canvas.width, canvas.height)
    for (let index = 0; index < 90; index += 1) { const x = (index * 137) % canvas.width; const y = (index * 61) % 230; context.beginPath(); context.arc(x, y, index % 5 === 0 ? 1.8 : .8, 0, Math.PI * 2); context.fillStyle = 'rgba(255,255,255,.75)'; context.fill() }
    context.fillStyle = '#08090d'; context.beginPath(); context.moveTo(0, 430); context.lineTo(180, 330); context.lineTo(330, 410); context.lineTo(520, 300); context.lineTo(720, 405); context.lineTo(950, 315); context.lineTo(1200, 420); context.lineTo(1200, 520); context.lineTo(0, 520); context.fill()
    context.fillStyle = '#f8fafc'; context.font = '700 68px Inter, sans-serif'; context.fillText('STELLAR DRIFT', 72, 135); context.fillStyle = '#d6ad60'; context.font = '500 20px Inter, sans-serif'; context.fillText('A CINEVERSE ORIGINAL · DEMONSTRATION PREVIEW', 76, 176)
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; result.anisotropy = 4; return result
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={SCREEN_CENTER}><planeGeometry args={[13, 4]} /><meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} /></mesh>
}

function Room({ seats }: { seats: Seat[] }) { return <>
  <ambientLight intensity={.42} /><spotLight position={[0, 11, -3]} intensity={60} angle={1.2} penumbra={.9} /><pointLight position={[-7, .4, 6]} color="#e11d48" intensity={12} /><pointLight position={[8, .4, 6]} color="#e11d48" intensity={12} />
  <mesh position={[0, 2, -7]}><boxGeometry args={[17, 5, .25]} /><meshStandardMaterial color="#101116" /></mesh><CinematicScreen /><Text position={[0, 5, -6.65]} fontSize={.3} color="#d6ad60">CINEVERSE</Text>
  <mesh position={[0, -.15, 7]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[22, 32]} /><meshStandardMaterial color="#0d0e12" roughness={.85} /></mesh>
  {Array.from({ length: 10 }, (_, row) => <mesh key={row} position={[0, row * .18, row * 1.45]}><boxGeometry args={[19, .35, 1.42]} /><meshStandardMaterial color={row > 7 ? '#171217' : '#15161b'} /></mesh>)}
  {[-.2, .2].map((x, index) => <mesh key={index} position={[x, 0, 7]}><boxGeometry args={[.08, .08, 28]} /><meshStandardMaterial color="#e11d48" emissive="#e11d48" emissiveIntensity={3} /></mesh>)}
  {seats.map(seat => <CinemaSeat key={seat.id} seat={seat} />)}
  <mesh position={[-10, 4, 7]}><boxGeometry args={[.3, 8, 30]} /><meshStandardMaterial color="#111319" /></mesh><mesh position={[10, 4, 7]}><boxGeometry args={[.3, 8, 30]} /><meshStandardMaterial color="#111319" /></mesh>
  </> }

export function AuditoriumScene({ seats, mode, focusedSeat }: { seats: Seat[]; mode: CameraMode; focusedSeat: Seat | null }) {
  const controls = useRef<OrbitControlsImpl>(null)
  return <Canvas camera={{ position: [0, 10, 18], fov: 48 }} dpr={[1, 1.6]} gl={{ antialias: true, powerPreference: 'high-performance' }}><color attach="background" args={['#08090d']} /><fog attach="fog" args={['#08090d', 20, 45]} /><Suspense fallback={<Html center><span className="text-sm text-white">Preparing auditorium…</span></Html>}><Room seats={seats} /></Suspense><CameraController mode={mode} seat={focusedSeat} controls={controls} /><OrbitControls ref={controls} enablePan minDistance={8} maxDistance={32} minPolarAngle={.35} maxPolarAngle={1.45} target={OVERVIEW_TARGET} /></Canvas>
}
