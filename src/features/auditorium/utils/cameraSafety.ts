import * as THREE from 'three'
import type { Seat } from '../../../types/domain'
import type { GeneratedAuditoriumLayout, RowPlatform } from './layoutEngine'

export const ORBIT_LIMITS = { minPolarAngle: .34, maxPolarAngle: 1.38, minDistance: 2.2 } as const
const CELL_SIZE = 2.5
const key = (x: number, z: number) => `${Math.floor(x / CELL_SIZE)}:${Math.floor(z / CELL_SIZE)}`

export interface CameraSafetyBounds {
  minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number
  targetMinY: number; targetMaxY: number; highestTier: number; maxDistance: number
  seatGrid: Map<string, Seat[]>; platformGrid: Map<string, RowPlatform[]>
}

function addToGrid<T extends { x: number; z: number }>(grid: Map<string, T[]>, item: T) {
  const bucket = grid.get(key(item.x, item.z)) ?? []; bucket.push(item); grid.set(key(item.x, item.z), bucket)
}

function addPlatformToGrid(grid: Map<string, RowPlatform[]>, platform: RowPlatform) {
  const radius = Math.hypot(platform.width, platform.depth) / 2
  const minX = Math.floor((platform.x - radius) / CELL_SIZE); const maxX = Math.floor((platform.x + radius) / CELL_SIZE)
  const minZ = Math.floor((platform.z - radius) / CELL_SIZE); const maxZ = Math.floor((platform.z + radius) / CELL_SIZE)
  for (let x = minX; x <= maxX; x += 1) for (let z = minZ; z <= maxZ; z += 1) { const bucketKey = `${x}:${z}`; const bucket = grid.get(bucketKey) ?? []; bucket.push(platform); grid.set(bucketKey, bucket) }
}

export function createCameraSafetyBounds(layout: GeneratedAuditoriumLayout): CameraSafetyBounds {
  const halfWidth = layout.width / 2
  const minZ = layout.config.screen.z + .7
  const maxZ = minZ + layout.depth - 1.4
  const highestTier = Math.max(0, ...layout.seats.map(seat => seat.y))
  const seatGrid = new Map<string, Seat[]>(); const platformGrid = new Map<string, RowPlatform[]>()
  layout.seats.forEach(seat => addToGrid(seatGrid, seat)); layout.platforms.forEach(platform => addPlatformToGrid(platformGrid, platform))
  return { minX: -halfWidth + .55, maxX: halfWidth - .55, minZ, maxZ, minY: .55, maxY: Math.max(7.4, highestTier + 5.2), targetMinY: .25, targetMaxY: highestTier + 2.1, highestTier, maxDistance: Math.hypot(layout.width, layout.depth) * .78, seatGrid, platformGrid }
}

function nearby<T>(grid: Map<string, T[]>, point: THREE.Vector3) {
  const result: T[] = []; const cx = Math.floor(point.x / CELL_SIZE); const cz = Math.floor(point.z / CELL_SIZE)
  for (let x = cx - 1; x <= cx + 1; x += 1) for (let z = cz - 1; z <= cz + 1; z += 1) result.push(...(grid.get(`${x}:${z}`) ?? []))
  return result
}

export function getFloorHeight(bounds: CameraSafetyBounds, point: THREE.Vector3) {
  let height = 0
  nearby(bounds.platformGrid, point).forEach(platform => {
    const dx = point.x - platform.x; const dz = point.z - platform.z
    const cos = Math.cos(-platform.rotation); const sin = Math.sin(-platform.rotation)
    const localX = dx * cos - dz * sin; const localZ = dx * sin + dz * cos
    if (Math.abs(localX) <= platform.width / 2 + .25 && Math.abs(localZ) <= platform.depth / 2 + .25) height = Math.max(height, platform.y + .18)
  })
  return height
}

