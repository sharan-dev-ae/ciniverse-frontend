import { Html, Text } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Seat } from '../../../types/domain'
import { useBookingStore } from '../../../stores/bookingStore'
import { DEFAULT_SEAT_VIEW, getSeatWorldPosition, type CameraMode, type SeatViewCalibration } from '../utils/camera'
import type { GeneratedAuditoriumLayout } from '../utils/layoutEngine'
import { calculateSightline, createViewingBeamData, getFlatScreenBoundary, getSightlineVisibility } from '../utils/sightline'
import { createCameraSafetyBounds, getSafeOverviewPose } from '../utils/cameraSafety'
import { CinematicCameraController } from './CinematicCameraController'
import { CLASSIC_RED_THEME, createClassicCarpetTexture } from '../utils/auditoriumTheme'
import { RealisticCinemaSeat } from './RealisticCinemaSeat'
import { SeatAssetBoundary } from './SeatAssetBoundary'

export type { CameraMode } from '../utils/camera'
interface SeatResources { base: THREE.BoxGeometry; back: THREE.BoxGeometry; arm: THREE.BoxGeometry; materials: Record<string, THREE.MeshStandardMaterial> }
function CinemaSeat({ seat, resources, scale, interactive, selectedSeatId, onSeatSelect, reclineAngle }: { seat: Seat; resources: SeatResources; scale: number; interactive: boolean; selectedSeatId?: string | null; onSeatSelect?: (seat: Seat) => void; reclineAngle: number }) {
  const bookingSelected = useBookingStore(state => state.selectedSeats.some(item => item.id === seat.id))
  const selected = selectedSeatId ? selectedSeatId === seat.id : bookingSelected
  const toggle = useBookingStore(state => state.toggleSeat)
  const [hovered, setHovered] = useState(false)
  const position = useMemo(() => getSeatWorldPosition(seat), [seat])
  const materialKey = selected ? 'selected' : seat.status === 'available' ? seat.category : seat.status
  const material = resources.materials[materialKey]
  const backMaterial = resources.materials[`${materialKey}Back`] ?? material
  return <group position={position} rotation={[0, seat.rotation, 0]} scale={scale * (seat.category === 'vip' ? 1.12 : 1)}
    onPointerOver={event => { event.stopPropagation(); setHovered(true); document.body.style.cursor = interactive && seat.status === 'available' ? 'pointer' : 'default' }}
    onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
    onClick={event => { event.stopPropagation(); if (onSeatSelect) onSeatSelect(seat); else if (interactive && seat.status === 'available') toggle(seat) }}>
    <mesh geometry={resources.base} material={material} position={[0, .25, .05]} />
    <mesh geometry={resources.back} material={backMaterial} position={[0, .82, .35]} rotation={[-.08 - THREE.MathUtils.degToRad(selected ? reclineAngle : 0), 0, 0]} />
    <mesh geometry={resources.arm} material={resources.materials.arm} position={[-.53, .42, .1]} />
    <mesh geometry={resources.arm} material={resources.materials.arm} position={[.53, .42, .1]} />
    {hovered && <Html center position={[0, 1.55, 0]}><div className="pointer-events-none w-44 rounded-xl border border-white/10 bg-ink/95 p-3 text-xs shadow-2xl"><p className="font-bold text-white">Seat {seat.id}</p><p className="mt-1 capitalize text-muted">Row {seat.row} · {seat.category} · ${seat.price}</p><p className="mt-1 capitalize text-gold">{selected ? 'selected' : seat.status}</p></div></Html>}
  </group>
}

