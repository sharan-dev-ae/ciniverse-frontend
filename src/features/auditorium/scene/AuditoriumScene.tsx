import { Html, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { Seat } from '../../../types/domain'
import { useBookingStore } from '../../../stores/bookingStore'
import { DEFAULT_SEAT_VIEW, getLookAtQuaternion, getModePose, getSeatWorldPosition, type CameraMode, type SeatViewCalibration } from '../utils/camera'
import type { GeneratedAuditoriumLayout } from '../utils/layoutEngine'
import { calculateSightline, getSightlineVisibility } from '../utils/sightline'
import { clampCameraTarget, createCameraSafetyBounds, getSafeOverviewPose, isValidOverviewPosition, ORBIT_LIMITS, resolveCameraPosition, type CameraSafetyBounds } from '../utils/cameraSafety'

export type { CameraMode } from '../utils/camera'
const stateColors = { available: '#173d7a', selected: '#2563eb', held: '#38bdf8', booked: '#334155', disabled: '#111827' }

interface SeatResources { base: THREE.BoxGeometry; back: THREE.BoxGeometry; arm: THREE.BoxGeometry; materials: Record<string, THREE.MeshStandardMaterial> }
function CinemaSeat({ seat, resources, scale, interactive, selectedSeatId, onSeatSelect, reclineAngle }: { seat: Seat; resources: SeatResources; scale: number; interactive: boolean; selectedSeatId?: string | null; onSeatSelect?: (seat: Seat) => void; reclineAngle: number }) {
  const bookingSelected = useBookingStore(state => state.selectedSeats.some(item => item.id === seat.id))
  const selected = selectedSeatId ? selectedSeatId === seat.id : bookingSelected
  const toggle = useBookingStore(state => state.toggleSeat)
  const [hovered, setHovered] = useState(false)
  const position = useMemo(() => getSeatWorldPosition(seat), [seat])
  const color = selected ? stateColors.selected : stateColors[seat.status]
  const material = resources.materials[selected ? 'selected' : seat.status === 'available' ? seat.category : seat.status]
  return <group position={position} rotation={[0, seat.rotation, 0]} scale={scale * (seat.category === 'vip' ? 1.12 : 1)}
    onPointerOver={event => { event.stopPropagation(); setHovered(true); document.body.style.cursor = interactive && seat.status === 'available' ? 'pointer' : 'default' }}
    onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
    onClick={event => { event.stopPropagation(); if (onSeatSelect) onSeatSelect(seat); else if (interactive && seat.status === 'available') toggle(seat) }}>
    <mesh geometry={resources.base} material={material} position={[0, .25, .05]} />
    <mesh geometry={resources.back} material={material} position={[0, .82, .35]} rotation={[-.08 - THREE.MathUtils.degToRad(selected ? reclineAngle : 0), 0, 0]} />
    <mesh geometry={resources.arm} material={resources.materials.arm} position={[-.53, .42, .1]} />
    <mesh geometry={resources.arm} material={resources.materials.arm} position={[.53, .42, .1]} />
    {hovered && <Html center position={[0, 1.55, 0]}><div className="pointer-events-none w-44 rounded-xl border border-white/10 bg-ink/95 p-3 text-xs shadow-2xl"><p className="font-bold text-white">Seat {seat.id}</p><p className="mt-1 capitalize text-muted">Row {seat.row} · {seat.category} · ${seat.price}</p><p className="mt-1 capitalize text-gold">{selected ? 'selected' : seat.status}</p></div></Html>}
  </group>
}

interface SavedCamera { position: THREE.Vector3; quaternion: THREE.Quaternion; target: THREE.Vector3; fov: number }
function SightlineVisualization({ seat, screenCenter, seatView, mode, enabled }: { seat: Seat | null; screenCenter: THREE.Vector3; seatView: SeatViewCalibration; mode: CameraMode; enabled: boolean }) {
  const visibility = getSightlineVisibility(enabled, !!seat, mode)
  const measurement = useMemo(() => seat ? calculateSightline(seat, screenCenter, seatView) : null, [screenCenter, seat, seatView])
  const geometry = useMemo(() => measurement ? new THREE.BufferGeometry().setFromPoints([measurement.origin, measurement.target]) : null, [measurement])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!visibility.visible || !measurement) return null
  return <group raycast={() => undefined}>
    {visibility.showBeam && geometry && <lineSegments geometry={geometry} raycast={() => undefined}><lineBasicMaterial color="#FACC15" transparent opacity={.9} blending={THREE.AdditiveBlending} depthWrite={false} /></lineSegments>}
    {visibility.showEyeMarker && <mesh position={measurement.origin} raycast={() => undefined}><sphereGeometry args={[.085, 12, 12]} /><meshBasicMaterial color="#FACC15" transparent opacity={.9} depthWrite={false} /></mesh>}
    {visibility.showScreenMarker && <mesh position={[measurement.target.x, measurement.target.y, measurement.target.z + .035]} raycast={() => undefined}><ringGeometry args={[.12, .19, 24]} /><meshBasicMaterial color="#FACC15" transparent opacity={.85} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
  </group>
}

function CameraController({ mode, seat, screenCenter, overviewTarget, overviewPosition, controls, seatView, resetVersion }: { mode: CameraMode; seat: Seat | null; screenCenter: THREE.Vector3; overviewTarget: THREE.Vector3; overviewPosition: THREE.Vector3; controls: React.RefObject<OrbitControlsImpl | null>; seatView: SeatViewCalibration; resetVersion: number }) {
  const { camera } = useThree()
  const previousMode = useRef<CameraMode>('overview')
  const savedOverview = useRef<SavedCamera | null>(null)
  const targetPosition = useRef(new THREE.Vector3())
  const targetQuaternion = useRef(new THREE.Quaternion())
  const transitionActive = useRef(false)
  const previousResetVersion = useRef(resetVersion)

  useEffect(() => {
    const resetRequested = previousResetVersion.current !== resetVersion
    if (resetRequested) savedOverview.current = null
    if (previousMode.current === 'overview' && mode !== 'overview') {
      savedOverview.current = { position: camera.position.clone(), quaternion: camera.quaternion.clone(), target: controls.current?.target.clone() ?? overviewTarget.clone(), fov: (camera as THREE.PerspectiveCamera).fov }
    }
    if (mode === 'overview') {
      const saved = resetRequested ? null : savedOverview.current
      if (saved) {
        targetPosition.current.copy(saved.position); targetQuaternion.current.copy(saved.quaternion)
        ;(camera as THREE.PerspectiveCamera).fov = saved.fov; (camera as THREE.PerspectiveCamera).updateProjectionMatrix()
      } else {
        targetPosition.current.copy(overviewPosition); targetQuaternion.current.copy(getLookAtQuaternion(targetPosition.current, overviewTarget))
      }
    } else if (seat) {
      const pose = getModePose(mode, seat, screenCenter, seatView)!
      targetPosition.current.copy(pose.position); targetQuaternion.current.copy(pose.quaternion)
    }
    if (controls.current) controls.current.enabled = false
    transitionActive.current = true; previousMode.current = mode; previousResetVersion.current = resetVersion
  }, [camera, controls, mode, overviewPosition, overviewTarget, resetVersion, screenCenter, seat, seatView])

  useFrame((_, delta) => {
    if (!transitionActive.current) return
    const damping = 1 - Math.exp(-5.2 * Math.min(delta, .1))
    camera.position.lerp(targetPosition.current, damping); camera.quaternion.slerp(targetQuaternion.current, damping)
    const positionDone = camera.position.distanceToSquared(targetPosition.current) < .0004
    const rotationDone = 1 - Math.abs(camera.quaternion.dot(targetQuaternion.current)) < .00002
    if (positionDone && rotationDone) {
      camera.position.copy(targetPosition.current); camera.quaternion.copy(targetQuaternion.current); transitionActive.current = false
      if (mode === 'overview' && controls.current) { controls.current.target.copy(savedOverview.current?.target ?? overviewTarget); controls.current.enabled = true; controls.current.update() }
    }
  })
  return null
}

function CameraSafetyController({ mode, bounds, controls }: { mode: CameraMode; bounds: CameraSafetyBounds; controls: React.RefObject<OrbitControlsImpl | null> }) {
  const { camera } = useThree()
  const resetPose = useMemo(() => getSafeOverviewPose(bounds), [bounds])
  const lastPosition = useRef(resetPose.position.clone()); const lastTarget = useRef(resetPose.target.clone())
  const proposed = useRef(new THREE.Vector3()); const resolved = useRef(new THREE.Vector3()); const clampedTarget = useRef(new THREE.Vector3())
  useEffect(() => { lastPosition.current.copy(resetPose.position); lastTarget.current.copy(resetPose.target) }, [resetPose])
  useFrame(() => {
    const orbit = controls.current
    if (mode !== 'overview' || !orbit?.enabled) return
    clampCameraTarget(bounds, orbit.target, clampedTarget.current)
    if (clampedTarget.current.distanceToSquared(orbit.target) > 1e-8) {
      proposed.current.copy(camera.position).add(clampedTarget.current).sub(orbit.target)
      orbit.target.copy(clampedTarget.current); resolveCameraPosition(bounds, lastPosition.current, proposed.current, resolved.current); camera.position.copy(resolved.current)
    }
    const offset = proposed.current.copy(camera.position).sub(orbit.target)
    if (offset.length() > bounds.maxDistance) camera.position.copy(orbit.target).add(offset.setLength(bounds.maxDistance))
    if (!isValidOverviewPosition(bounds, camera.position)) {
      resolveCameraPosition(bounds, lastPosition.current, camera.position, resolved.current)
      camera.position.copy(resolved.current); orbit.target.copy(clampCameraTarget(bounds, orbit.target, clampedTarget.current)); orbit.update()
    }
    if (isValidOverviewPosition(bounds, camera.position)) { lastPosition.current.copy(camera.position); lastTarget.current.copy(orbit.target) }
    else { camera.position.copy(lastPosition.current); orbit.target.copy(lastTarget.current); orbit.update() }
  })
  return null
}

function CinematicScreen({ layout }: { layout: GeneratedAuditoriumLayout }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 520
    const context = canvas.getContext('2d')!; const sky = context.createLinearGradient(0, 0, 0, canvas.height)
    sky.addColorStop(0, '#070a1c'); sky.addColorStop(.55, '#38224b'); sky.addColorStop(1, '#d35b42'); context.fillStyle = sky; context.fillRect(0, 0, canvas.width, canvas.height)
    const sun = context.createRadialGradient(850, 235, 4, 850, 235, 145); sun.addColorStop(0, 'rgba(255,235,190,.95)'); sun.addColorStop(.35, 'rgba(255,120,90,.45)'); sun.addColorStop(1, 'rgba(255,80,80,0)'); context.fillStyle = sun; context.fillRect(0, 0, canvas.width, canvas.height)
    for (let index = 0; index < 90; index += 1) { const x = (index * 137) % canvas.width; const y = (index * 61) % 230; context.beginPath(); context.arc(x, y, index % 5 === 0 ? 1.8 : .8, 0, Math.PI * 2); context.fillStyle = 'rgba(255,255,255,.75)'; context.fill() }
    context.fillStyle = '#080f20'; context.beginPath(); context.moveTo(0, 430); context.lineTo(180, 330); context.lineTo(330, 410); context.lineTo(520, 300); context.lineTo(720, 405); context.lineTo(950, 315); context.lineTo(1200, 420); context.lineTo(1200, 520); context.lineTo(0, 520); context.fill()
    context.fillStyle = '#eaf2ff'; context.font = '700 68px Inter, sans-serif'; context.fillText('STELLAR DRIFT', 72, 135); context.fillStyle = '#38bdf8'; context.font = '500 20px Inter, sans-serif'; context.fillText('A CINEVERSE ORIGINAL · DEMONSTRATION PREVIEW', 76, 176)
    const result = new THREE.CanvasTexture(canvas); result.colorSpace = THREE.SRGBColorSpace; result.anisotropy = 4; return result
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  const { screen } = layout.config
  return <group><mesh position={[0, screen.y, screen.z - .12]}><boxGeometry args={[screen.width + .55, screen.height + .55, .24]} /><meshStandardMaterial color="#090a0e" metalness={.6} roughness={.3} /></mesh><mesh position={[0, screen.y, screen.z]}><planeGeometry args={[screen.width, screen.height]} /><meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} /></mesh></group>
}

