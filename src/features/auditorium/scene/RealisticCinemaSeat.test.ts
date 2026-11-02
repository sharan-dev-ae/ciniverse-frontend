import { describe, expect, it } from 'vitest'
import {
  CINEMA_CHAIR_GROUPS,
  CINEMA_CHAIR_SCALE,
  CINEMA_CHAIR_SOURCE_TRIANGLES,
} from './RealisticCinemaSeat'

describe('realistic cinema chair asset contract', () => {
  it('maps every source mesh to one semantic render group', () => {
    const parts = Object.values(CINEMA_CHAIR_GROUPS).flat()

    expect(Object.keys(CINEMA_CHAIR_GROUPS)).toHaveLength(6)
    expect(parts).toHaveLength(38)
    expect(new Set(parts).size).toBe(parts.length)
  })

  it('keeps the audited normalization metadata stable', () => {
    expect(CINEMA_CHAIR_SOURCE_TRIANGLES).toBe(8_644)
    expect(CINEMA_CHAIR_SCALE).toBeCloseTo(0.9)
  })
})
