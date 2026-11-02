import type { AuditoriumLayoutConfig, AuditoriumPresetId, Seat, SeatCategory, SeatStatus } from '../../../types/domain'
import { CATEGORY_PRICES } from './layout'

export interface AisleStep { id: string; rowIndex: number; x: number; y: number; z: number; rotation: number; width: number; depth: number }
export interface RowPlatform { id: string; rowIndex: number; x: number; y: number; z: number; rotation: number; width: number; depth: number }
export interface GeneratedAuditoriumLayout { config: AuditoriumLayoutConfig; seats: Seat[]; aisleSteps: AisleStep[]; platforms: RowPlatform[]; width: number; depth: number }
export interface LayoutValidation { valid: boolean; errors: string[] }

export const AUDITORIUM_PRESETS: Record<Exclude<AuditoriumPresetId, 'custom'>, AuditoriumLayoutConfig> = {
  classic: {
    id: 'classic', revision: 'classic-v1', name: 'Classic Three-Section', preset: 'classic', style: 'classic', rows: 9,
    sections: [{ id: 'left', label: 'Left', seats: 4 }, { id: 'center', label: 'Center', seats: 8 }, { id: 'right', label: 'Right', seats: 4 }],
    aisleWidth: 1.7, seatSpacing: 1.18, rowSpacing: 1.5, rowRise: .2, firstRowElevation: .18, curvature: 0, seatScale: 1, screen: { width: 16, height: 4.8, bottomElevation: 1.5, y: 3.9, z: -7.5 }, stage: { enabled: true, type: 'multiplex', height: .3, depth: 1.5, width: 17.5, edgeLighting: true }, categories: { premiumFromRow: 4, vipFromRow: 7 },
  },
  vip: {
    id: 'vip', revision: 'vip-v1', name: 'Luxury VIP Theater', preset: 'vip', style: 'luxury', rows: 6,
    sections: [{ id: 'left', label: 'Left', seats: 2 }, { id: 'center', label: 'Center', seats: 4 }, { id: 'right', label: 'Right', seats: 2 }],
    aisleWidth: 2, seatSpacing: 1.7, rowSpacing: 2.15, rowRise: .31, firstRowElevation: .2, curvature: 0, seatScale: 1.24, screen: { width: 13, height: 4.4, bottomElevation: 1.5, y: 3.7, z: -8 }, stage: { enabled: true, type: 'multiplex', height: .3, depth: 1.5, width: 14.5, edgeLighting: true }, categories: { premiumFromRow: 0, vipFromRow: 0 },
  },
  grand: {
    id: 'grand', revision: 'grand-v1', name: 'Grand Curved Theater', preset: 'grand', style: 'grand', rows: 11,
    sections: [{ id: 'left', label: 'Left', seats: 6 }, { id: 'center', label: 'Center', seats: 12 }, { id: 'right', label: 'Right', seats: 6 }],
    aisleWidth: 1.65, seatSpacing: 1.05, rowSpacing: 1.5, rowRise: .22, firstRowElevation: .18, curvature: .75, seatScale: .96, screen: { width: 21, height: 6, bottomElevation: 1.5, y: 4.5, z: -8.5 }, stage: { enabled: true, type: 'grand', height: .45, depth: 2.2, width: 23, edgeLighting: true }, categories: { premiumFromRow: 5, vipFromRow: 9 },
  },
  boutique: {
    id: 'boutique', revision: 'boutique-v1', name: 'Boutique Theater', preset: 'boutique', style: 'boutique', rows: 6,
    sections: [{ id: 'left', label: 'Left', seats: 3 }, { id: 'right', label: 'Right', seats: 4 }],
    aisleWidth: 1.5, seatSpacing: 1.3, rowSpacing: 1.65, rowRise: .22, firstRowElevation: .18, curvature: .08, seatScale: 1.08, screen: { width: 11, height: 3.7, bottomElevation: 1.5, y: 3.35, z: -6.8 }, stage: { enabled: true, type: 'multiplex', height: .3, depth: 1.4, width: 12.5, edgeLighting: true }, categories: { premiumFromRow: 0, vipFromRow: 4 },
  },
}

export const PRESET_ORDER: Exclude<AuditoriumPresetId, 'custom'>[] = ['classic', 'vip', 'grand', 'boutique']

