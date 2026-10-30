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
    localStorage.setItem('cineverse.hold',JSON.stringify({...hold,expiresAt:Date.now()-1}))
    await expect(repository.confirmBooking(hold.id,{name:'Demo Guest',email:'guest@example.com'})).rejects.toThrow('expired')
  })
})