function TierArchitecture({ layout }: { layout: GeneratedAuditoriumLayout }) {
  const platforms = useRef<THREE.InstancedMesh>(null)
  const aisles = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    layout.platforms.forEach((platform, index) => { object.position.set(platform.x, platform.y, platform.z); object.rotation.set(0, platform.rotation, 0); object.scale.set(platform.width, .36, platform.depth); object.updateMatrix(); platforms.current?.setMatrixAt(index, object.matrix) })
    layout.aisleSteps.forEach((step, index) => { object.position.set(step.x, step.y, step.z); object.rotation.set(0, step.rotation, 0); object.scale.set(step.width, .08, step.depth); object.updateMatrix(); aisles.current?.setMatrixAt(index, object.matrix) })
    if (platforms.current) platforms.current.instanceMatrix.needsUpdate = true
    if (aisles.current) aisles.current.instanceMatrix.needsUpdate = true
  }, [layout])
  return <><instancedMesh ref={platforms} args={[undefined, undefined, layout.platforms.length]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#101a2d" /></instancedMesh><instancedMesh ref={aisles} args={[undefined, undefined, layout.aisleSteps.length]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#10284a" emissive="#2563eb" emissiveIntensity={.35} /></instancedMesh></>
}

function Room({ layout, interactive, selectedSeatId, onSeatSelect, reclineAngle }: { layout: GeneratedAuditoriumLayout; interactive: boolean; selectedSeatId?: string | null; onSeatSelect?: (seat: Seat) => void; reclineAngle: number }) {
  const resources = useMemo<SeatResources>(() => {
    const base = new THREE.BoxGeometry(.78, .25, .78); const back = new THREE.BoxGeometry(.8, .95, .18); const arm = new THREE.BoxGeometry(.16, .16, .78)
    const material = (color: string, metalness = .08) => new THREE.MeshStandardMaterial({ color, roughness: .58, metalness })
    return { base, back, arm, materials: { standard: material('#173d7a'), premium: material('#1d4ed8', .15), vip: material('#0e7490', .32), selected: material('#2563eb', .2), held: material('#38bdf8', .2), booked: material('#334155'), disabled: material('#111827'), arm: material(layout.config.style === 'luxury' ? '#1e3a5f' : '#172744', .35) } }
  }, [layout.config.style])
  useEffect(() => () => { resources.base.dispose(); resources.back.dispose(); resources.arm.dispose(); Object.values(resources.materials).forEach(material => material.dispose()) }, [resources])
  const wallColor = layout.config.style === 'luxury' ? '#0e1d35' : layout.config.style === 'boutique' ? '#101d36' : '#111d35'
  return <>
  <ambientLight intensity={.52} /><hemisphereLight color="#b9d7ff" groundColor="#07101f" intensity={.48} /><spotLight position={[0, 10, layout.config.screen.z + 2]} intensity={72} angle={1.15} penumbra={.95} color="#dbeafe" /><pointLight position={[0, layout.config.screen.y, layout.config.screen.z + 1]} color="#b9d7ff" intensity={9} distance={18} /><pointLight position={[-7, .45, 6]} color="#2563eb" intensity={11} distance={16} /><pointLight position={[8, .45, 6]} color="#38bdf8" intensity={11} distance={16} />
  <mesh position={[0, 2.5, layout.config.screen.z - .25]}><boxGeometry args={[layout.config.screen.width + 4, 7, .3]} /><meshStandardMaterial color="#0b1324" /></mesh><CinematicScreen layout={layout} /><Text position={[0, layout.config.screen.y + layout.config.screen.height / 2 + .55, layout.config.screen.z + .05]} fontSize={.28} color="#38bdf8">CINEVERSE · {layout.config.name.toUpperCase()}</Text>
  <mesh position={[0, -.2, layout.depth / 2 + layout.config.screen.z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[layout.width + 5, layout.depth + 8]} /><meshStandardMaterial color="#0b1424" roughness={.78} metalness={.08} /></mesh>
  <TierArchitecture layout={layout} />
  {layout.seats.map(seat => <CinemaSeat key={seat.id} seat={seat} resources={resources} scale={layout.config.seatScale} interactive={interactive} selectedSeatId={selectedSeatId} onSeatSelect={onSeatSelect} reclineAngle={reclineAngle} />)}
  <mesh position={[-layout.width / 2, 4, layout.depth / 2 + layout.config.screen.z]}><boxGeometry args={[.3, 8, layout.depth + 6]} /><meshStandardMaterial color={wallColor} /></mesh><mesh position={[layout.width / 2, 4, layout.depth / 2 + layout.config.screen.z]}><boxGeometry args={[.3, 8, layout.depth + 6]} /><meshStandardMaterial color={wallColor} /></mesh>
  </> }

export function AuditoriumScene({ layout, mode, focusedSeat, interactive = true, selectedSeatId, onSeatSelect, seatView = DEFAULT_SEAT_VIEW, showSightline = false, resetViewVersion = 0 }: { layout: GeneratedAuditoriumLayout; mode: CameraMode; focusedSeat: Seat | null; interactive?: boolean; selectedSeatId?: string | null; onSeatSelect?: (seat: Seat) => void; seatView?: SeatViewCalibration; showSightline?: boolean; resetViewVersion?: number }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const screenCenter = useMemo(() => new THREE.Vector3(0, layout.config.screen.y, layout.config.screen.z), [layout.config.screen.y, layout.config.screen.z])
  const safetyBounds = useMemo(() => createCameraSafetyBounds(layout), [layout])
  const overview = useMemo(() => getSafeOverviewPose(safetyBounds), [safetyBounds])
  return <Canvas camera={{ position: overview.position, fov: 48 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}><color attach="background" args={['#080f20']} /><fog attach="fog" args={['#080f20', layout.depth * .7, layout.depth * 1.8]} /><Suspense fallback={<Html center><span className="text-sm text-white">Preparing auditorium…</span></Html>}><Room layout={layout} interactive={interactive} selectedSeatId={selectedSeatId} onSeatSelect={onSeatSelect} reclineAngle={seatView.reclineAngle} /><SightlineVisualization seat={focusedSeat} screenCenter={screenCenter} seatView={seatView} mode={mode} enabled={showSightline} /></Suspense><CameraController key={layout.config.revision} mode={mode} seat={focusedSeat} screenCenter={screenCenter} overviewTarget={overview.target} overviewPosition={overview.position} controls={controls} seatView={seatView} resetVersion={resetViewVersion} /><CameraSafetyController mode={mode} bounds={safetyBounds} controls={controls} /><OrbitControls ref={controls} enablePan enableDamping dampingFactor={.08} minDistance={ORBIT_LIMITS.minDistance} maxDistance={safetyBounds.maxDistance} minPolarAngle={ORBIT_LIMITS.minPolarAngle} maxPolarAngle={ORBIT_LIMITS.maxPolarAngle} screenSpacePanning={false} target={overview.target} /></Canvas>
}
