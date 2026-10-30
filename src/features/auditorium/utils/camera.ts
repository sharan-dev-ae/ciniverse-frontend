import * as THREE from 'three'
import type { Seat } from '../../../types/domain'

export type CameraMode = 'overview' | 'seat-focus' | 'seat-view'

export const SCREEN_CENTER = new THREE.Vector3(0, 2.5, -6.65)
export const OVERVIEW_TARGET = new THREE.Vector3(0, 2, 6)
export const ROW_RISE = 0.18
export const PLATFORM_HALF_HEIGHT = 0.175
export const SEATED_EYE_HEIGHT = 1.28

export function getSeatRowIndex(seat: Pick<Seat, 'row'>) {
  return Math.max(0, seat.row.toUpperCase().charCodeAt(0) - 65)
}

export function getPlatformTop(seat: Pick<Seat, 'row'>) {
  return getSeatRowIndex(seat) * ROW_RISE + PLATFORM_HALF_HEIGHT
}

export function getSeatWorldPosition(seat: Pick<Seat, 'row' | 'x' | 'z' | 'category'>, target = new THREE.Vector3()) {
  const scaledBaseInset = seat.category === 'vip' ? 0.14 : 0.125
  return target.set(seat.x, getPlatformTop(seat) - scaledBaseInset, seat.z)
}

export function getSeatEyePosition(seat: Pick<Seat, 'row' | 'x' | 'z' | 'category'>, target = new THREE.Vector3()) {
  getSeatWorldPosition(seat, target)
  target.y += SEATED_EYE_HEIGHT
  target.z += 0.16
  return target
}

export function getSeatFocusPosition(seat: Pick<Seat, 'row' | 'x' | 'z' | 'category'>, target = new THREE.Vector3()) {
  getSeatWorldPosition(seat, target)
  target.x += seat.x >= 0 ? 2.6 : -2.6
  target.y += 2.25
  target.z += 3.6
  return target
}

export function getLookAtQuaternion(position: THREE.Vector3, lookAt: THREE.Vector3, target = new THREE.Quaternion()) {
  const matrix = new THREE.Matrix4().lookAt(position, lookAt, THREE.Object3D.DEFAULT_UP)
  return target.setFromRotationMatrix(matrix)
}

export function getSeatViewPose(seat: Pick<Seat, 'row' | 'x' | 'z' | 'category'>) {
  const position = getSeatEyePosition(seat)
  return { position, quaternion: getLookAtQuaternion(position, SCREEN_CENTER) }
}

export function getSeatFocusPose(seat: Pick<Seat, 'row' | 'x' | 'z' | 'category'>) {
  const position = getSeatFocusPosition(seat)
  const seatPosition = getSeatWorldPosition(seat)
  seatPosition.y += 0.55
  return { position, quaternion: getLookAtQuaternion(position, seatPosition) }
}

export function getModePose(mode: CameraMode, seat: Pick<Seat, 'row' | 'x' | 'z' | 'category'> | null) {
  if (mode === 'overview' || !seat) return null
  return mode === 'seat-view' ? getSeatViewPose(seat) : getSeatFocusPose(seat)
}