function SightlineVisualization({ seat, screenCenter, screenBoundary, seatView, mode, enabled }: { seat: Seat | null; screenCenter: THREE.Vector3; screenBoundary: readonly THREE.Vector3[]; seatView: SeatViewCalibration; mode: CameraMode; enabled: boolean }) {
  const visibility = getSightlineVisibility(enabled, !!seat, mode)
  const measurement = useMemo(() => seat ? calculateSightline(seat, screenCenter, seatView) : null, [screenCenter, seat, seatView])
  const surfaceGeometry = useMemo(() => new THREE.BufferGeometry(), [])
  const edgeGeometry = useMemo(() => new THREE.BufferGeometry(), [])
  useLayoutEffect(() => {
    if (!measurement) return
    const beam = createViewingBeamData(measurement.origin, screenBoundary)
    surfaceGeometry.setAttribute('position', new THREE.BufferAttribute(beam.surfacePositions, 3))
    edgeGeometry.setAttribute('position', new THREE.BufferAttribute(beam.edgePositions, 3))
    surfaceGeometry.computeBoundingSphere()
    edgeGeometry.computeBoundingSphere()
  }, [edgeGeometry, measurement, screenBoundary, surfaceGeometry])
  useEffect(() => () => { surfaceGeometry.dispose(); edgeGeometry.dispose() }, [edgeGeometry, surfaceGeometry])
  if (!visibility.visible || !measurement) return null
  return <group raycast={() => undefined}>
    {visibility.showBeam && <><mesh geometry={surfaceGeometry} renderOrder={3} raycast={() => undefined}><meshBasicMaterial color="#FACC15" transparent opacity={.075} side={THREE.DoubleSide} depthWrite={false} depthTest blending={THREE.NormalBlending} /></mesh><lineSegments geometry={edgeGeometry} renderOrder={4} raycast={() => undefined}><lineBasicMaterial color="#FACC15" transparent opacity={.48} blending={THREE.AdditiveBlending} depthWrite={false} depthTest /></lineSegments></>}
    {visibility.showEyeMarker && <mesh position={measurement.origin} raycast={() => undefined}><sphereGeometry args={[.085, 12, 12]} /><meshBasicMaterial color="#FACC15" transparent opacity={.9} depthWrite={false} /></mesh>}
    {visibility.showScreenMarker && <mesh position={[measurement.target.x, measurement.target.y, measurement.target.z + .035]} raycast={() => undefined}><ringGeometry args={[.12, .19, 24]} /><meshBasicMaterial color="#FACC15" transparent opacity={.85} side={THREE.DoubleSide} depthWrite={false} /></mesh>}
  </group>
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

function TierArchitecture({ layout, carpet }: { layout: GeneratedAuditoriumLayout; carpet: THREE.Texture }) {
  const platforms = useRef<THREE.InstancedMesh>(null)
  const aisles = useRef<THREE.InstancedMesh>(null)
  useLayoutEffect(() => {
    const object = new THREE.Object3D()
    layout.platforms.forEach((platform, index) => { object.position.set(platform.x, platform.y, platform.z); object.rotation.set(0, platform.rotation, 0); object.scale.set(platform.width, .36, platform.depth); object.updateMatrix(); platforms.current?.setMatrixAt(index, object.matrix) })
    layout.aisleSteps.forEach((step, index) => { object.position.set(step.x, step.y, step.z); object.rotation.set(0, step.rotation, 0); object.scale.set(step.width, .08, step.depth); object.updateMatrix(); aisles.current?.setMatrixAt(index, object.matrix) })
    if (platforms.current) platforms.current.instanceMatrix.needsUpdate = true
    if (aisles.current) aisles.current.instanceMatrix.needsUpdate = true
  }, [layout])
  return <><instancedMesh ref={platforms} args={[undefined, undefined, layout.platforms.length]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial map={carpet} color="#ffffff" roughness={.92} metalness={0} /></instancedMesh><instancedMesh ref={aisles} args={[undefined, undefined, layout.aisleSteps.length]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#4a170d" emissive={CLASSIC_RED_THEME.amber} emissiveIntensity={.58} roughness={.7} /></instancedMesh></>
}

function WallAccents({ layout }: { layout: GeneratedAuditoriumLayout }) {
  const positions = Array.from({ length: 5 }, (_, index) => layout.config.screen.z + 3 + index * Math.max(2.4, (layout.depth - 6) / 4))
  return <>{positions.flatMap((z, index) => [-1, 1].map(side => <mesh key={`${side}-${index}`} position={[side * (layout.width / 2 - .19), 3.6, z]}><boxGeometry args={[.035, 3.8, .09]} /><meshBasicMaterial color={CLASSIC_RED_THEME.amber} transparent opacity={.42} /></mesh>))}</>
}

function Room({ layout, interactive, selectedSeatId, onSeatSelect, reclineAngle }: { layout: GeneratedAuditoriumLayout; interactive: boolean; selectedSeatId?: string | null; onSeatSelect?: (seat: Seat) => void; reclineAngle: number }) {
  const carpet = useMemo(() => createClassicCarpetTexture(layout.width, layout.depth), [layout.depth, layout.width])
  const resources = useMemo<SeatResources>(() => {
    const base = new THREE.BoxGeometry(.78, .25, .78); const back = new THREE.BoxGeometry(.8, .95, .18); const arm = new THREE.BoxGeometry(.16, .16, .78)
    const material = (color: string, metalness = .08) => new THREE.MeshStandardMaterial({ color, roughness: .58, metalness })
    return { base, back, arm, materials: { standard: material(CLASSIC_RED_THEME.seats.standard), standardBack: material('#a51d2b'), premium: material(CLASSIC_RED_THEME.seats.premium, .12), premiumBack: material('#c72b3a', .12), vip: material(CLASSIC_RED_THEME.seats.vip, .18), vipBack: material('#8c1726', .18), selected: material('#2563eb', .2), held: material(CLASSIC_RED_THEME.amber, .16), booked: material('#3a3032'), disabled: material('#171113'), arm: material(CLASSIC_RED_THEME.frame, .24) } }
  }, [layout.config.style])
  useEffect(() => () => { carpet.dispose(); resources.base.dispose(); resources.back.dispose(); resources.arm.dispose(); Object.values(resources.materials).forEach(material => material.dispose()) }, [carpet, resources])
  const wallColor = layout.config.style === 'luxury' ? CLASSIC_RED_THEME.wallLuxury : CLASSIC_RED_THEME.wall
  const prototypeSeatId = useMemo(() => layout.seats.find(seat => seat.rowIndex === 0 && seat.section === 'center')?.id ?? layout.seats[0]?.id, [layout.seats])
  const proceduralSeat = (seat: Seat) => <CinemaSeat seat={seat} resources={resources} scale={layout.config.seatScale} interactive={interactive} selectedSeatId={selectedSeatId} onSeatSelect={onSeatSelect} reclineAngle={reclineAngle} />
  return <>
  <ambientLight intensity={.38} /><hemisphereLight color="#ffe3bd" groundColor="#190305" intensity={.34} /><spotLight position={[0, 10, layout.config.screen.z + 2]} intensity={68} angle={1.15} penumbra={.95} color="#f8e7d0" /><pointLight position={[0, layout.config.screen.y, layout.config.screen.z + 1]} color="#f4e2cd" intensity={8} distance={18} /><pointLight position={[-7, .45, 6]} color={CLASSIC_RED_THEME.amber} intensity={8} distance={15} /><pointLight position={[8, .45, 6]} color={CLASSIC_RED_THEME.amber} intensity={8} distance={15} />
  <mesh position={[0, 2.5, layout.config.screen.z - .25]}><boxGeometry args={[layout.config.screen.width + 4, 7, .3]} /><meshStandardMaterial color="#0b1324" /></mesh><CinematicScreen layout={layout} /><Text position={[0, layout.config.screen.y + layout.config.screen.height / 2 + .55, layout.config.screen.z + .05]} fontSize={.28} color="#38bdf8">CINEVERSE · {layout.config.name.toUpperCase()}</Text>
  <mesh position={[0, -.2, layout.depth / 2 + layout.config.screen.z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[layout.width + 5, layout.depth + 8]} /><meshStandardMaterial map={carpet} color="#ffffff" roughness={.94} metalness={0} /></mesh>
  <TierArchitecture layout={layout} carpet={carpet} />
  {layout.seats.map(seat => seat.id === prototypeSeatId ? <SeatAssetBoundary key={seat.id} fallback={proceduralSeat(seat)}><Suspense fallback={proceduralSeat(seat)}><RealisticCinemaSeat seat={seat} interactive={interactive} selectedSeatId={selectedSeatId} onSeatSelect={onSeatSelect} reclineAngle={reclineAngle}/></Suspense></SeatAssetBoundary> : <CinemaSeat key={seat.id} seat={seat} resources={resources} scale={layout.config.seatScale} interactive={interactive} selectedSeatId={selectedSeatId} onSeatSelect={onSeatSelect} reclineAngle={reclineAngle} />)}
  <mesh position={[-layout.width / 2, 4, layout.depth / 2 + layout.config.screen.z]}><boxGeometry args={[.3, 8, layout.depth + 6]} /><meshStandardMaterial color={wallColor} roughness={.88} /></mesh><mesh position={[layout.width / 2, 4, layout.depth / 2 + layout.config.screen.z]}><boxGeometry args={[.3, 8, layout.depth + 6]} /><meshStandardMaterial color={wallColor} roughness={.88} /></mesh><mesh position={[0, 7.85, layout.depth / 2 + layout.config.screen.z]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[layout.width + .5, layout.depth + 6]} /><meshStandardMaterial color={CLASSIC_RED_THEME.ceiling} roughness={.95} side={THREE.DoubleSide} /></mesh><WallAccents layout={layout} />
  </> }

export function AuditoriumScene({ layout, mode, focusedSeat, interactive = true, selectedSeatId, onSeatSelect, seatView = DEFAULT_SEAT_VIEW, showSightline = false, resetViewVersion = 0 }: { layout: GeneratedAuditoriumLayout; mode: CameraMode; focusedSeat: Seat | null; interactive?: boolean; selectedSeatId?: string | null; onSeatSelect?: (seat: Seat) => void; seatView?: SeatViewCalibration; showSightline?: boolean; resetViewVersion?: number }) {
  const screenCenter = useMemo(() => new THREE.Vector3(0, layout.config.screen.y, layout.config.screen.z), [layout.config.screen.y, layout.config.screen.z])
  const screenBoundary = useMemo(() => getFlatScreenBoundary(screenCenter, layout.config.screen.width, layout.config.screen.height), [layout.config.screen.height, layout.config.screen.width, screenCenter])
  const safetyBounds = useMemo(() => createCameraSafetyBounds(layout), [layout])
  const overview = useMemo(() => getSafeOverviewPose(safetyBounds), [safetyBounds])
  return <Canvas camera={{ position: overview.position, fov: 48 }} dpr={[1, 1.5]} gl={{ antialias: true, powerPreference: 'high-performance' }}><color attach="background" args={['#080f20']} /><fog attach="fog" args={['#080f20', layout.depth * .7, layout.depth * 1.8]} /><Suspense fallback={<Html center><span className="text-sm text-white">Preparing auditorium…</span></Html>}><Room layout={layout} interactive={interactive} selectedSeatId={selectedSeatId} onSeatSelect={onSeatSelect} reclineAngle={seatView.reclineAngle} /><SightlineVisualization seat={focusedSeat} screenCenter={screenCenter} screenBoundary={screenBoundary} seatView={seatView} mode={mode} enabled={showSightline} /></Suspense><CinematicCameraController key={layout.config.revision} mode={mode} seat={focusedSeat} screenCenter={screenCenter} bounds={safetyBounds} seatView={seatView} resetVersion={resetViewVersion} /></Canvas>
}
