import { describe, expect, it } from 'vitest'
import { getAuditoriumPreset } from '../../auditorium/utils/layoutEngine'
import type { StudioProject } from './types'
import { validateStudio } from './validation'

function project(): StudioProject {
  const now = '2026-11-02T00:00:00.000Z'
  return { id: 'test', versionId: 'test-v1', version: 1, status: 'draft', createdAt: now, updatedAt: now, config: getAuditoriumPreset('classic'), room: { width: 30, depth: 28, height: 8, distanceToFirstRow: 7.5 }, seatModelId: 'standard', references: [] }
}

describe('studio validation', () => {
  it('accepts the classic physical specification', () => {
    expect(validateStudio(project()).blocking).toEqual([])
  })

  it('blocks layouts that exceed room geometry', () => {
    const value = project(); value.room.width = 10; value.room.depth = 12
    expect(validateStudio(value).blocking).toEqual(expect.arrayContaining([expect.stringContaining('too narrow'), expect.stringContaining('too shallow')]))
  })

  it('warns when reference plans are not calibrated', () => {
    const value = project(); value.references = [{ id: 'plan', name: 'plan.pdf', kind: 'pdf', calibrated: false, note: 'reference' }]
    expect(validateStudio(value).warnings).toContain('Reference assets require manual scale calibration before measurement use.')
  })
})
