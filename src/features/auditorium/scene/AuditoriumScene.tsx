import { Html, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Seat } from '../../../types/domain'
import { useBookingStore } from '../../../stores/bookingStore'

export type CameraMode='overview'|'focus'|'pov'
const stateColors={ available:'#692337', selected:'#e11d48', held:'#d6ad60', booked:'#343741', disabled:'#15171d' }

function CinemaSeat({seat,onFocus}:{seat:Seat;onFocus:(s:Seat)=>void}){
  const selected=useBookingStore(s=>s.selectedSeats.some(x=>x.id===seat.id)); const toggle=useBookingStore(s=>s.toggleSeat); const [hovered,setHovered]=useState(false)
  const color=selected?stateColors.selected:stateColors[seat.status]
  return <group position={[seat.x,seat.category==='vip'?.36:.25,seat.z]} scale={seat.category==='vip'?1.12:1} onPointerOver={e=>{e.stopPropagation();setHovered(true);document.body.style.cursor='pointer'}} onPointerOut={()=>{setHovered(false);document.body.style.cursor='auto'}} onClick={e=>{e.stopPropagation(); if(seat.status==='available')toggle(seat)}} onDoubleClick={e=>{e.stopPropagation();onFocus(seat)}}>
    <RoundedBox args={[.78,.25,.78]} radius={.1} position={[0,.25,.05]}><meshStandardMaterial color={color} roughness={.6}/></RoundedBox>
    <RoundedBox args={[.8,.95,.18]} radius={.1} position={[0,.82,.35]} rotation={[-.08,0,0]}><meshStandardMaterial color={color} roughness={.65}/></RoundedBox>
    <mesh position={[-.53,.42,.1]}><boxGeometry args={[.16,.16,.78]}/><meshStandardMaterial color="#2b2023"/></mesh><mesh position={[.53,.42,.1]}><boxGeometry args={[.16,.16,.78]}/><meshStandardMaterial color="#2b2023"/></mesh>
    <Text position={[0,1.05,.24]} fontSize={.16} color="#f8fafc" anchorX="center">{seat.id}</Text>
    {hovered&&<Html center position={[0,1.55,0]}><div className="pointer-events-none w-44 rounded-xl border border-white/10 bg-ink/95 p-3 text-xs shadow-2xl"><p className="font-bold text-white">Seat {seat.id}</p><p className="mt-1 capitalize text-muted">{seat.category} · ${seat.price}</p><p className="mt-1 capitalize text-gold">{selected?'selected':seat.status}</p><p className="mt-2 text-[10px] text-muted">Double-click for seat focus</p></div></Html>}
  </group>
}

function CameraRig({mode,seat}:{mode:CameraMode;seat:Seat|null}){ const {camera}=useThree(); const target=useMemo(()=>new THREE.Vector3(),[]); useFrame((_,delta)=>{ if(mode==='overview'){target.set(0,10,18)} else if(mode==='focus'&&seat){target.set(seat.x,3.2,seat.z+4)} else if(mode==='pov'&&seat){target.set(seat.x,1.35,seat.z+.25)} camera.position.lerp(target,1-Math.pow(.002,delta)); if(mode==='pov')camera.lookAt(0,2,-7); else camera.lookAt(seat?.x??0,seat?.z??5,seat?.z??5) }); return null }

function Room({seats,onFocus}:{seats:Seat[];onFocus:(s:Seat)=>void}){ return <>
  <ambientLight intensity={.45}/><spotLight position={[0,11,-3]} intensity={60} angle={1.2} penumbra={.9}/><pointLight position={[-7,.4,6]} color="#e11d48" intensity={12}/><pointLight position={[8,.4,6]} color="#e11d48" intensity={12}/>
  <mesh position={[0,2,-7]}><boxGeometry args={[17,5,.25]}/><meshStandardMaterial color="#101116"/></mesh><mesh position={[0,2.5,-6.8]}><planeGeometry args={[13,4]}/><meshStandardMaterial color="#e9e2d2" emissive="#aaa18c" emissiveIntensity={.12}/></mesh>
  <Text position={[0,5,-6.65]} fontSize={.3} color="#d6ad60">CINEVERSE</Text>
  <mesh position={[0,-.15,7]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[22,32]}/><meshStandardMaterial color="#0d0e12" roughness={.85}/></mesh>
  {Array.from({length:10},(_,r)=><mesh key={r} position={[0,r*.18,r*1.45]}><boxGeometry args={[19,.35,1.42]}/><meshStandardMaterial color={r>7?'#171217':'#15161b'}/></mesh>)}
  {[-.2,.2].map((x,i)=><mesh key={i} position={[x,0,7]}><boxGeometry args={[.08,.08,28]}/><meshStandardMaterial color="#e11d48" emissive="#e11d48" emissiveIntensity={3}/></mesh>)}
  {seats.map(seat=><CinemaSeat key={seat.id} seat={seat} onFocus={onFocus}/>)}
  <mesh position={[-10,4,7]}><boxGeometry args={[.3,8,30]}/><meshStandardMaterial color="#111319"/></mesh><mesh position={[10,4,7]}><boxGeometry args={[.3,8,30]}/><meshStandardMaterial color="#111319"/></mesh>
  </> }

export function AuditoriumScene({seats,mode,focusedSeat,onFocus}:{seats:Seat[];mode:CameraMode;focusedSeat:Seat|null;onFocus:(s:Seat)=>void}){
  const controls=useRef<React.ElementRef<typeof OrbitControls>>(null); useEffect(()=>{ if(mode!=='overview')controls.current?.reset() },[mode])
  return <Canvas camera={{position:[0,10,18],fov:48}} dpr={[1,1.6]} gl={{antialias:true,powerPreference:'high-performance'}}><color attach="background" args={['#08090d']}/><fog attach="fog" args={['#08090d',20,45]}/><Suspense fallback={<Html center><span className="text-sm text-white">Preparing auditorium…</span></Html>}><Room seats={seats} onFocus={onFocus}/></Suspense><CameraRig mode={mode} seat={focusedSeat}/><OrbitControls ref={controls} enabled={mode==='overview'} enablePan minDistance={8} maxDistance={32} minPolarAngle={.35} maxPolarAngle={1.45} target={[0,2,6]}/></Canvas>
}
