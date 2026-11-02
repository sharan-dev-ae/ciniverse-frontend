import type { AuditoriumLayoutConfig } from '../../../types/domain'

export type StudioView = '2d' | '3d' | 'reference'
export type VersionStatus = 'draft' | 'published'
export type ReferenceKind = 'svg' | 'png' | 'pdf'

export interface SeatModelDefinition {
  id: 'standard' | 'standard-recliner' | 'luxury-recliner' | 'custom'
  name: string
  width: number
  depth: number
  panHeight: number
  recline: { min: number; max: number; default: number }
  headrest: boolean
  panTranslation: number
  eye: { height: number; forward: number }
  material: 'fabric' | 'leather' | 'custom'
}

export interface StudioReference {
  id: string
  name: string
  kind: ReferenceKind
  calibrated: boolean
  metersPerUnit?: number
  note: string
}

export interface StudioProject {
  id: string
  versionId: string
  version: number
  status: VersionStatus
  createdAt: string
  updatedAt: string
  config: AuditoriumLayoutConfig
  room: { width: number; depth: number; height: number; distanceToFirstRow: number }
  seatModelId: SeatModelDefinition['id']
  references: StudioReference[]
}

export interface StudioValidation {
  blocking: string[]
  warnings: string[]
}
