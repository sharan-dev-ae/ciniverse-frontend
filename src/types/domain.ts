export type SeatCategory = 'standard' | 'premium' | 'vip'
export type SeatStatus = 'available' | 'selected' | 'held' | 'booked' | 'disabled'
export type BookingStatus = 'confirmed' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type AuditoriumPresetId = 'classic' | 'vip' | 'grand' | 'boutique' | 'custom'
export type AuditoriumStyle = 'classic' | 'luxury' | 'grand' | 'boutique'

export interface Movie {
  id: string; title: string; tagline: string; synopsis: string; genres: string[]
  duration: number; language: string; rating: number; certificate: string
  poster: string; backdrop: string; accent: string; releaseDate: string
  cast: string[]; director: string; status: 'now-showing' | 'coming-soon'
}
export interface Cinema { id: string; name: string; location: string; formats: string[] }
export interface AuditoriumSectionConfig { id: string; label: string; seats: number }
export interface AuditoriumScreenConfig { width: number; height: number; y: number; z: number }
export interface AuditoriumCategoryConfig { premiumFromRow: number; vipFromRow: number }
export interface AuditoriumLayoutConfig {
  id: string; revision: string; name: string; preset: AuditoriumPresetId; style: AuditoriumStyle
  rows: number; sections: AuditoriumSectionConfig[]; aisleWidth: number; seatSpacing: number
  rowSpacing: number; rowRise: number; firstRowElevation: number; curvature: number
  seatScale: number; screen: AuditoriumScreenConfig; categories: AuditoriumCategoryConfig
}
export interface Auditorium { id: string; name: string; rows: number; seatsPerRow: number; layoutRevision?: string }
export interface Seat {
  id: string; row: string; rowIndex: number; number: number; section: string; sectionIndex: number
  category: SeatCategory; status: SeatStatus; price: number; x: number; y: number; z: number; rotation: number
}
export interface Showtime { id: string; movieId: string; cinemaId: string; auditoriumId: string; startsAt: string; format: string }
export interface SeatHold { id: string; showtimeId: string; layoutRevision: string; seatIds: string[]; expiresAt: number }
export interface CustomerDetails { name: string; email: string; phone?: string }
export interface Booking { id: string; reference: string; showtimeId: string; movieId: string; cinemaId: string; layoutRevision: string; seatIds: string[]; seats: Seat[]; total: number; customer: CustomerDetails; status: BookingStatus; paymentStatus: PaymentStatus; createdAt: string }
export interface SeatAvailability { seatId: string; status: SeatStatus }
