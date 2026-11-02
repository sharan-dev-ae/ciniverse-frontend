import * as THREE from 'three'
import type { Seat } from '../../../types/domain'

export type CameraMode = 'overview' | 'seat-focus' | 'seat-view'
export type HeadMode = 'direct-screen' | 'natural'
export interface SeatViewCalibration { eyeHeight: number; eyeForward: number; panTranslation: number; reclineAngle: number; headMode: HeadMode }

export const SCREEN_CENTER = new THREE.Vector3(0, 2.5, -6.65)
export const OVERVIEW_TARGET = new THREE.Vector3(0, 2, 6)
export const ROW_RISE = 0.18
export const PLATFORM_HALF_HEIGHT = 0.175
export const SEATED_EYE_HEIGHT = 1.28
export const DEFAULT_SEAT_VIEW: SeatViewCalibration = { eyeHeight: SEATED_EYE_HEIGHT, eyeForward: .16, panTranslation: 0, reclineAngle: 0, headMode: 'direct-screen' }

export function getSeatRowIndex(seat: Pick<Seat, 'row'>) {
  return Math.max(0, seat.row.toUpperCase().charCodeAt(0) - 65)
}

export function getPlatformTop(seat: Pick<Seat, 'row'>) {
  return getSeatRowIndex(seat) * ROW_RISE + PLATFORM_HALF_HEIGHT
}

type CameraSeat = Pick<Seat, 'row' | 'x' | 'y' | 'z' | 'rotation' | 'category'>

export function getSeatWorldPosition(seat: CameraSeat, target = new THREE.Vector3()) {
  const scaledBaseInset = seat.category === 'vip' ? 0.14 : 0.125
  return target.set(seat.x, seat.y - scaledBaseInset, seat.z)
}

export function getSeatEyePosition(seat: CameraSeat, target = new THREE.Vector3(), calibration: SeatViewCalibration = DEFAULT_SEAT_VIEW) {
  getSeatWorldPosition(seat, target)
  const recline = THREE.MathUtils.degToRad(calibration.reclineAngle)
  const forward = calibration.eyeForward - calibration.panTranslation + Math.sin(recline) * .12
  target.y += calibration.eyeHeight - (1 - Math.cos(recline)) * .22
  target.x += -Math.sin(seat.rotation) * forward
  target.z += -Math.cos(seat.rotation) * forward
  return target
}

export function getSeatFocusPosition(seat: CameraSeat, target = new THREE.Vector3()) {
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

export function getSeatViewPose(seat: CameraSeat, screenCenter = SCREEN_CENTER, calibration: SeatViewCalibration = DEFAULT_SEAT_VIEW) {
  const position = getSeatEyePosition(seat, new THREE.Vector3(), calibration)
  if (calibration.headMode === 'direct-screen') return { position, quaternion: getLookAtQuaternion(position, screenCenter) }
  const recline = THREE.MathUtils.degToRad(calibration.reclineAngle)
  const forward = new THREE.Vector3(-Math.sin(seat.rotation), Math.sin(recline) * .45, -Math.cos(seat.rotation)).normalize()
  return { position, quaternion: getLookAtQuaternion(position, position.clone().add(forward)) }
}

export function getSeatFocusPose(seat: CameraSeat) {
  const position = getSeatFocusPosition(seat)
  const seatPosition = getSeatWorldPosition(seat)
  seatPosition.y += 0.55
  return { position, quaternion: getLookAtQuaternion(position, seatPosition) }
}

export function getModePose(mode: CameraMode, seat: CameraSeat | null, screenCenter = SCREEN_CENTER, calibration: SeatViewCalibration = DEFAULT_SEAT_VIEW) {
  if (mode === 'overview' || !seat) return null
  return mode === 'seat-view' ? getSeatViewPose(seat, screenCenter, calibration) : getSeatFocusPose(seat)
}