export function collidesWithSeat(bounds: CameraSafetyBounds, point: THREE.Vector3, clearance = .32) {
  return nearby(bounds.seatGrid, point).some(seat => {
    const radius = (seat.category === 'vip' ? .7 : .53) + clearance
    return Math.hypot(point.x - seat.x, point.z - seat.z) < radius && point.y > seat.y - .2 && point.y < seat.y + 1.35 + clearance
  })
}

export function isValidOverviewPosition(bounds: CameraSafetyBounds, point: THREE.Vector3) {
  if (![point.x, point.y, point.z].every(Number.isFinite)) return false
  if (point.x < bounds.minX || point.x > bounds.maxX || point.z < bounds.minZ || point.z > bounds.maxZ || point.y > bounds.maxY) return false
  if (point.y < Math.max(bounds.minY, getFloorHeight(bounds, point) + .48)) return false
  return !collidesWithSeat(bounds, point)
}

export function clampCameraTarget(bounds: CameraSafetyBounds, target: THREE.Vector3, output = new THREE.Vector3()) {
  return output.set(THREE.MathUtils.clamp(target.x, bounds.minX + .4, bounds.maxX - .4), THREE.MathUtils.clamp(target.y, bounds.targetMinY, bounds.targetMaxY), THREE.MathUtils.clamp(target.z, bounds.minZ + .5, bounds.maxZ - .5))
}

export function resolveCameraPosition(bounds: CameraSafetyBounds, lastValid: THREE.Vector3, proposed: THREE.Vector3, output = new THREE.Vector3()) {
  if (isValidOverviewPosition(bounds, proposed)) return output.copy(proposed)
  let low = 0; let high = 1; const candidate = new THREE.Vector3(); output.copy(lastValid)
  for (let iteration = 0; iteration < 14; iteration += 1) {
    const middle = (low + high) / 2; candidate.lerpVectors(lastValid, proposed, middle)
    if (isValidOverviewPosition(bounds, candidate)) { low = middle; output.copy(candidate) } else high = middle
  }
  return output
}

/** Projects a proposed overview position onto valid room, floor and seat
 * boundaries. Radial seat projection preserves motion tangent to the obstacle,
 * so ordinary navigation never needs a last-position rollback. */
export function constrainOverviewPosition(bounds: CameraSafetyBounds, current: THREE.Vector3, proposed: THREE.Vector3, output = new THREE.Vector3()) {
  if (![proposed.x, proposed.y, proposed.z].every(Number.isFinite)) return output.copy(current)
  output.set(
    THREE.MathUtils.clamp(proposed.x, bounds.minX, bounds.maxX),
    Math.min(proposed.y, bounds.maxY),
    THREE.MathUtils.clamp(proposed.z, bounds.minZ, bounds.maxZ),
  )
  output.y = Math.max(output.y, bounds.minY, getFloorHeight(bounds, output) + .48)
  nearby(bounds.seatGrid, output).forEach(seat => {
    const clearanceRadius = (seat.category === 'vip' ? .7 : .53) + .32
    if (output.y <= seat.y - .2 || output.y >= seat.y + 1.67) return
    let dx = output.x - seat.x; let dz = output.z - seat.z; const distance = Math.hypot(dx, dz)
    if (distance >= clearanceRadius) return
    if (distance < 1e-6) { dx = current.x - seat.x; dz = current.z - seat.z; if (Math.hypot(dx, dz) < 1e-6) dz = 1 }
    const scale = clearanceRadius / Math.hypot(dx, dz)
    output.x = THREE.MathUtils.clamp(seat.x + dx * scale, bounds.minX, bounds.maxX)
    output.z = THREE.MathUtils.clamp(seat.z + dz * scale, bounds.minZ, bounds.maxZ)
  })
  return output
}

export function getSafeOverviewPose(bounds: CameraSafetyBounds) {
  const target = new THREE.Vector3(0, Math.max(1.2, bounds.highestTier * .55), THREE.MathUtils.lerp(bounds.minZ, bounds.maxZ, .43))
  const position = new THREE.Vector3(0, Math.min(bounds.maxY - .2, bounds.highestTier + 5), bounds.maxZ - .8)
  return { position, target }
}
