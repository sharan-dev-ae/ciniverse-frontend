import type { AuditoriumLayoutConfig } from '../../../types/domain'
import type { StudioReference } from './types'

export interface ImportResult { config?: AuditoriumLayoutConfig; reference?: StudioReference; message: string }
const reference = (file: File, kind: StudioReference['kind'], note: string): ImportResult => ({ reference: { id: `ref-${Date.now()}`, name: file.name, kind, calibrated: false, note }, message: note })

export async function importStudioFile(file: File): Promise<ImportResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (extension === 'json') {
    const parsed = JSON.parse(await file.text()) as AuditoriumLayoutConfig | { config: AuditoriumLayoutConfig }
    const config = 'config' in parsed ? parsed.config : parsed
    return { config, message: 'JSON geometry loaded. Validate dimensions before publishing.' }
  }
  if (extension === 'csv') {
    const lines = (await file.text()).trim().split(/\r?\n/); const headers = lines.shift()?.split(',').map(item => item.trim().toLowerCase()) ?? []
    const rows = lines.map(line => Object.fromEntries(line.split(',').map((value, index) => [headers[index], value.trim()])))
    if (!headers.includes('row') || !headers.includes('section')) throw new Error('CSV requires row and section columns. Optional columns: x, y, z, rotation, category.')
    const rowNames = [...new Set(rows.map(row => row.row))]; const sectionNames = [...new Set(rows.map(row => row.section))]
    const counts = sectionNames.map(name => Math.max(...rowNames.map(rowName => rows.filter(row => row.row === rowName && row.section === name).length)))
    const config = JSON.parse(localStorage.getItem('cineverse.auditorium.layout.v2') ?? 'null') as AuditoriumLayoutConfig | null
    if (!config) throw new Error('Start from a preset before importing CSV coordinates.')
    return { config: { ...config, name: file.name.replace(/\.csv$/i, ''), preset: 'custom', revision: 'custom-pending', rows: rowNames.length, sections: sectionNames.map((name, index) => ({ id: name.toLowerCase().replace(/\W+/g, '-'), label: name, seats: counts[index] })) }, message: `Imported ${rows.length} CSV seats into ${sectionNames.length} sections. Coordinate columns are retained as source guidance; use the property panel for final SI geometry.` }
  }
  if (extension === 'svg') return reference(file, 'svg', 'SVG attached as a calibrated reference. Seat elements with metadata can be converted in a future import pass.')
  if (extension === 'png') return reference(file, 'png', 'PNG attached as a visual reference. Set a known-distance scale manually.')
  if (extension === 'pdf') return reference(file, 'pdf', 'PDF attached as a browser reference. Automatic plan extraction is intentionally not claimed; calibrate manually.')
  throw new Error('Supported imports: JSON, CSV, SVG, PNG, and PDF.')
}
