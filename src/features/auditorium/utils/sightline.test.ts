import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import type { Seat } from '../../../types/domain'
import { DEFAULT_SEAT_VIEW } from './camera'
import { calculateSightline, createViewingBeamData, getFlatScreenBoundary, getSightlineVisibility } from './sightline'

const seat: Seat = { id:'A1', row:'A', rowIndex:0, number:1, section:'center', sectionIndex:0, category:'standard', status:'available', price:10, x:0, y:.2, z:0, rotation:0 }
const screen = new THREE.Vector3(0, 2.5, -7)

describe('sightline world geometry', () => {
  it('uses the calculated eye and actual screen center as endpoints', () => {
    const result = calculateSightline(seat, screen, DEFAULT_SEAT_VIEW)
    expect(result.target.equals(screen)).toBe(true)
    expect(result.origin.z).toBeCloseTo(-.16)
    expect(result.distance).toBeGreaterThan(6)
  })

  it('updates endpoints when the seat or screen geometry changes', () => {
    const first = calculateSightline(seat, screen, DEFAULT_SEAT_VIEW)
    const second = calculateSightline({ ...seat, x: 3, y: 1 }, new THREE.Vector3(1, 3, -9), DEFAULT_SEAT_VIEW)
    expect(first.origin.equals(second.origin)).toBe(false)
    expect(first.target.equals(second.target)).toBe(false)
  })

  it('moves the eye origin when recline calibration changes', () => {
    const upright = calculateSightline(seat, screen, DEFAULT_SEAT_VIEW)
    const reclined = calculateSightline(seat, screen, { ...DEFAULT_SEAT_VIEW, reclineAngle: 35, panTranslation: .2 })
    expect(upright.origin.distanceTo(reclined.origin)).toBeGreaterThan(.1)
  })
})

describe('geometric viewing beam', () => {
  it('uses the actual four screen corners as its base', () => {
    const boundary = getFlatScreenBoundary(screen, 8, 3.5)
    expect(boundary[0].toArray()).toEqual([-4, 4.25, -7])
    expect(boundary[2].toArray()).toEqual([4, .75, -7])

    const origin = calculateSightline(seat, screen, DEFAULT_SEAT_VIEW).origin
    const beam = createViewingBeamData(origin, boundary)
    expect(beam.surfacePositions).toHaveLength(36)
    expect(beam.edgePositions).toHaveLength(48)
    expect(Array.from(beam.surfacePositions.slice(0, 3))).toEqual(origin.toArray())
  })

  it('supports subdivided boundaries for curved screens', () => {
    const boundary = [...getFlatScreenBoundary(screen, 8, 3.5), new THREE.Vector3(-4.2, 2.5, -6.8)]
    const beam = createViewingBeamData(new THREE.Vector3(), boundary)
    expect(beam.surfacePositions).toHaveLength(boundary.length * 9)
    expect(beam.edgePositions).toHaveLength(boundary.length * 12)
  })

  it('rejects an incomplete screen boundary', () => {
    expect(() => createViewingBeamData(new THREE.Vector3(), [screen, screen])).toThrow(/at least three/)
  })
})

describe('sightline toggle behavior', () => {
  it('removes every visual when disabled or no seat is selected', () => {
    expect(getSightlineVisibility(false, true, 'overview').visible).toBe(false)
    expect(getSightlineVisibility(true, false, 'overview').visible).toBe(false)
  })

  it('keeps the centerline and screen marker in first-person mode', () => {
    expect(getSightlineVisibility(true, true, 'seat-view')).toEqual({ visible:true, showBeam:false, showCenterline:true, showEyeMarker:false, showScreenMarker:true })
  })
})
