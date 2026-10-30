import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Layout } from './components/layout/Layout'
import HomePage from './features/movies/HomePage'
import MoviesPage from './features/movies/MoviesPage'
import MovieDetailsPage from './features/movies/MovieDetailsPage'
import CheckoutPage from './features/booking/CheckoutPage'
import ConfirmationPage from './features/booking/ConfirmationPage'
import MyBookingsPage from './features/booking/MyBookingsPage'
import AdminAuditoriumPage from './features/admin/AdminAuditoriumPage'

const BookingPage=lazy(()=>import('./features/booking/BookingPage'))
const Loading=()=> <div className="grid min-h-[70vh] place-items-center"><div className="text-center"><div className="mx-auto size-10 animate-spin rounded-full border-2 border-white/15 border-t-accent"/><p className="mt-4 text-sm text-muted">Preparing your experience…</p></div></div>
function Page({children}:{children:React.ReactNode}){return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-5}} transition={{duration:.25}}>{children}</motion.div>}
export default function App(){const location=useLocation();return <AnimatePresence mode="wait"><Routes location={location} key={location.pathname}><Route element={<Layout/>}><Route index element={<Page><HomePage/></Page>}/><Route path="movies" element={<Page><MoviesPage/></Page>}/><Route path="movies/:movieId" element={<Page><MovieDetailsPage/></Page>}/><Route path="booking/:showtimeId" element={<Suspense fallback={<Loading/>}><Page><BookingPage/></Page></Suspense>}/><Route path="checkout" element={<Page><CheckoutPage/></Page>}/><Route path="booking/confirmation/:bookingId" element={<Page><ConfirmationPage/></Page>}/><Route path="my-bookings" element={<Page><MyBookingsPage/></Page>}/><Route path="admin/auditorium" element={<Page><AdminAuditoriumPage/></Page>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></AnimatePresence>}
