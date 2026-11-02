import { create } from 'zustand'
import type { Booking, Seat, SeatHold } from '../types/domain'
import { bookingRepository } from '../services/repositories/bookingRepository'

interface BookingState {
  selectedSeats: Seat[]; hold: SeatHold|null; latestBooking: Booking|null; notice: string|null
  toggleSeat: (seat: Seat) => void; clearSelection: () => void; createHold: (showtimeId:string, layoutRevision?:string) => Promise<SeatHold>
  setLatestBooking: (booking:Booking) => void; setNotice:(notice:string|null)=>void
}

export const useBookingStore = create<BookingState>((set,get) => ({
  selectedSeats:[], hold:bookingRepository.getHold(), latestBooking:null, notice:null,
  toggleSeat:(seat)=>set(state=> {
    const exists=state.selectedSeats.some(s=>s.id===seat.id)
    if(exists) return { selectedSeats:state.selectedSeats.filter(s=>s.id!==seat.id) }
    if(seat.status!=='available') return { notice:`Seat ${seat.id} is not available.` }
    if(state.selectedSeats.length>=8) return { notice:'A maximum of 8 seats can be selected.' }
    return { selectedSeats:[...state.selectedSeats,seat], notice:null }
  }),
  clearSelection:()=>set({selectedSeats:[],hold:null}),
  createHold:async(showtimeId,layoutRevision='classic-v1')=>{ const hold=await bookingRepository.holdSeats(showtimeId,get().selectedSeats.map(s=>s.id),layoutRevision); set({hold}); return hold },
  setLatestBooking:(latestBooking)=>set({latestBooking,selectedSeats:[],hold:null}), setNotice:(notice)=>set({notice}),
}))