export function normalizeLayoutConfig(config: AuditoriumLayoutConfig): AuditoriumLayoutConfig {
  const bottomElevation = Number.isFinite(config.screen.bottomElevation) ? config.screen.bottomElevation : 1.5
  const grand = config.preset === 'grand' || config.style === 'grand'
  const stage = config.stage ?? { enabled: true, type: grand ? 'grand' : 'multiplex', height: grand ? .45 : .3, depth: grand ? 2.2 : 1.5, width: config.screen.width + (grand ? 2 : 1.5), edgeLighting: true }
  return { ...config, sections: config.sections.map(section => ({ ...section })), screen: { ...config.screen, bottomElevation, y: bottomElevation + config.screen.height / 2 }, stage: { ...stage }, categories: { ...config.categories } }
}
const cloneConfig = (config: AuditoriumLayoutConfig): AuditoriumLayoutConfig => normalizeLayoutConfig(config)
export function getAuditoriumPreset(id: Exclude<AuditoriumPresetId, 'custom'>) { return cloneConfig(AUDITORIUM_PRESETS[id]) }
export function getPresetFromRevision(revision: string) {
  const preset = PRESET_ORDER.find(id => revision.startsWith(`${id}-`)) ?? 'classic'
  return getAuditoriumPreset(preset)
}

export function validateLayoutConfig(input: AuditoriumLayoutConfig): LayoutValidation {
  const config = normalizeLayoutConfig(input)
  const errors: string[] = []
  if (!config.name.trim()) errors.push('Auditorium name is required.')
  if (!Number.isInteger(config.rows) || config.rows < 3 || config.rows > 14) errors.push('Rows must be a whole number between 3 and 14.')
  if (config.sections.length < 1 || config.sections.length > 4) errors.push('Use between one and four seating sections.')
  if (config.sections.some(section => !Number.isInteger(section.seats) || section.seats < 1 || section.seats > 14)) errors.push('Each section must contain between 1 and 14 seats.')
  if (new Set(config.sections.map(section => section.id)).size !== config.sections.length) errors.push('Section IDs must be unique.')
  if (config.aisleWidth < .8 || config.aisleWidth > 3) errors.push('Aisle width must be between 0.8m and 3m.')
  if (config.seatSpacing < .9 || config.seatSpacing > 2.2) errors.push('Seat spacing must be between 0.9m and 2.2m.')
  if (config.rowSpacing < 1.1 || config.rowSpacing > 2.8) errors.push('Row spacing must be between 1.1m and 2.8m.')
  if (config.rowRise < .1 || config.rowRise > .5) errors.push('Row elevation must be between 0.1m and 0.5m.')
  if (config.curvature < 0 || config.curvature > .9) errors.push('Curvature must be between 0 and 0.9.')
  if (config.screen.width < 7 || config.screen.width > 26 || config.screen.height < 2.5 || config.screen.height > 8) errors.push('Screen dimensions are outside the supported range.')
  if (config.screen.bottomElevation < 0 || config.screen.bottomElevation > 4) errors.push('Screen bottom elevation must be between 0m and 4m.')
  if (config.stage.height < .15 || config.stage.height > 1.2 || config.stage.depth < .8 || config.stage.depth > 5 || config.stage.width < 7 || config.stage.width > 30) errors.push('Stage dimensions are outside the supported range.')
  if (config.stage.enabled && config.stage.height + .25 >= config.screen.bottomElevation) errors.push('Stage is too high for the configured screen-bottom clearance.')
  if (config.stage.enabled && config.stage.depth + .45 > Math.abs(config.screen.z) - 1) errors.push('Stage depth must leave at least 1m clearance before the first seating row.')
  if (config.categories.premiumFromRow < 0 || config.categories.premiumFromRow >= config.rows || config.categories.vipFromRow < config.categories.premiumFromRow || config.categories.vipFromRow >= config.rows) errors.push('Seat category row ranges are invalid.')
  return { valid: errors.length === 0, errors }
}

function categoryFor(config: AuditoriumLayoutConfig, rowIndex: number): SeatCategory {
  if (rowIndex >= config.categories.vipFromRow) return 'vip'
  if (rowIndex >= config.categories.premiumFromRow) return 'premium'
  return 'standard'
}

function customRevision(config: AuditoriumLayoutConfig) {
  const value = JSON.stringify({ rows: config.rows, sections: config.sections.map(section => section.seats), aisleWidth: config.aisleWidth, seatSpacing: config.seatSpacing, rowSpacing: config.rowSpacing, rowRise: config.rowRise, curvature: config.curvature, screen: config.screen, categories: config.categories })
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619) }
  return `custom-${(hash >>> 0).toString(36)}`
}

function statusFor(layoutRevision: string, index: number): SeatStatus {
  const seed = [...layoutRevision].reduce((sum, character) => sum + character.charCodeAt(0), 0)
  const value = index + seed
  if (value % 41 === 9) return 'disabled'
  if (value % 29 === 7) return 'booked'
  if (value % 53 === 11) return 'held'
  return 'available'
}

