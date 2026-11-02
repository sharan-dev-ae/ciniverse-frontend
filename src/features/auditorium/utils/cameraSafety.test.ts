import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { generatePresetLayout, PRESET_ORDER } from './layoutEngine'
import { clampCameraTarget, collidesWithSeat, createCameraSafetyBounds, getFloorHeight, getSafeOverviewPose, isValidOverviewPosition, ORBIT_LIMITS, resolveCameraPosition } from './cameraSafety'

describe('orbit limits', () => {
  it('prevents below-floor rotation and keeps a useful upper orbit', () => {
    expect(ORBIT_LIMITS.minPolarAngle).toBeGreaterThan(0)
    expect(ORBIT_LIMITS.maxPolarAngle).toBeLessThan(Math.PI / 2)
    expect(ORBIT_LIMITS.minDistance).toBeLessThan(3)
  })
})

describe.each(PRESET_ORDER)('%s camera bounds', preset => {
  const layout = generatePresetLayout(preset); const bounds = createCameraSafetyBounds(layout)
  it('creates a valid computed reset view', () => expect(isValidOverviewPosition(bounds, getSafeOverviewPose(bounds).position)).toBe(true))
  it('keeps panning targets inside rendered room bounds', () => {
    const target = clampCameraTarget(bounds, new THREE.Vector3(999, -50, -999))
    expect(target.x).toBeLessThan(bounds.maxX); expect(target.y).toBeGreaterThanOrEqual(bounds.targetMinY); expect(target.z).toBeGreaterThan(bounds.minZ)
  })
  it('enforces tier-aware floor clearance', () => {
    const back = layout.seats.at(-1)!; const point = new THREE.Vector3(back.x, back.y + .1, back.z)
    expect(getFloorHeight(bounds, point)).toBeGreaterThanOrEqual(back.y - .01)
    expect(isValidOverviewPosition(bounds, point)).toBe(false)
  })
})

describe('collision and recovery', () => {
  const layout = generatePresetLayout('grand'); const bounds = createCameraSafetyBounds(layout); const reset = getSafeOverviewPose(bounds)
  it('detects a camera inside curved-row seat geometry', () => expect(collidesWithSeat(bounds, new THREE.Vector3(layout.seats[40].x, layout.seats[40].y + .7, layout.seats[40].z))).toBe(true))
  it('stops zoom at the last valid point instead of entering a seat', () => {
    const seat = layout.seats[40]; const invalid = new THREE.Vector3(seat.x, seat.y + .7, seat.z); const resolved = resolveCameraPosition(bounds, reset.position, invalid)
    expect(isValidOverviewPosition(bounds, resolved)).toBe(true); expect(resolved.distanceTo(invalid)).toBeGreaterThan(0)
  })
  it('recovers non-finite camera states to the last valid position', () => {
    expect(resolveCameraPosition(bounds, reset.position, new THREE.Vector3(NaN, 0, 0)).equals(reset.position)).toBe(true)
  })
})
