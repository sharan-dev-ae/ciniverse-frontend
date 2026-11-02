import { ArrowLeft, Eye, Grid3X3, Maximize2, Minimize2, Rotate3D, ScanEye, Shuffle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useParams } from 'react-router-dom'
import { movies, showtimes } from '../../mocks/data'
import { generatePresetLayout, PRESET_ORDER } from '../auditorium/utils/layoutEngine'
import { AuditoriumScene, type CameraMode } from '../auditorium/scene/AuditoriumScene'
import { SeatMap2D } from '../auditorium/components/SeatMap2D'
import { BookingSidebar } from './BookingSidebar'
import type { Seat } from '../../types/domain'
import { useBookingStore } from '../../stores/bookingStore'
import type { HeadMode } from '../auditorium/utils/camera'
import { calculateSightline, type SightlineMeasurement } from '../auditorium/utils/sightline'

export default function BookingPage() {
  const { showtimeId } = useParams()
  const showtime = showtimes.find(item => item.id === showtimeId) ?? showtimes[0]
  const movie = movies.find(item => item.id === showtime.movieId) ?? movies[0]
  const initialPreset = showtime.auditoriumId === 'aud-2' ? 'vip' : 'classic'
  const [preset, setPreset] = useState<'classic' | 'vip' | 'grand' | 'boutique'>(initialPreset)
  const layout = useMemo(() => generatePresetLayout(preset, showtime.id), [preset, showtime.id])
  const seats = layout.seats
  const selectedSeats = useBookingStore(state => state.selectedSeats)
  const clearSelection = useBookingStore(state => state.clearSelection)
  const focusedSeat: Seat | null = selectedSeats.at(-1) ?? null
  const [view, setView] = useState<'3d' | '2d'>('3d')
  const [mode, setMode] = useState<CameraMode>('overview')
  const [reclineAngle, setReclineAngle] = useState(8)
  const [headMode, setHeadMode] = useState<HeadMode>('direct-screen')
  const [showSightline, setShowSightline] = useState(false)
  const [resetViewVersion, setResetViewVersion] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const seatView = useMemo(() => ({ eyeHeight: focusedSeat?.category === 'vip' ? 1.24 : 1.2, eyeForward: .12, panTranslation: focusedSeat?.category === 'vip' ? .18 : .08, reclineAngle, headMode }), [focusedSeat?.category, headMode, reclineAngle])
  const sightline = useMemo(() => focusedSeat ? calculateSightline(focusedSeat, new THREE.Vector3(0, layout.config.screen.y, layout.config.screen.z), seatView) : null, [focusedSeat, layout.config.screen.y, layout.config.screen.z, seatView])

  useEffect(() => {
    const exitSeatView = (event: KeyboardEvent) => { if (event.key === 'Escape' && mode !== 'overview') setMode('overview') }
    window.addEventListener('keydown', exitSeatView)
    return () => window.removeEventListener('keydown', exitSeatView)
  }, [mode])

  useEffect(() => {
    if (!focusedSeat) { if (mode !== 'overview') setMode('overview'); setShowSightline(false) }
  }, [focusedSeat, mode])

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === viewerRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  const changeView = (next: '3d' | '2d') => { setMode('overview'); setView(next) }
  const changeLayout = (next: typeof preset) => { if (next === preset) return; clearSelection(); setMode('overview'); setShowSightline(false); setPreset(next) }
  const resetView = () => { setMode('overview'); setResetViewVersion(value => value + 1) }
  const toggleFullscreen = async () => { setFullscreenError(null); try { if (document.fullscreenElement === viewerRef.current) await document.exitFullscreen(); else if (viewerRef.current?.requestFullscreen) await viewerRef.current.requestFullscreen(); else throw new Error('Fullscreen is not supported by this browser.') } catch (error) { setFullscreenError(error instanceof Error ? error.message : 'Unable to change fullscreen mode.') } }
  const inSeatView = mode === 'seat-view'

  return <div className="w-full px-4 py-5 sm:px-6">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-[.25em] text-gold">Select your seats</p><h1 className="text-2xl font-bold md:text-3xl">{movie.title}</h1><p className="mt-1 text-sm text-muted">Aurora Grand Cinema · Auditorium One</p></div>
      {!inSeatView && <div className="flex rounded-full border border-line bg-panel p-1"><button onClick={() => changeView('3d')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs ${view === '3d' ? 'bg-white text-black' : 'text-muted'}`}><Rotate3D size={15} />Immersive 3D</button><button onClick={() => changeView('2d')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs ${view === '2d' ? 'bg-white text-black' : 'text-muted'}`}><Grid3X3 size={15} />Accessible 2D</button></div>}
    </div>
    {!inSeatView && <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Auditorium layout selector">{PRESET_ORDER.map(id => { const preview = generatePresetLayout(id); return <button key={id} onClick={() => changeLayout(id)} aria-pressed={preset === id} className={`min-w-[170px] rounded-2xl border p-3 text-left transition ${preset === id ? 'border-accent bg-accent/10' : 'border-line bg-panel hover:border-white/20'}`}><span className="block text-xs font-semibold">{preview.config.name}</span><span className="mt-1 block text-[10px] text-muted">{preview.seats.length} seats · {preview.config.sections.length} sections</span></button> })}</div>}
    <div className={`grid gap-4 ${inSeatView ? '' : 'lg:grid-cols-[minmax(0,1fr)_360px]'}`}>
      <section className="min-w-0"><div ref={viewerRef} className={`relative overflow-hidden bg-black transition-[height,border-radius] duration-300 ${isFullscreen ? 'h-screen min-h-0 rounded-none border-0' : `rounded-3xl border border-line ${inSeatView ? 'h-[calc(100vh-150px)] min-h-[620px]' : 'h-[calc(100vh-245px)] min-h-[580px]'}`}`}>
        {view === '3d' ? <>
          <AuditoriumScene layout={layout} mode={mode} focusedSeat={focusedSeat} seatView={seatView} showSightline={showSightline} resetViewVersion={resetViewVersion} />
          {inSeatView && focusedSeat ? <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/65 px-4 py-3 backdrop-blur"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold">Viewing from</p><p className="mt-1 font-bold">Seat {focusedSeat.id} <span className="font-normal capitalize text-muted">· {focusedSeat.category}</span></p>{showSightline&&sightline&&<SightlineMetrics sightline={sightline}/>}</div>
            <div className="flex gap-2"><button onClick={toggleFullscreen} className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/15 bg-black/65 backdrop-blur" aria-label={isFullscreen?'Exit fullscreen':'Enter fullscreen'}>{isFullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button><button onClick={()=>setShowSightline(value=>!value)} aria-pressed={showSightline} className={`min-h-11 rounded-full border px-4 text-xs font-semibold backdrop-blur ${showSightline?'border-[#FACC15]/60 bg-[#FACC15]/15 text-[#FACC15]':'border-white/15 bg-black/65'}`}>Sightline</button><button onClick={() => setMode('overview')} className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/65 px-4 text-xs font-semibold backdrop-blur hover:bg-white hover:text-black"><ArrowLeft size={16} />Back to auditorium</button><button onClick={() => setMode('overview')} className="hidden min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/65 px-4 text-xs font-semibold backdrop-blur hover:bg-white hover:text-black sm:flex"><Shuffle size={15} />Switch seat</button></div>
          </div> : <>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/70 p-1.5 backdrop-blur"><button onClick={resetView} title="Reset view" className={`rounded-full p-2.5 ${mode === 'overview' ? 'bg-white text-black' : 'text-white'}`} aria-label="Reset auditorium view"><Rotate3D size={18} /></button><button onClick={() => focusedSeat && setMode('seat-focus')} disabled={!focusedSeat} className={`rounded-full p-2.5 disabled:opacity-30 ${mode === 'seat-focus' ? 'bg-white text-black' : 'text-white'}`} aria-label="Focus selected seat"><ScanEye size={18} /></button><button onClick={() => focusedSeat && setMode('seat-view')} disabled={!focusedSeat} className="rounded-full p-2.5 text-white disabled:opacity-30" aria-label="View from selected seat"><Eye size={18} /></button></div>
            {focusedSeat && <div className="absolute left-4 top-4 max-w-[250px] rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold">Selected seat</p><p className="mt-1 text-lg font-bold">{focusedSeat.id}</p><p className="mt-1 text-xs capitalize text-muted">Row {focusedSeat.row} · {focusedSeat.category} · ${focusedSeat.price}</p><button onClick={()=>setShowSightline(value=>!value)} aria-pressed={showSightline} className={`mt-3 flex min-h-9 w-full items-center justify-center rounded-full border text-xs font-semibold ${showSightline?'border-[#FACC15]/60 bg-[#FACC15]/15 text-[#FACC15]':'border-white/15 text-white'}`}>{showSightline?'Hide':'Show'} Sightline</button>{showSightline&&sightline&&<SightlineMetrics sightline={sightline}/>}<button onClick={() => setMode('seat-view')} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-xs font-semibold hover:bg-accent-hover"><Eye size={15} />View from seat</button></div>}
          </>}
          {!inSeatView&&<button onClick={toggleFullscreen} className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full border border-white/15 bg-black/65 backdrop-blur hover:bg-white hover:text-black" aria-label={isFullscreen?'Exit fullscreen':'Enter fullscreen'}>{isFullscreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button>}
          {inSeatView && focusedSeat && <div className="absolute bottom-4 left-1/2 w-[min(92%,520px)] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur"><div className="flex items-center justify-between gap-3"><label className="text-xs font-semibold">Recline · {reclineAngle}°</label><div className="flex rounded-lg border border-white/10 p-1"><button onClick={()=>setHeadMode('direct-screen')} className={`rounded-md px-3 py-1.5 text-[10px] ${headMode==='direct-screen'?'bg-accent text-white':'text-muted'}`}>Direct screen</button><button onClick={()=>setHeadMode('natural')} className={`rounded-md px-3 py-1.5 text-[10px] ${headMode==='natural'?'bg-accent text-white':'text-muted'}`}>Natural head</button></div></div><input aria-label="Seat recline angle" className="mt-3 w-full accent-accent" type="range" min="0" max={focusedSeat.category==='vip'?42:28} value={reclineAngle} onChange={event=>setReclineAngle(Number(event.target.value))}/><div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3"><button onClick={()=>setShowSightline(value=>!value)} aria-pressed={showSightline} className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold ${showSightline?'border-[#FACC15]/60 text-[#FACC15]':'border-white/15 text-muted'}`}>{showSightline?'Hide':'Show'} Sightline</button>{showSightline&&sightline&&<SightlineMetrics sightline={sightline}/>}</div></div>}
        </> : <div className="h-full overflow-auto py-10"><SeatMap2D seats={seats} /></div>}
      </div>{fullscreenError&&<p role="alert" className="mt-2 text-xs text-red-400">{fullscreenError}</p>}
      {!inSeatView && <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">{Object.entries({ Available: '#173d7a', Selected: '#2563eb', Held: '#38bdf8', Booked: '#334155', Accessible: '#111827' }).map(([label, color]) => <span key={label} className="flex items-center gap-2"><i className="size-3 rounded-sm border border-white/15" style={{ background: color }} />{label}</span>)}</div>}
      </section>
      {!inSeatView && <BookingSidebar movie={movie} showtime={showtime} layoutRevision={layout.config.revision} />}
    </div>
  </div>
}

function SightlineMetrics({ sightline }: { sightline: SightlineMeasurement }) {
  const signed = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}°`
  return <div className="mt-2 text-[10px] text-[#FACC15]" aria-label="Geometric viewing beam measurements"><div className="flex flex-wrap gap-x-3 gap-y-1"><span>{sightline.distance.toFixed(1)}m</span><span>H {signed(sightline.horizontalAngle)}</span><span>V {signed(sightline.verticalAngle)}</span></div><p className="mt-1 text-[9px] text-[#FACC15]/70">Geometric coverage · obstructions not evaluated</p></div>
}
