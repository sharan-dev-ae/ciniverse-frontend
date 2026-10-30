import { X } from 'lucide-react'
import { useBookingStore } from '../../stores/bookingStore'

export function Toast(){ const notice=useBookingStore(s=>s.notice); const setNotice=useBookingStore(s=>s.setNotice); if(!notice)return null; return <div role="status" className="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-elevated px-5 py-3 shadow-2xl"><span className="text-sm">{notice}</span><button onClick={()=>setNotice(null)} aria-label="Dismiss"><X size={16}/></button></div> }