function sectionSeatOffsets(config: AuditoriumLayoutConfig) {
  const widths = config.sections.map(section => Math.max(0, section.seats - 1) * config.seatSpacing)
  const totalWidth = widths.reduce((sum, width) => sum + width, 0) + (config.sections.length - 1) * config.aisleWidth
  let cursor = -totalWidth / 2
  return config.sections.map((section, sectionIndex) => {
    const start = cursor
    const positions = Array.from({ length: section.seats }, (_, index) => start + index * config.seatSpacing)
    cursor += widths[sectionIndex] + config.aisleWidth
    return positions
  })
}

export function generateAuditoriumLayout(input: AuditoriumLayoutConfig, availabilityScope?: string): GeneratedAuditoriumLayout {
  const config = normalizeLayoutConfig(input)
  if (config.preset === 'custom') config.revision = customRevision(config)
  const validation = validateLayoutConfig(config)
  if (!validation.valid) throw new Error(validation.errors.join(' '))
  const flatOffsets = sectionSeatOffsets(config)
  const seats: Seat[] = []
  const aisleSteps: AisleStep[] = []
  const platforms: RowPlatform[] = []
  const seatsPerRow = config.sections.reduce((sum, section) => sum + section.seats, 0)
  const straightWidth = Math.max(...flatOffsets.flat().map(Math.abs)) * 2 + config.seatSpacing + 1.5
  const frontRadius = config.curvature > .12 ? Math.max(13, straightWidth / Math.max(.8, 2 * Math.sin(config.curvature))) : Math.abs(config.screen.z)

  for (let rowIndex = 0; rowIndex < config.rows; rowIndex += 1) {
    const row = String.fromCharCode(65 + rowIndex)
    const y = config.firstRowElevation + rowIndex * config.rowRise
    const radius = frontRadius + rowIndex * config.rowSpacing
    const baseZ = rowIndex * config.rowSpacing
    let overallNumber = 1
    config.sections.forEach((section, sectionIndex) => {
      flatOffsets[sectionIndex].forEach((straightX, seatIndex) => {
        let x = straightX; let z = baseZ; let rotation = 0
        if (config.curvature > .12) {
          const normalized = straightX / Math.max(1, straightWidth / 2)
          const angle = normalized * config.curvature
          x = Math.sin(angle) * radius
          z = config.screen.z + Math.cos(angle) * radius
          rotation = angle
        } else if (config.curvature > 0) {
          const normalized = straightX / Math.max(1, straightWidth / 2)
          z += Math.abs(normalized) * config.curvature * 1.2
          rotation = normalized * config.curvature * .18
        }
        const category = categoryFor(config, rowIndex)
        const index = rowIndex * seatsPerRow + overallNumber - 1
        seats.push({ id: `${row}${overallNumber}`, row, rowIndex, number: overallNumber, section: section.id, sectionIndex, category, status: statusFor(availabilityScope ?? config.revision, index), price: CATEGORY_PRICES[category], x, y, z, rotation })
        overallNumber += 1
      })
    })
    const generatedRowSeats = seats.filter(seat => seat.rowIndex === rowIndex)
    if (config.curvature > .12) {
      generatedRowSeats.forEach(seat => platforms.push({ id: `platform-${seat.id}`, rowIndex, x: seat.x, y: y - .18, z: seat.z, rotation: seat.rotation, width: config.seatSpacing * 1.08, depth: config.rowSpacing - .04 }))
    } else {
      platforms.push({ id: `platform-${row}`, rowIndex, x: 0, y: y - .18, z: baseZ, rotation: 0, width: straightWidth + rowIndex * config.curvature * .7, depth: config.rowSpacing - .05 })
    }
    for (let aisleIndex = 0; aisleIndex < config.sections.length - 1; aisleIndex += 1) {
      const left = flatOffsets[aisleIndex].at(-1)!; const right = flatOffsets[aisleIndex + 1][0]
      const straightX = (left + right) / 2
      let x = straightX; let z = baseZ; let rotation = 0
      if (config.curvature > .12) { const angle = straightX / Math.max(1, straightWidth / 2) * config.curvature; x = Math.sin(angle) * radius; z = config.screen.z + Math.cos(angle) * radius; rotation = angle }
      aisleSteps.push({ id: `aisle-${row}-${aisleIndex}`, rowIndex, x, y: y + .025, z, rotation, width: config.aisleWidth * .9, depth: config.rowSpacing * .9 })
    }
  }
  const maxZ = Math.max(...seats.map(seat => seat.z))
  return { config, seats, aisleSteps, platforms, width: straightWidth + 3, depth: maxZ - config.screen.z + 4 }
}

export function generatePresetLayout(id: Exclude<AuditoriumPresetId, 'custom'>, availabilityScope?: string) { const config=getAuditoriumPreset(id); return generateAuditoriumLayout(config, availabilityScope ? `${availabilityScope}:${config.revision}` : undefined) }
