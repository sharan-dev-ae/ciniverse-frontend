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

export function getSightlineVisibility(enabled: boolean, hasSeat: boolean, mode: CameraMode) {
  return { visible: enabled && hasSeat, showBeam: enabled && hasSeat && mode !== 'seat-view', showEyeMarker: enabled && hasSeat && mode !== 'seat-view', showScreenMarker: enabled && hasSeat }
}
