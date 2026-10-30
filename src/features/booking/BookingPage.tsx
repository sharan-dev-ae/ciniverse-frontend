import { ArrowLeft, Eye, Grid3X3, Rotate3D, ScanEye, Shuffle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { movies, showtimes } from '../../mocks/data'
import { generateSeats } from '../auditorium/utils/layout'
import { AuditoriumScene, type CameraMode } from '../auditorium/scene/AuditoriumScene'
import { SeatMap2D } from '../auditorium/components/SeatMap2D'
import { BookingSidebar } from './BookingSidebar'
import type { Seat } from '../../types/domain'
import { useBookingStore } from '../../stores/bookingStore'

export default function BookingPage() {
  const { showtimeId } = useParams()
  const showtime = showtimes.find(item => item.id === showtimeId) ?? showtimes[0]
  const movie = movies.find(item => item.id === showtime.movieId) ?? movies[0]
  const seats = useMemo(() => generateSeats(), [])
  const selectedSeats = useBookingStore(state => state.selectedSeats)
  const focusedSeat: Seat | null = selectedSeats.at(-1) ?? null
  const [view, setView] = useState<'3d' | '2d'>('3d')
  const [mode, setMode] = useState<CameraMode>('overview')

  useEffect(() => {
    const exitSeatView = (event: KeyboardEvent) => { if (event.key === 'Escape' && mode !== 'overview') setMode('overview') }
    window.addEventListener('keydown', exitSeatView)
    return () => window.removeEventListener('keydown', exitSeatView)
  }, [mode])

  useEffect(() => {
    if (!focusedSeat && mode !== 'overview') setMode('overview')
  }, [focusedSeat, mode])

  const changeView = (next: '3d' | '2d') => { setMode('overview'); setView(next) }
  const inSeatView = mode === 'seat-view'

  return <div className="mx-auto max-w-[1500px] px-4 py-7 lg:px-7">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><p className="mb-1 text-xs font-semibold uppercase tracking-[.25em] text-gold">Select your seats</p><h1 className="text-2xl font-bold md:text-3xl">{movie.title}</h1><p className="mt-1 text-sm text-muted">Aurora Grand Cinema · Auditorium One</p></div>
      {!inSeatView && <div className="flex rounded-full border border-line bg-panel p-1"><button onClick={() => changeView('3d')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs ${view === '3d' ? 'bg-white text-black' : 'text-muted'}`}><Rotate3D size={15} />Immersive 3D</button><button onClick={() => changeView('2d')} className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs ${view === '2d' ? 'bg-white text-black' : 'text-muted'}`}><Grid3X3 size={15} />Accessible 2D</button></div>}
    </div>
    <div className={`grid gap-5 ${inSeatView ? '' : 'lg:grid-cols-[minmax(0,1fr)_340px]'}`}>
      <section><div className={`relative overflow-hidden rounded-3xl border border-line bg-black transition-all ${inSeatView ? 'h-[76vh] min-h-[560px]' : 'h-[62vh] min-h-[480px]'}`}>
        {view === '3d' ? <>
          <AuditoriumScene seats={seats} mode={mode} focusedSeat={focusedSeat} />
          {inSeatView && focusedSeat ? <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/65 px-4 py-3 backdrop-blur"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold">Viewing from</p><p className="mt-1 font-bold">Seat {focusedSeat.id} <span className="font-normal capitalize text-muted">· {focusedSeat.category}</span></p></div>
            <div className="flex gap-2"><button onClick={() => setMode('overview')} className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/65 px-4 text-xs font-semibold backdrop-blur hover:bg-white hover:text-black"><ArrowLeft size={16} />Back to auditorium</button><button onClick={() => setMode('overview')} className="hidden min-h-11 items-center gap-2 rounded-full border border-white/15 bg-black/65 px-4 text-xs font-semibold backdrop-blur hover:bg-white hover:text-black sm:flex"><Shuffle size={15} />Switch seat</button></div>
          </div> : <>
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/70 p-1.5 backdrop-blur"><button onClick={() => setMode('overview')} className={`rounded-full p-2.5 ${mode === 'overview' ? 'bg-white text-black' : 'text-white'}`} aria-label="Auditorium overview"><Rotate3D size={18} /></button><button onClick={() => focusedSeat && setMode('seat-focus')} disabled={!focusedSeat} className={`rounded-full p-2.5 disabled:opacity-30 ${mode === 'seat-focus' ? 'bg-white text-black' : 'text-white'}`} aria-label="Focus selected seat"><ScanEye size={18} /></button><button onClick={() => focusedSeat && setMode('seat-view')} disabled={!focusedSeat} className="rounded-full p-2.5 text-white disabled:opacity-30" aria-label="View from selected seat"><Eye size={18} /></button></div>
            {focusedSeat && <div className="absolute left-4 top-4 max-w-[230px] rounded-2xl border border-white/10 bg-black/70 p-4 backdrop-blur"><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-gold">Selected seat</p><p className="mt-1 text-lg font-bold">{focusedSeat.id}</p><p className="mt-1 text-xs capitalize text-muted">Row {focusedSeat.row} · {focusedSeat.category} · ${focusedSeat.price}</p><button onClick={() => setMode('seat-view')} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-accent px-4 text-xs font-semibold hover:bg-accent-hover"><Eye size={15} />View from seat</button></div>}
          </>}
        </> : <div className="h-full overflow-auto py-10"><SeatMap2D seats={seats} /></div>}
      </div>
      {!inSeatView && <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted">{Object.entries({ Available: '#692337', Selected: '#e11d48', Held: '#d6ad60', Booked: '#343741', Accessible: '#15171d' }).map(([label, color]) => <span key={label} className="flex items-center gap-2"><i className="size-3 rounded-sm border border-white/15" style={{ background: color }} />{label}</span>)}</div>}
      </section>
      {!inSeatView && <BookingSidebar movie={movie} showtime={showtime} />}
    </div>
  </div>
}
