import { Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import type { AuditoriumLayoutConfig } from '../../types/domain'
import { AuditoriumScene } from '../auditorium/scene/AuditoriumScene'
import { SeatMap2D } from '../auditorium/components/SeatMap2D'
import { generateAuditoriumLayout, getAuditoriumPreset, normalizeLayoutConfig, PRESET_ORDER, validateLayoutConfig } from '../auditorium/utils/layoutEngine'
import { useBookingStore } from '../../stores/bookingStore'

const STORAGE_KEY = 'cineverse.auditorium.layout.v2'

function savedConfig(): AuditoriumLayoutConfig {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as AuditoriumLayoutConfig | null
    const migrated = parsed ? normalizeLayoutConfig(parsed) : null
    return migrated && validateLayoutConfig(migrated).valid ? migrated : getAuditoriumPreset('classic')
  } catch { return getAuditoriumPreset('classic') }
}

export default function AuditoriumDesignerPage() {
  const [config, setConfig] = useState<AuditoriumLayoutConfig>(savedConfig)
  const [preview, setPreview] = useState<'3d' | '2d'>('3d')
  const setNotice = useBookingStore(state => state.setNotice)
  const validation = useMemo(() => validateLayoutConfig(config), [config])
  const layout = useMemo(() => validation.valid ? generateAuditoriumLayout(config) : null, [config, validation.valid])
  const update = (partial: Partial<AuditoriumLayoutConfig>) => setConfig(current => ({ ...current, ...partial, preset: 'custom', revision: 'custom-pending' }))
  const selectPreset = (id: typeof PRESET_ORDER[number]) => setConfig(getAuditoriumPreset(id))
  const updateSection = (index: number, seats: number) => update({ sections: config.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, seats } : section) })
  const removeSection = (index: number) => { if (config.sections.length <= 1) return; update({ sections: config.sections.filter((_, sectionIndex) => sectionIndex !== index).map((section, sectionIndex) => ({ ...section, id: `section-${sectionIndex + 1}` })) }) }
  const addSection = () => { if (config.sections.length >= 4) return; update({ sections: [...config.sections, { id: `section-${config.sections.length + 1}`, label: `Section ${config.sections.length + 1}`, seats: 4 }] }) }
  const save = () => { if (!layout) return; localStorage.setItem(STORAGE_KEY, JSON.stringify(layout.config)); setConfig(layout.config); setNotice(`Saved ${layout.config.name} as ${layout.config.revision}.`) }

  return <div className="mx-auto max-w-[1500px] px-5 py-12 lg:px-8">
    <p className="text-xs font-semibold uppercase tracking-[.25em] text-gold">Layout engine · Phase 1.2</p>
    <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-bold">Auditorium designer</h1><p className="mt-3 max-w-2xl text-sm text-muted">Start from a professional preset, then tune the seating architecture. Valid configurations generate one shared coordinate model for 3D, 2D, booking, and first-person views.</p></div>{layout && <div className="rounded-full border border-line bg-panel px-4 py-2 text-xs text-muted">{layout.seats.length} seats · {config.sections.length} sections · {layout.config.revision}</div>}</div>

    <div className="mt-8 flex gap-2 overflow-x-auto pb-2">{PRESET_ORDER.map(id => { const preset = getAuditoriumPreset(id); return <button key={id} onClick={() => selectPreset(id)} className={`min-w-[190px] rounded-2xl border p-4 text-left ${config.preset === id ? 'border-accent bg-accent/10' : 'border-line bg-panel'}`}><span className="block text-sm font-semibold">{preset.name}</span><span className="mt-1 block text-xs text-muted">{preset.rows} rows · {preset.sections.map(section => section.seats).join(' + ')}</span></button> })}</div>

    <div className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
      <section className="h-fit rounded-3xl border border-line bg-panel p-6 xl:max-h-[78vh] xl:overflow-y-auto">
        <h2 className="font-bold">Configuration</h2>
        <div className="mt-5 space-y-5">
          <Field label="Auditorium name"><input value={config.name} onChange={event => update({ name: event.target.value })} className="field" /></Field>
          <NumberGrid fields={[
            ['Rows', config.rows, 3, 14, value => update({ rows: value, categories: { premiumFromRow: Math.min(config.categories.premiumFromRow, value - 1), vipFromRow: Math.min(Math.max(config.categories.vipFromRow, config.categories.premiumFromRow), value - 1) } })],
            ['Aisle width', config.aisleWidth, .8, 3, value => update({ aisleWidth: value })],
            ['Seat spacing', config.seatSpacing, .9, 2.2, value => update({ seatSpacing: value })],
            ['Row spacing', config.rowSpacing, 1.1, 2.8, value => update({ rowSpacing: value })],
            ['Row elevation', config.rowRise, .1, .5, value => update({ rowRise: value })],
            ['Curvature', config.curvature, 0, .9, value => update({ curvature: value })],
          ]} />

          <div className="border-t border-line pt-5"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Sections</p><button onClick={addSection} disabled={config.sections.length >= 4} className="flex items-center gap-1 text-xs text-accent-hover disabled:opacity-30"><Plus size={14} />Add</button></div><div className="mt-3 space-y-2">{config.sections.map((section, index) => <div key={`${section.id}-${index}`} className="grid grid-cols-[1fr_90px_32px] items-end gap-2"><Field label={`Section ${index + 1}`}><input value={section.label} onChange={event => update({ sections: config.sections.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) })} className="field" /></Field><Field label="Seats"><input type="number" min={1} max={14} value={section.seats} onChange={event => updateSection(index, Number(event.target.value))} className="field" /></Field><button onClick={() => removeSection(index)} disabled={config.sections.length <= 1} className="mb-1 grid size-9 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-accent-hover disabled:opacity-20" aria-label={`Remove section ${index + 1}`}><Trash2 size={15} /></button></div>)}</div></div>

          <div className="border-t border-line pt-5"><p className="mb-3 text-sm font-semibold">Screen</p><NumberGrid fields={[
            ['Width', config.screen.width, 7, 26, value => update({ screen: { ...config.screen, width: value } })],
            ['Height', config.screen.height, 2.5, 8, value => update({ screen: { ...config.screen, height: value } })],
          ]} /></div>
          <div className="border-t border-line pt-5"><p className="mb-3 text-sm font-semibold">Seat categories by row</p><NumberGrid fields={[
            ['Premium starts', config.categories.premiumFromRow + 1, 1, config.rows, value => update({ categories: { premiumFromRow: value - 1, vipFromRow: Math.max(config.categories.vipFromRow, value - 1) } })],
            ['VIP starts', config.categories.vipFromRow + 1, 1, config.rows, value => update({ categories: { ...config.categories, vipFromRow: value - 1 } })],
          ]} /></div>
          {!validation.valid && <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-xs text-accent-hover"><ul className="space-y-1">{validation.errors.map(error => <li key={error}>• {error}</li>)}</ul></div>}
          <Button onClick={save} disabled={!layout} className="w-full"><Save size={16} />Save configuration</Button>
          <Button variant="ghost" onClick={() => selectPreset('classic')} className="w-full"><RotateCcw size={16} />Reset to Classic</Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-line bg-elevated"><div className="flex items-center justify-between border-b border-line p-4"><div><h2 className="font-semibold">Live preview</h2><p className="mt-1 text-xs text-muted">{layout ? `${layout.seats.length} unique seat IDs · ${layout.aisleSteps.length} aisle steps` : 'Fix validation errors to render'}</p></div><div className="flex rounded-full border border-line bg-ink p-1"><button onClick={() => setPreview('3d')} className={`rounded-full px-3 py-1.5 text-xs ${preview === '3d' ? 'bg-white text-black' : 'text-muted'}`}>3D</button><button onClick={() => setPreview('2d')} className={`rounded-full px-3 py-1.5 text-xs ${preview === '2d' ? 'bg-white text-black' : 'text-muted'}`}>2D</button></div></div><div className="h-[68vh] min-h-[560px]">{layout ? preview === '3d' ? <AuditoriumScene layout={layout} mode="overview" focusedSeat={null} interactive={false} /> : <div className="h-full overflow-auto py-10"><SeatMap2D seats={layout.seats} /></div> : <div className="grid h-full place-items-center text-sm text-muted">Configuration is not renderable.</div>}</div></section>
    </div>
  </div>
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min)) }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-medium text-muted">{label}{children}</label> }
type NumericField = [string, number, number, number, (value: number) => void]
function NumberGrid({ fields }: { fields: NumericField[] }) { return <div className="grid grid-cols-2 gap-3">{fields.map(([label, value, min, max, onChange]) => <Field key={label} label={label}><input type="number" step="any" min={min} max={max} value={value} onChange={event => onChange(clamp(Number(event.target.value), min, max))} className="field" /></Field>)}</div> }
