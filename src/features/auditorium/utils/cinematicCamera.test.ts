import { describe, expect, it } from 'vitest'
import { generatePresetLayout } from './layoutEngine'
import { createCameraSafetyBounds, ORBIT_LIMITS } from './cameraSafety'
import { clampOrbit, dampAngle, stepOrbit, transitionDuration } from './cinematicCamera'

describe('cinematic orbit damping', () => {
  const bounds = createCameraSafetyBounds(generatePresetLayout('grand'))
  it('never overshoots polar or zoom limits', () => {
    const orbit = clampOrbit({ theta: 0, phi: 99, radius: .1 }, bounds)
    expect(orbit.phi).toBe(ORBIT_LIMITS.maxPolarAngle); expect(orbit.radius).toBe(ORBIT_LIMITS.minDistance)
  })
  it('uses the shortest angular path across the wrap boundary', () => {
    expect(Math.abs(dampAngle(Math.PI - .01, -Math.PI + .01, 12, 1 / 60) - (Math.PI - .01))).toBeLessThan(.01)
  })
  it.each([30, 60, 120])('converges consistently at %i FPS', fps => {
    const current = { theta: 0, phi: 1, radius: 20 }; const desired = { theta: 1, phi: .7, radius: 8 }
    for (let frame = 0; frame < fps; frame += 1) stepOrbit(current, desired, bounds, 1 / fps)
    expect(current.theta).toBeCloseTo(1, 4); expect(current.radius).toBeCloseTo(8, 3)
  })
  it('uses bounded cinematic transition durations', () => {
    expect(transitionDuration(0)).toBeGreaterThanOrEqual(.6); expect(transitionDuration(100)).toBeLessThanOrEqual(1.2)
  })
})
