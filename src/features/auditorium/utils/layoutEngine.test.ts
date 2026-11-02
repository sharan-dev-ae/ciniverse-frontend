import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { getSeatViewPose } from './camera'
import { generateAuditoriumLayout, generatePresetLayout, getAuditoriumPreset, normalizeLayoutConfig, PRESET_ORDER, validateLayoutConfig } from './layoutEngine'

const expectedCounts = { classic: 144, vip: 48, grand: 264, boutique: 42 }

describe('auditorium presets', () => {
  it.each(PRESET_ORDER)('%s has the expected exact seat count and unique IDs', preset => {
    const layout = generatePresetLayout(preset)
    expect(layout.seats).toHaveLength(expectedCounts[preset])
    expect(new Set(layout.seats.map(seat => seat.id)).size).toBe(layout.seats.length)
  })

  it.each(PRESET_ORDER)('%s preserves configured section counts in every row', preset => {
    const layout = generatePresetLayout(preset)
    for (let rowIndex = 0; rowIndex < layout.config.rows; rowIndex += 1) {
      const rowSeats = layout.seats.filter(seat => seat.rowIndex === rowIndex)
      expect(layout.config.sections.map(section => rowSeats.filter(seat => seat.section === section.id).length)).toEqual(layout.config.sections.map(section => section.seats))
    }
  })

  it.each(PRESET_ORDER)('%s creates one physical aisle step per section break and row', preset => {
    const layout = generatePresetLayout(preset)
    expect(layout.aisleSteps).toHaveLength(layout.config.rows * (layout.config.sections.length - 1))
    for (const aisle of layout.aisleSteps) {
      const rowSeats = layout.seats.filter(seat => seat.rowIndex === aisle.rowIndex)
      const boundaryIndex = Number(aisle.id.split('-').at(-1))
      const left = rowSeats.filter(seat => seat.sectionIndex === boundaryIndex).at(-1)
      const right = rowSeats.find(seat => seat.sectionIndex === boundaryIndex + 1)
      if (left && right && preset !== 'grand') { expect(aisle.x).toBeGreaterThan(left.x); expect(aisle.x).toBeLessThan(right.x) }
    }
  })

  it.each(PRESET_ORDER)('%s increases elevation from front to back', preset => {
    const layout = generatePresetLayout(preset)
    const first = layout.seats.find(seat => seat.rowIndex === 0)!
    const last = layout.seats.find(seat => seat.rowIndex === layout.config.rows - 1)!
    expect(last.y).toBeGreaterThan(first.y)
    expect(layout.platforms.at(-1)!.y).toBeGreaterThan(layout.platforms[0].y)
  })

  it.each(PRESET_ORDER)('%s has an elevated screen and a stage with front-row clearance', preset => {
    const layout = generatePresetLayout(preset)
    expect(layout.config.screen.bottomElevation).toBeCloseTo(1.5)
    expect(layout.config.screen.y).toBeCloseTo(layout.config.screen.bottomElevation + layout.config.screen.height / 2)
    expect(layout.config.stage.enabled).toBe(true)
    expect(layout.config.screen.z + .45 + layout.config.stage.depth).toBeLessThan(layout.seats[0].z)
    expect(layout.config.stage.type).toBe(preset === 'grand' ? 'grand' : 'multiplex')
  })
})

describe('grand curved geometry', () => {
  const layout = generatePresetLayout('grand')
  it('uses genuinely curved positions and screen-facing rotations', () => {
    const row = layout.seats.filter(seat => seat.rowIndex === 5)
    const left = row[0]; const center = row[Math.floor(row.length / 2)]; const right = row.at(-1)!
    expect(left.z).not.toBeCloseTo(center.z)
    expect(right.z).not.toBeCloseTo(center.z)
    expect(left.rotation).toBeLessThan(0)
    expect(right.rotation).toBeGreaterThan(0)
  })

  it('supports every curved seat with a matching rotated platform segment', () => {
    expect(layout.platforms).toHaveLength(layout.seats.length)
    for (const seat of layout.seats) {
      const platform = layout.platforms.find(item => item.id === `platform-${seat.id}`)!
      expect(platform.x).toBeCloseTo(seat.x)
      expect(platform.z).toBeCloseTo(seat.z)
      expect(platform.rotation).toBeCloseTo(seat.rotation)
    }
  })

  it('remains compatible with first-person screen orientation', () => {
    const screen = new THREE.Vector3(0, layout.config.screen.y, layout.config.screen.z)
    for (const seat of [layout.seats[0], layout.seats[132], layout.seats.at(-1)!]) {
      const pose = getSeatViewPose(seat, screen)
      const expected = screen.clone().sub(pose.position).normalize()
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(pose.quaternion)
      expect(forward.dot(expected)).toBeGreaterThan(.9999)
    }
  })
})

describe('custom layout validation and revisions', () => {
  it('rejects invalid sections and unsafe dimensions', () => {
    const invalid = getAuditoriumPreset('classic')
    invalid.rows = 2; invalid.sections[0].seats = 0; invalid.aisleWidth = 9
    expect(validateLayoutConfig(invalid).valid).toBe(false)
    expect(() => generateAuditoriumLayout(invalid)).toThrow()
  })

  it('changes the custom revision when geometry changes', () => {
    const first = getAuditoriumPreset('classic'); first.preset = 'custom'
    const second = getAuditoriumPreset('classic'); second.preset = 'custom'; second.aisleWidth += .2
    expect(generateAuditoriumLayout(first).config.revision).not.toBe(generateAuditoriumLayout(second).config.revision)
  })

  it('migrates a saved layout without stage metadata to safe elevated defaults', () => {
    const legacy = getAuditoriumPreset('classic')
    legacy.screen.y = 2.8
    delete (legacy.screen as Partial<typeof legacy.screen>).bottomElevation
    delete (legacy as Partial<typeof legacy>).stage
    const migrated = normalizeLayoutConfig(legacy)
    expect(migrated.screen.y).toBeCloseTo(3.9)
    expect(migrated.screen.bottomElevation).toBeCloseTo(1.5)
    expect(migrated.stage.type).toBe('multiplex')
  })

  it('changes the custom revision when stage geometry changes', () => {
    const first = getAuditoriumPreset('classic'); first.preset = 'custom'
    const second = getAuditoriumPreset('classic'); second.preset = 'custom'; second.stage.depth += .4
    expect(generateAuditoriumLayout(first).config.revision).not.toBe(generateAuditoriumLayout(second).config.revision)
  })
})
