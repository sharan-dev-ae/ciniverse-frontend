import { describe, expect, it } from 'vitest'
import { carpetRepeat, CLASSIC_RED_THEME } from './auditoriumTheme'

describe('classic red auditorium theme', () => {
  it('uses the approved carpet and amber reference colors', () => {
    expect(CLASSIC_RED_THEME.carpet).toBe('#7A0E0E'); expect(CLASSIC_RED_THEME.amber).toBe('#F59E0B')
  })
  it('keeps the procedural pattern consistently scaled across presets', () => {
    const small = carpetRepeat(12, 18); const grand = carpetRepeat(30, 34)
    expect(small.x).toBeGreaterThanOrEqual(6); expect(grand.x).toBeGreaterThan(small.x); expect(grand.y).toBeGreaterThan(small.y)
  })
})
