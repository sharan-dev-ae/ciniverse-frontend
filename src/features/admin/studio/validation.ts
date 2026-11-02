import { validateLayoutConfig } from '../../auditorium/utils/layoutEngine'
import type { StudioProject, StudioValidation } from './types'
import { seatModelById } from './seatModels'

export function validateStudio(project: StudioProject): StudioValidation {
  const blocking = validateLayoutConfig(project.config).errors
  const warnings: string[] = []
  const seat = seatModelById(project.seatModelId)
  const seatsAcross = project.config.sections.reduce((sum, section) => sum + section.seats, 0)
  const estimatedWidth = seatsAcross * project.config.seatSpacing + Math.max(0, project.config.sections.length - 1) * project.config.aisleWidth
  const estimatedDepth = project.room.distanceToFirstRow + project.config.rows * project.config.rowSpacing
  if (project.room.width < estimatedWidth + 1.5) blocking.push(`Room is too narrow: allow at least ${(estimatedWidth + 1.5).toFixed(1)}m.`)
  if (project.room.depth < estimatedDepth) blocking.push(`Room is too shallow: allow at least ${estimatedDepth.toFixed(1)}m.`)
  if (project.config.seatSpacing < seat.width + .12) blocking.push(`${seat.name} requires at least ${(seat.width + .12).toFixed(2)}m seat spacing.`)
  if (project.config.aisleWidth < 1.1) warnings.push('Aisles below 1.1m may not meet local accessibility guidance.')
  if (project.config.rowRise / project.config.rowSpacing > .28) warnings.push('Tier slope is steep; verify sightlines and local code requirements.')
  if (project.references.some(reference => !reference.calibrated)) warnings.push('Reference assets require manual scale calibration before measurement use.')
  if (project.config.screen.width > project.room.width * .82) warnings.push('Screen occupies more than 82% of room width.')
  if (project.config.stage.enabled && project.config.stage.width > project.room.width - 1) blocking.push('Stage width must leave at least 0.5m side clearance.')
  return { blocking: [...new Set(blocking)], warnings: [...new Set(warnings)] }
}
