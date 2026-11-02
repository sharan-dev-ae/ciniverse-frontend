import { useGLTF } from '@react-three/drei'
import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Seat } from '../../../types/domain'
import { useBookingStore } from '../../../stores/bookingStore'
import { CLASSIC_RED_THEME } from '../utils/auditoriumTheme'

export const CINEMA_CHAIR_ASSET = '/models/cineverse_classic_red_cinema_chair.glb'
export const CINEMA_CHAIR_SOURCE_TRIANGLES = 8644
export const CINEMA_CHAIR_SCALE = .9

export const CINEMA_CHAIR_GROUPS = {
  staticUpholstery: ['seat_center','seat_bolster_left','seat_bolster_right','seat_front_roll','arm_pad_left','arm_pad_right'],
  staticFrame: ['foot_L','pedestal_L','arm_support_L','foot_R','pedestal_R','arm_support_R','seat_chassis','arm_frame_left','arm_frame_right','cup_recess_left','cup_recess_right'],
  staticDetail: ['cup_rim_left','cup_rim_right','seat_front_seam_0','seat_front_seam_1','seat_front_seam_2','seat_front_seam_3','seat_number_plate'],
  backUpholstery: ['back_main','back_left_bolster','back_right_bolster','lumbar_cushion','headrest','headrest_center'],
  backFrame: ['back_frame','rear_shell'],
  backDetail: ['back_stitch_-0.235_0','back_stitch_-0.235_1','back_stitch_-0.235_2','back_stitch_0.235_0','back_stitch_0.235_1','back_stitch_0.235_2'],
} as const

export interface RealisticSeatProps { seat: Seat; interactive?: boolean; selectedSeatId?: string | null; onSeatSelect?: (seat: Seat) => void; reclineAngle?: number; positionOverride?: [number,number,number]; rotationOverride?: number; forceSelected?: boolean }

function mergedParts(scene: THREE.Object3D, names: readonly string[]) {
  scene.updateMatrixWorld(true)
  const geometries = names.map(name => {
    const object = scene.getObjectByName(name) as THREE.Mesh | undefined
    if (!object?.geometry) throw new Error(`Cinema chair part "${name}" is missing.`)
    const geometry = object.geometry.clone(); geometry.applyMatrix4(object.matrixWorld); geometry.deleteAttribute('color'); geometry.computeVertexNormals(); return geometry
  })
  const merged = mergeGeometries(geometries, false); geometries.forEach(geometry => geometry.dispose())
  if (!merged) throw new Error(`Unable to merge cinema chair parts: ${names.join(', ')}`)
  merged.computeBoundingSphere(); return merged
}

export function RealisticCinemaSeat({ seat, interactive=true, selectedSeatId, onSeatSelect, reclineAngle=0, positionOverride, rotationOverride, forceSelected=false }: RealisticSeatProps) {
  const gltf = useGLTF(CINEMA_CHAIR_ASSET)
  const storeSelected = useBookingStore(state => state.selectedSeats.some(item => item.id === seat.id)); const toggle = useBookingStore(state => state.toggleSeat)
  const selected = forceSelected || (selectedSeatId ? selectedSeatId === seat.id : storeSelected); const [hovered,setHovered] = useState(false)
  const geometries = useMemo(() => Object.fromEntries(Object.entries(CINEMA_CHAIR_GROUPS).map(([key,names]) => [key,mergedParts(gltf.scene,names)])) as Record<keyof typeof CINEMA_CHAIR_GROUPS,THREE.BufferGeometry>,[gltf.scene])
  const materials = useMemo(() => {
    const upholsteryColor = selected ? '#2563EB' : seat.status === 'held' ? CLASSIC_RED_THEME.amber : seat.status === 'booked' ? '#3A3032' : seat.status === 'disabled' ? '#171113' : seat.category === 'premium' ? CLASSIC_RED_THEME.seats.premium : seat.category === 'vip' ? CLASSIC_RED_THEME.seats.vip : CLASSIC_RED_THEME.seats.standard
    return { upholstery:new THREE.MeshStandardMaterial({color:upholsteryColor,roughness:.68,metalness:.04}), frame:new THREE.MeshStandardMaterial({color:CLASSIC_RED_THEME.frame,roughness:.48,metalness:.32}), detail:new THREE.MeshStandardMaterial({color:'#B7791F',roughness:.4,metalness:.5}) }
  },[seat.category,seat.status,selected])
  useEffect(()=>()=>{Object.values(geometries).forEach(geometry=>geometry.dispose())},[geometries])
  useEffect(()=>()=>{Object.values(materials).forEach(material=>material.dispose())},[materials])
  const position: [number,number,number] = positionOverride ?? [seat.x,seat.y,seat.z]; const hinge:[number,number,number]=[0,.62,.36]
  return <group position={position} rotation={[0,rotationOverride??seat.rotation,0]} scale={CINEMA_CHAIR_SCALE}
    onPointerOver={event=>{event.stopPropagation();setHovered(true);document.body.style.cursor=interactive&&seat.status==='available'?'pointer':'default'}} onPointerOut={()=>{setHovered(false);document.body.style.cursor='auto'}}
    onClick={event=>{event.stopPropagation();if(onSeatSelect)onSeatSelect(seat);else if(interactive&&seat.status==='available')toggle(seat)}}>
    <mesh geometry={geometries.staticUpholstery} material={materials.upholstery}/><mesh geometry={geometries.staticFrame} material={materials.frame}/><mesh geometry={geometries.staticDetail} material={materials.detail}/>
    <group position={hinge} rotation={[-THREE.MathUtils.degToRad(selected?reclineAngle:0),0,0]}><group position={hinge.map(value=>-value) as [number,number,number]}><mesh geometry={geometries.backUpholstery} material={materials.upholstery}/><mesh geometry={geometries.backFrame} material={materials.frame}/><mesh geometry={geometries.backDetail} material={materials.detail}/></group></group>
    {hovered&&<mesh position={[0,1.95,0]} raycast={()=>undefined}><sphereGeometry args={[.035,8,8]}/><meshBasicMaterial color="#F59E0B"/></mesh>}
  </group>
}

useGLTF.preload(CINEMA_CHAIR_ASSET)
