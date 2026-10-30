import { describe, expect, it } from 'vitest'
import { calculatePricing, canSelectSeat, generateSeats, isHoldExpired } from './layout'

describe('auditorium layout', () => {
  it('generates deterministic unique seats across categories', () => {
    const seats=generateSeats(10,12)
    expect(seats).toHaveLength(120)
    expect(new Set(seats.map(seat=>seat.id)).size).toBe(120)
    expect(new Set(seats.map(seat=>seat.category))).toEqual(new Set(['standard','premium','vip']))
  })
  it('creates a central aisle gap', () => {
    const seats=generateSeats(4,12)
    expect(seats.find(s=>s.id==='A7')!.x-seats.find(s=>s.id==='A6')!.x).toBeGreaterThan(2)
  })
})

describe('seat rules and pricing', () => {
  const seats=generateSeats()
  it('rejects unavailable seats and enforces the selection cap', () => {
    expect(canSelectSeat(seats.find(s=>s.status==='booked')!,[])).toBe(false)
    expect(canSelectSeat(seats.find(s=>s.status==='available')!,Array.from({length:8},(_,i)=>`X${i}`))).toBe(false)
  })
  it('calculates tickets, fees, and totals', () => {
    const chosen=[seats.find(s=>s.category==='standard'&&s.status==='available')!,seats.find(s=>s.category==='vip'&&s.status==='available')!]
    expect(calculatePricing(chosen)).toEqual({subtotal:44,fees:6.02,total:50.02})
  })
  it('uses timestamp-based hold expiry', () => {
    expect(isHoldExpired(1_000,999)).toBe(false)
    expect(isHoldExpired(1_000,1_000)).toBe(true)
  })
})
