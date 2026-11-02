import * as THREE from 'three'
import { ORBIT_LIMITS, type CameraSafetyBounds } from './cameraSafety'

export interface OrbitCoordinates { theta: number; phi: number; radius: number }

export const dampingAlpha = (lambda: number, delta: number) => 1 - Math.exp(-lambda * Math.min(Math.max(delta, 0), .1))
export const dampScalar = (current: number, desired: number, lambda: number, delta: number) => THREE.MathUtils.lerp(current, desired, dampingAlpha(lambda, delta))
export function shortestAngleDelta(current: number, desired: number) { return THREE.MathUtils.euclideanModulo(desired - current + Math.PI, Math.PI * 2) - Math.PI }
export const dampAngle = (current: number, desired: number, lambda: number, delta: number) => current + shortestAngleDelta(current, desired) * dampingAlpha(lambda, delta)

export function clampOrbit(coordinates: OrbitCoordinates, bounds: CameraSafetyBounds): OrbitCoordinates {
  coordinates.phi = THREE.MathUtils.clamp(coordinates.phi, ORBIT_LIMITS.minPolarAngle, ORBIT_LIMITS.maxPolarAngle)
  coordinates.radius = THREE.MathUtils.clamp(coordinates.radius, ORBIT_LIMITS.minDistance, bounds.maxDistance)
  return coordinates
}

export function stepOrbit(current: OrbitCoordinates, desired: OrbitCoordinates, bounds: CameraSafetyBounds, delta: number) {
  clampOrbit(desired, bounds)
  current.theta = dampAngle(current.theta, desired.theta, 11, delta)
  current.phi = dampScalar(current.phi, desired.phi, 12, delta)
  current.radius = dampScalar(current.radius, desired.radius, 13, delta)
  return clampOrbit(current, bounds)
}

export const transitionDuration = (distance: number) => THREE.MathUtils.clamp(.62 + distance * .018, .62, 1.12)
export const smoothStep = (progress: number) => { const value = THREE.MathUtils.clamp(progress, 0, 1); return value * value * (3 - 2 * value) }
