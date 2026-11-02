import type { SeatModelDefinition } from './types'

export const SEAT_MODELS: SeatModelDefinition[] = [
  { id: 'standard', name: 'Standard', width: .62, depth: .72, panHeight: .46, recline: { min: 0, max: 8, default: 2 }, headrest: false, panTranslation: 0, eye: { height: 1.16, forward: .08 }, material: 'fabric' },
  { id: 'standard-recliner', name: 'Standard recliner', width: .76, depth: .94, panHeight: .48, recline: { min: 0, max: 28, default: 8 }, headrest: true, panTranslation: .12, eye: { height: 1.2, forward: .05 }, material: 'fabric' },
  { id: 'luxury-recliner', name: 'Luxury recliner', width: .92, depth: 1.12, panHeight: .5, recline: { min: 0, max: 42, default: 12 }, headrest: true, panTranslation: .2, eye: { height: 1.24, forward: .02 }, material: 'leather' },
  { id: 'custom', name: 'Custom seat', width: .72, depth: .86, panHeight: .47, recline: { min: 0, max: 35, default: 5 }, headrest: true, panTranslation: .1, eye: { height: 1.18, forward: .05 }, material: 'custom' },
]

export const seatModelById = (id: SeatModelDefinition['id']) => SEAT_MODELS.find(model => model.id === id) ?? SEAT_MODELS[0]
