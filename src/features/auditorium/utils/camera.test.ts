import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { generateSeats } from './layout'
import { getModePose, getPlatformTop, getSeatEyePosition, getSeatViewPose, getSeatWorldPosition, SCREEN_CENTER, SEATED_EYE_HEIGHT } from './camera'

const seats = generateSeats()
const seat = (id: string) => seats.find(item => item.id === id)!

describe('seat world coordinates', () => {
  it('places every seat on its row platform and derives eye height from that origin', () => {
    const f12 = seat('F12')
    const world = getSeatWorldPosition(f12)
    const eye = getSeatEyePosition(f12)
    expect(world.x).toBe(f12.x)
    expect(world.z).toBe(f12.z)
    expect(world.y).toBeCloseTo(getPlatformTop(f12) - .125)
    expect(eye.y - world.y).toBeCloseTo(SEATED_EYE_HEIGHT)
    expect(eye.z).toBeCloseTo(f12.z - .16)
  })

  it('raises back-row eye positions above middle and front rows', () => {
    const front = getSeatEyePosition(seat('A2'))
    const middle = getSeatEyePosition(seat('F12'))
    const back = getSeatEyePosition(seat('J10'))
    expect(middle.y).toBeGreaterThan(front.y)
    expect(back.y).toBeGreaterThan(middle.y)
    expect(back.z).toBeGreaterThan(middle.z)
  })
})

describe('screen-facing orientation', () => {
  it.each(['A2', 'F12', 'J10'])('faces the real screen center from %s', id => {
    const pose = getSeatViewPose(seat(id))
    const expectedDirection = SCREEN_CENTER.clone().sub(pose.position).normalize()
    const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(pose.quaternion).normalize()
    expect(cameraForward.dot(expectedDirection)).toBeGreaterThan(.9999)
    expect(Math.abs(cameraForward.y)).toBeLessThan(.25)
  })

  it('keeps side-seat parallax instead of recentering the camera', () => {
    const left = getSeatViewPose(seat('F2'))
    const right = getSeatViewPose(seat('F12'))
    expect(left.position.x).toBeLessThan(0)
    expect(right.position.x).toBeGreaterThan(0)
    expect(left.quaternion.equals(right.quaternion)).toBe(false)
  })
})

describe('camera modes', () => {
  it('maps focus and first-person modes to different physical poses', () => {
    const selected = seat('F12')
    const focus = getModePose('seat-focus', selected)!
    const view = getModePose('seat-view', selected)!
    expect(focus.position.distanceTo(view.position)).toBeGreaterThan(2)
    expect(getModePose('overview', selected)).toBeNull()
  })

  it('does not mutate selected seat data while calculating preview poses', async () => {
    Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }, configurable: true })
    const { useBookingStore } = await import('../../../stores/bookingStore')
    const selected = seat('F12')
    useBookingStore.setState({ selectedSeats: [selected] })
    getSeatViewPose(selected)
    expect(useBookingStore.getState().selectedSeats.map(item => item.id)).toEqual(['F12'])
  })
})
