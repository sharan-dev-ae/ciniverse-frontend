import type { Seat } from '../../../types/domain'
import { useBookingStore } from '../../../stores/bookingStore'

const categoryColors = { standard: 'bg-[#8F1824] border-[#C43A48]', premium: 'bg-[#B42332] border-[#E05763]', vip: 'bg-[#73121F] border-[#A52B3A]' }
const statusColors = { selected: 'bg-[#2563EB] border-[#60A5FA]', held: 'bg-[#F59E0B]/70 border-[#FBBF24]', booked: 'bg-[#3A3032] border-[#65575A]', disabled: 'bg-[#171113] border-[#3A3032]' }
export function SeatMap2D({ seats, selectedSeatId, onSeatSelect }: { seats: Seat[]; selectedSeatId?: string | null; onSeatSelect?: (seat: Seat) => void }) {
  const selected = useBookingStore(state => state.selectedSeats)
  const toggle = useBookingStore(state => state.toggleSeat)
  const rows = Array.from(new Set(seats.map(seat => seat.row)))
  const seatsPerRow = Math.max(...rows.map(row => seats.filter(seat => seat.row === row).length))
  return <div className="overflow-x-auto p-2"><div className="mx-auto" style={{ minWidth: Math.max(520, seatsPerRow * 38) }}><div className="mx-auto mb-10 h-2 w-4/5 rounded-full bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_8px_40px_rgba(255,255,255,.35)]" /><div className="space-y-2">{rows.map(row => {
    const rowSeats = seats.filter(seat => seat.row === row)
    return <div key={row} className="flex items-center justify-center gap-1.5"><span className="mr-2 w-4 text-xs text-muted">{row}</span>{rowSeats.map((seat, index) => {
      const previous = rowSeats[index - 1]
      const beginsSection = previous && previous.section !== seat.section
      const isSelected = selectedSeatId ? selectedSeatId === seat.id : selected.some(item => item.id === seat.id)
      const color = isSelected ? statusColors.selected : seat.status === 'available' ? categoryColors[seat.category] : statusColors[seat.status]
      return <button key={seat.id} onClick={() => onSeatSelect ? onSeatSelect(seat) : toggle(seat)} disabled={!onSeatSelect && seat.status !== 'available' && !isSelected} aria-label={`Seat ${seat.id}, ${seat.section} section, ${isSelected ? 'selected' : seat.status}, $${seat.price}`} title={`${seat.id} · ${seat.section} · ${seat.category}`} className={`size-7 rounded-t-lg border text-[9px] text-white transition hover:-translate-y-1 ${beginsSection ? 'ml-6' : ''} ${color}`} style={{ transform: `rotate(${seat.rotation * 18}deg)` }}>{seat.number}</button>
    })}</div>
  })}</div></div></div>
}
