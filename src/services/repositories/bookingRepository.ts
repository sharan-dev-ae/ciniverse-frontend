import type { Booking, CustomerDetails, SeatAvailability, SeatHold } from '../../types/domain'
import { generateSeats } from '../../features/auditorium/utils/layout'
import { generateAuditoriumLayout, getPresetFromRevision } from '../../features/auditorium/utils/layoutEngine'

export interface BookingRepository {
  getSeatAvailability(showtimeId: string, layoutRevision?: string): Promise<SeatAvailability[]>
  holdSeats(showtimeId: string, seatIds: string[], layoutRevision?: string): Promise<SeatHold>
  releaseHold(holdId: string): Promise<void>
  confirmBooking(holdId: string, customer: CustomerDetails): Promise<Booking>
  getBookings(): Promise<Booking[]>
}

const wait = (ms = 180) => new Promise(resolve => setTimeout(resolve, ms))
const BOOKINGS_KEY = 'cineverse.bookings'
const HOLDS_KEY = 'cineverse.holds'
const ACTIVE_HOLD_KEY = 'cineverse.activeHoldId'

export class MockBookingRepository implements BookingRepository {
  async getSeatAvailability(showtimeId: string, layoutRevision = 'classic-v1') { await wait(); return generateAuditoriumLayout(getPresetFromRevision(layoutRevision),`${showtimeId}:${layoutRevision}`).seats.map(({id,status}) => ({ seatId:id, status })) }
  async holdSeats(showtimeId: string, seatIds: string[], layoutRevision = 'classic-v1') { await wait(); const hold: SeatHold = { id:crypto.randomUUID(), showtimeId, layoutRevision, seatIds:[...new Set(seatIds)], expiresAt:Date.now()+300_000 }; const scope=`${showtimeId}:${layoutRevision}`; const holds=this.getHolds(); holds[scope]=hold; localStorage.setItem(HOLDS_KEY,JSON.stringify(holds)); localStorage.setItem(ACTIVE_HOLD_KEY,hold.id); return hold }
  async releaseHold(holdId: string) { const holds=this.getHolds(); const entry=Object.entries(holds).find(([,hold])=>hold.id===holdId); if(entry){delete holds[entry[0]];localStorage.setItem(HOLDS_KEY,JSON.stringify(holds))} if(localStorage.getItem(ACTIVE_HOLD_KEY)===holdId)localStorage.removeItem(ACTIVE_HOLD_KEY) }
  async confirmBooking(holdId: string, customer: CustomerDetails) {
    await wait(350); const hold=this.getHold(); if(!hold||hold.id!==holdId||hold.expiresAt<=Date.now()) throw new Error('Your seat hold has expired.')
    const existing=await this.getBookings(); const duplicate=existing.find(b=>b.id===hold.id); if(duplicate) return duplicate
    const allSeats=hold.layoutRevision ? generateAuditoriumLayout(getPresetFromRevision(hold.layoutRevision)).seats : generateSeats(); const seats=allSeats.filter(s=>hold.seatIds.includes(s.id)); const subtotal=seats.reduce((a,s)=>a+s.price,0); const total=Math.round((subtotal*1.08+seats.length*1.25)*100)/100
    const booking: Booking={ id:hold.id, reference:`CV-${hold.id.slice(0,8).toUpperCase()}`, showtimeId:hold.showtimeId, movieId:hold.showtimeId.split('-').slice(0,-2).join('-'), cinemaId:'aurora', layoutRevision:hold.layoutRevision??'classic-v1', seatIds:hold.seatIds, seats, total, customer, status:'confirmed', paymentStatus:'paid', createdAt:new Date().toISOString() }
    localStorage.setItem(BOOKINGS_KEY,JSON.stringify([booking,...existing])); await this.releaseHold(hold.id); return booking
  }
  async getBookings(): Promise<Booking[]> { try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)??'[]') as Booking[] } catch { return [] } }
  getHolds(): Record<string,SeatHold> { try { return JSON.parse(localStorage.getItem(HOLDS_KEY)??'{}') as Record<string,SeatHold> } catch { return {} } }
  getHold(): SeatHold|null { const activeId=localStorage.getItem(ACTIVE_HOLD_KEY); return Object.values(this.getHolds()).find(hold=>hold.id===activeId)??null }
}

export const bookingRepository = new MockBookingRepository()
