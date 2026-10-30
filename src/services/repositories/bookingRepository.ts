import type { Booking, CustomerDetails, SeatAvailability, SeatHold } from '../../types/domain'
import { generateSeats } from '../../features/auditorium/utils/layout'

export interface BookingRepository {
  getSeatAvailability(showtimeId: string): Promise<SeatAvailability[]>
  holdSeats(showtimeId: string, seatIds: string[]): Promise<SeatHold>
  releaseHold(holdId: string): Promise<void>
  confirmBooking(holdId: string, customer: CustomerDetails): Promise<Booking>
  getBookings(): Promise<Booking[]>
}

const wait = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms))
const BOOKINGS_KEY = 'cineverse.bookings'
const HOLD_KEY = 'cineverse.hold'

export class MockBookingRepository implements BookingRepository {
  async getSeatAvailability(_showtimeId: string) { await wait(); return generateSeats().map(({id,status}) => ({ seatId:id, status })) }
  async holdSeats(showtimeId: string, seatIds: string[]) { await wait(); const hold: SeatHold = { id:crypto.randomUUID(), showtimeId, seatIds:[...new Set(seatIds)], expiresAt:Date.now()+300_000 }; localStorage.setItem(HOLD_KEY,JSON.stringify(hold)); return hold }
  async releaseHold(holdId: string) { const hold = this.getHold(); if (hold?.id===holdId) localStorage.removeItem(HOLD_KEY) }
  async confirmBooking(holdId: string, customer: CustomerDetails) {
    await wait(350); const hold=this.getHold(); if(!hold||hold.id!==holdId||hold.expiresAt<=Date.now()) throw new Error('Your seat hold has expired.')
    const existing=await this.getBookings(); const duplicate=existing.find(b=>b.id===hold.id); if(duplicate) return duplicate
    const allSeats=generateSeats(); const seats=allSeats.filter(s=>hold.seatIds.includes(s.id)); const subtotal=seats.reduce((a,s)=>a+s.price,0); const total=Math.round((subtotal*1.08+seats.length*1.25)*100)/100
    const booking: Booking={ id:hold.id, reference:`CV-${hold.id.slice(0,8).toUpperCase()}`, showtimeId:hold.showtimeId, movieId:hold.showtimeId.split('-').slice(0,-2).join('-'), cinemaId:'aurora', seatIds:hold.seatIds, seats, total, customer, status:'confirmed', paymentStatus:'paid', createdAt:new Date().toISOString() }
    localStorage.setItem(BOOKINGS_KEY,JSON.stringify([booking,...existing])); localStorage.removeItem(HOLD_KEY); return booking
  }
  async getBookings(): Promise<Booking[]> { try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)??'[]') as Booking[] } catch { return [] } }
  getHold(): SeatHold|null { try { return JSON.parse(localStorage.getItem(HOLD_KEY)??'null') as SeatHold|null } catch { return null } }
}

export const bookingRepository = new MockBookingRepository()
