import type { Seat, SeatCategory, SeatStatus } from '../../../types/domain'

export const CATEGORY_PRICES: Record<SeatCategory, number> = { standard: 14, premium: 20, vip: 30 }

const seededStatus = (index: number): SeatStatus => {
  if ([7, 31, 54, 83, 112].includes(index)) return 'booked'
  if ([18, 72].includes(index)) return 'held'
  if ([0, 14, 105, 119].includes(index)) return 'disabled'
  return 'available'
}

export function generateSeats(rows = 10, seatsPerRow = 12, centralAisle = true): Seat[] {
  const seats: Seat[] = []
  for (let r = 0; r < rows; r += 1) {
    const row = String.fromCharCode(65 + r)
    const category: SeatCategory = r >= rows - 2 ? 'vip' : r >= rows - 5 ? 'premium' : 'standard'
    for (let n = 1; n <= seatsPerRow; n += 1) {
      const index = r * seatsPerRow + n - 1
      const gap = centralAisle && n > seatsPerRow / 2 ? 1.7 : 0
      seats.push({ id: `${row}${n}`, row, number: n, category, status: seededStatus(index), price: CATEGORY_PRICES[category], x: (n - (seatsPerRow + 1) / 2) * 1.25 + gap, z: r * 1.45 })
    }
  }
  return seats
}

export function calculatePricing(seats: Seat[]) {
  const subtotal = seats.reduce((sum, seat) => sum + seat.price, 0)
  const fees = seats.length ? Math.round((subtotal * 0.08 + seats.length * 1.25) * 100) / 100 : 0
  return { subtotal, fees, total: Math.round((subtotal + fees) * 100) / 100 }
}

export function canSelectSeat(seat: Seat, selectedIds: string[], max = 8) {
  if (selectedIds.includes(seat.id)) return true
  return seat.status === 'available' && selectedIds.length < max
}

export const isHoldExpired = (expiresAt: number, now = Date.now()) => expiresAt <= now
