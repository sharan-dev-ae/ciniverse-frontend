import * as THREE from 'three'
import type { Seat } from '../../../types/domain'
import { getSeatEyePosition, type CameraMode, type SeatViewCalibration } from './camera'

/**
 * World convention: +X is screen-right, +Y is up, and a zero-rotation seat
 * faces -Z. Horizontal angle is signed toward the seat's local right; vertical
 * angle is signed upward from the horizontal plane. Distances are meters.
 */
export interface SightlineMeasurement {
  origin: THREE.Vector3
  target: THREE.Vector3
  distance: number
  horizontalAngle: number
  verticalAngle: number
}

export interface ViewingBeamData {
  surfacePositions: Float32Array
  edgePositions: Float32Array
}

type SightlineSeat = Pick<Seat, 'row' | 'x' | 'y' | 'z' | 'rotation' | 'category'>

export function calculateSightline(seat: SightlineSeat, screenCenter: THREE.Vector3, calibration: SeatViewCalibration): SightlineMeasurement {
  const origin = getSeatEyePosition(seat, new THREE.Vector3(), calibration)
  const target = screenCenter.clone()
  const delta = target.clone().sub(origin)
  const forward = new THREE.Vector3(-Math.sin(seat.rotation), 0, -Math.cos(seat.rotation))
  const right = new THREE.Vector3(Math.cos(seat.rotation), 0, -Math.sin(seat.rotation))
  const horizontal = new THREE.Vector3(delta.x, 0, delta.z)
  return {
    origin,
    target,
    distance: delta.length(),
    horizontalAngle: THREE.MathUtils.radToDeg(Math.atan2(horizontal.dot(right), horizontal.dot(forward))),
    verticalAngle: THREE.MathUtils.radToDeg(Math.atan2(delta.y, horizontal.length())),
  }
}

/**
 * Returns the screen boundary clockwise when viewed from the auditorium.
 * Supplying more than four points (for example, samples along a curved screen)
 * is supported by createViewingBeamData without changing the beam renderer.
 */
export function getFlatScreenBoundary(center: THREE.Vector3, width: number, height: number) {
  const halfWidth = width / 2
  const halfHeight = height / 2
  return [
    new THREE.Vector3(center.x - halfWidth, center.y + halfHeight, center.z),
    new THREE.Vector3(center.x + halfWidth, center.y + halfHeight, center.z),
    new THREE.Vector3(center.x + halfWidth, center.y - halfHeight, center.z),
    new THREE.Vector3(center.x - halfWidth, center.y - halfHeight, center.z),
  ]
}

export function createViewingBeamData(origin: THREE.Vector3, screenBoundary: readonly THREE.Vector3[]): ViewingBeamData {
  if (screenBoundary.length < 3) throw new Error('A viewing beam requires at least three screen-boundary points.')

  const surfacePositions = new Float32Array(screenBoundary.length * 9)
  const edgePositions = new Float32Array(screenBoundary.length * 12)
  screenBoundary.forEach((point, index) => {
    const next = screenBoundary[(index + 1) % screenBoundary.length]
    surfacePositions.set([origin.x, origin.y, origin.z, point.x, point.y, point.z, next.x, next.y, next.z], index * 9)
    edgePositions.set([origin.x, origin.y, origin.z, point.x, point.y, point.z, point.x, point.y, point.z, next.x, next.y, next.z], index * 12)
  })
  return { surfacePositions, edgePositions }
}

export function getSightlineVisibility(enabled: boolean, hasSeat: boolean, mode: CameraMode) {
  return { visible: enabled && hasSeat, showBeam: enabled && hasSeat && mode !== 'seat-view', showCenterline: enabled && hasSeat && mode === 'seat-view', showEyeMarker: enabled && hasSeat && mode !== 'seat-view', showScreenMarker: enabled && hasSeat }
}
