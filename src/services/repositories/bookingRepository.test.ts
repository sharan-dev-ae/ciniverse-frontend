import { beforeEach, describe, expect, it } from 'vitest'
import { MockBookingRepository } from './bookingRepository'

class MemoryStorage implements Storage {
  private data=new Map<string,string>()
  get length(){return this.data.size}
  clear(){this.data.clear()}
  getItem(key:string){return this.data.get(key)??null}
  key(index:number){return [...this.data.keys()][index]??null}
  removeItem(key:string){this.data.delete(key)}
  setItem(key:string,value:string){this.data.set(key,String(value))}
}

describe('mock booking state transitions',()=>{
  beforeEach(()=>{Object.defineProperty(globalThis,'localStorage',{value:new MemoryStorage(),configurable:true})})
  it('holds unique seats and persists only one confirmation',async()=>{
    const repository=new MockBookingRepository()
    const hold=await repository.holdSeats('stellar-film-0-19',['A2','A2','A3'])
    expect(hold.seatIds).toEqual(['A2','A3'])
    const booking=await repository.confirmBooking(hold.id,{name:'Demo Guest',email:'guest@example.com'})
    expect([booking.status,booking.paymentStatus]).toEqual(['confirmed','paid'])
    await expect(repository.confirmBooking(hold.id,{name:'Demo Guest',email:'guest@example.com'})).rejects.toThrow()
    expect(await repository.getBookings()).toHaveLength(1)
  })
  it('rejects an expired hold',async()=>{
    const repository=new MockBookingRepository()
    const hold=await repository.holdSeats('stellar-film-0-19',['A2'])
    localStorage.setItem('cineverse.holds',JSON.stringify({ 'stellar-film-0-19:classic-v1': {...hold,expiresAt:Date.now()-1} }))
    await expect(repository.confirmBooking(hold.id,{name:'Demo Guest',email:'guest@example.com'})).rejects.toThrow('expired')
  })

  it('isolates active holds by showtime and layout revision',async()=>{
    const repository=new MockBookingRepository()
    const classic=await repository.holdSeats('show-1',['A2'],'classic-v1')
    const vip=await repository.holdSeats('show-1',['A2'],'vip-v1')
    const holds=repository.getHolds()
    expect(holds['show-1:classic-v1'].id).toBe(classic.id)
    expect(holds['show-1:vip-v1'].id).toBe(vip.id)
    expect(repository.getHold()?.id).toBe(vip.id)
  })

  it('scopes generated availability by showtime and layout revision',async()=>{
    const repository=new MockBookingRepository()
    const first=await repository.getSeatAvailability('show-1','classic-v1')
    const second=await repository.getSeatAvailability('show-2','classic-v1')
    const vip=await repository.getSeatAvailability('show-1','vip-v1')
    expect(first).not.toEqual(second)
    expect(first.length).toBe(144)
    expect(vip.length).toBe(48)
  })
})
