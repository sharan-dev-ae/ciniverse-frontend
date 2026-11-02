import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Seat } from '../../../types/domain'
import { getModePose, getSeatWorldPosition, type CameraMode, type SeatViewCalibration } from '../utils/camera'
import { clampCameraTarget, constrainOverviewPosition, getSafeOverviewPose, type CameraSafetyBounds } from '../utils/cameraSafety'
import { clampOrbit, dampingAlpha, dampScalar, smoothStep, stepOrbit, transitionDuration, type OrbitCoordinates } from '../utils/cinematicCamera'

interface Props { mode: CameraMode; seat: Seat | null; screenCenter: THREE.Vector3; bounds: CameraSafetyBounds; seatView: SeatViewCalibration; resetVersion: number }
interface Transition { elapsed: number; duration: number; fromPosition: THREE.Vector3; toPosition: THREE.Vector3; fromQuaternion: THREE.Quaternion; toQuaternion: THREE.Quaternion; fromTarget: THREE.Vector3; toTarget: THREE.Vector3; fromFov: number; toFov: number; destinationMode: CameraMode }

export function CinematicCameraController({ mode, seat, screenCenter, bounds, seatView, resetVersion }: Props) {
  const { camera, gl } = useThree(); const perspective = camera as THREE.PerspectiveCamera
  const resetPose = useMemo(() => getSafeOverviewPose(bounds), [bounds])
  const initialSpherical = useMemo(() => new THREE.Spherical().setFromVector3(resetPose.position.clone().sub(resetPose.target)), [resetPose])
  const currentOrbit = useRef<OrbitCoordinates>({ theta: initialSpherical.theta, phi: initialSpherical.phi, radius: initialSpherical.radius })
  const desiredOrbit = useRef<OrbitCoordinates>({ ...currentOrbit.current })
  const currentTarget = useRef(resetPose.target.clone()); const desiredTarget = useRef(resetPose.target.clone())
  const savedOverview = useRef({ position: resetPose.position.clone(), target: resetPose.target.clone(), orbit: { ...currentOrbit.current } })
  const transition = useRef<Transition | null>(null); const modeRef = useRef(mode); const resetRef = useRef(resetVersion)
  const drag = useRef({ active: false, kind: 'rotate' as 'rotate' | 'pan' | 'head', x: 0, y: 0 })
  const headDesired = useRef({ yaw: 0, pitch: 0 }); const headCurrent = useRef({ yaw: 0, pitch: 0 }); const modeBaseQuaternion = useRef(camera.quaternion.clone())
  const spherical = useRef(new THREE.Spherical()); const offset = useRef(new THREE.Vector3()); const proposed = useRef(new THREE.Vector3()); const constrained = useRef(new THREE.Vector3()); const right = useRef(new THREE.Vector3()); const planar = useRef(new THREE.Vector3()); const headQuaternion = useRef(new THREE.Quaternion()); const headEuler = useRef(new THREE.Euler())

  useEffect(() => {
    const element = gl.domElement
    const down = (event: PointerEvent) => {
      if (transition.current) return
      if (modeRef.current === 'overview') drag.current = { active: true, kind: event.button === 2 || event.shiftKey ? 'pan' : 'rotate', x: event.clientX, y: event.clientY }
      else if (modeRef.current === 'seat-view' && event.button === 0) drag.current = { active: true, kind: 'head', x: event.clientX, y: event.clientY }
      if (drag.current.active) element.setPointerCapture?.(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!drag.current.active) return
      const dx = event.clientX - drag.current.x; const dy = event.clientY - drag.current.y; drag.current.x = event.clientX; drag.current.y = event.clientY
      if (drag.current.kind === 'rotate') { desiredOrbit.current.theta -= dx * .006; desiredOrbit.current.phi -= dy * .006; clampOrbit(desiredOrbit.current, bounds) }
      else if (drag.current.kind === 'head') { headDesired.current.yaw = THREE.MathUtils.clamp(headDesired.current.yaw - dx * .0035, -.3, .3); headDesired.current.pitch = THREE.MathUtils.clamp(headDesired.current.pitch - dy * .003, -.18, .18) }
      else {
        const scale = desiredOrbit.current.radius * .0018
        right.current.set(Math.cos(currentOrbit.current.theta), 0, -Math.sin(currentOrbit.current.theta))
        planar.current.set(Math.sin(currentOrbit.current.theta), 0, Math.cos(currentOrbit.current.theta))
        desiredTarget.current.addScaledVector(right.current, -dx * scale).addScaledVector(planar.current, dy * scale)
        clampCameraTarget(bounds, desiredTarget.current, desiredTarget.current)
      }
    }
    const up = () => { drag.current.active = false }
    const wheel = (event: WheelEvent) => { if (modeRef.current !== 'overview' || transition.current) return; event.preventDefault(); desiredOrbit.current.radius *= Math.exp(event.deltaY * .00115); clampOrbit(desiredOrbit.current, bounds) }
    const context = (event: Event) => event.preventDefault()
    element.addEventListener('pointerdown', down); element.addEventListener('pointermove', move); element.addEventListener('pointerup', up); element.addEventListener('pointercancel', up); element.addEventListener('wheel', wheel, { passive: false }); element.addEventListener('contextmenu', context)
    return () => { element.removeEventListener('pointerdown', down); element.removeEventListener('pointermove', move); element.removeEventListener('pointerup', up); element.removeEventListener('pointercancel', up); element.removeEventListener('wheel', wheel); element.removeEventListener('contextmenu', context) }
  }, [bounds, gl.domElement])

  useEffect(() => {
    const resetRequested = resetRef.current !== resetVersion
    if (modeRef.current === 'overview' && mode !== 'overview') savedOverview.current = { position: camera.position.clone(), target: currentTarget.current.clone(), orbit: { ...currentOrbit.current } }
    let toPosition: THREE.Vector3; let toQuaternion: THREE.Quaternion; let toTarget: THREE.Vector3; let toFov = 48
    if (mode === 'overview') {
      const destination = resetRequested ? { position: resetPose.position, target: resetPose.target, orbit: new THREE.Spherical().setFromVector3(resetPose.position.clone().sub(resetPose.target)) } : savedOverview.current
      toPosition = destination.position.clone(); toTarget = destination.target.clone(); toQuaternion = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(toPosition, toTarget, THREE.Object3D.DEFAULT_UP))
    } else if (seat) {
      const pose = getModePose(mode, seat, screenCenter, seatView)!; toPosition = pose.position; toQuaternion = pose.quaternion; toFov = mode === 'seat-view' ? 52 : 43
      if (mode === 'seat-focus') { toTarget = getSeatWorldPosition(seat); toTarget.y += .55 } else { toTarget = screenCenter.clone() }
    } else return
    modeBaseQuaternion.current.copy(toQuaternion); headDesired.current = { yaw: 0, pitch: 0 }; headCurrent.current = { yaw: 0, pitch: 0 }
    transition.current = { elapsed: 0, duration: transitionDuration(camera.position.distanceTo(toPosition)), fromPosition: camera.position.clone(), toPosition, fromQuaternion: camera.quaternion.clone(), toQuaternion, fromTarget: currentTarget.current.clone(), toTarget, fromFov: perspective.fov, toFov, destinationMode: mode }
    resetRef.current = resetVersion; modeRef.current = mode
  }, [bounds, camera, mode, perspective, resetPose, resetVersion, screenCenter, seat, seatView])

  useFrame((_, delta) => {
    const active = transition.current
    if (active) {
      active.elapsed += Math.min(delta, .1); const progress = smoothStep(active.elapsed / active.duration)
      camera.position.lerpVectors(active.fromPosition, active.toPosition, progress); camera.quaternion.copy(active.fromQuaternion).slerp(active.toQuaternion, progress); currentTarget.current.lerpVectors(active.fromTarget, active.toTarget, progress)
      perspective.fov = THREE.MathUtils.lerp(active.fromFov, active.toFov, progress); perspective.updateProjectionMatrix()
      if (progress >= 1) {
        transition.current = null
        if (active.destinationMode === 'overview') { spherical.current.setFromVector3(camera.position.clone().sub(currentTarget.current)); currentOrbit.current = { theta: spherical.current.theta, phi: spherical.current.phi, radius: spherical.current.radius }; desiredOrbit.current = { ...currentOrbit.current }; desiredTarget.current.copy(currentTarget.current) }
      }
      return
    }
    if (modeRef.current === 'seat-view') {
      const alpha = dampingAlpha(12, delta); headCurrent.current.yaw = THREE.MathUtils.lerp(headCurrent.current.yaw, headDesired.current.yaw, alpha); headCurrent.current.pitch = THREE.MathUtils.lerp(headCurrent.current.pitch, headDesired.current.pitch, alpha)
      headEuler.current.set(headCurrent.current.pitch, headCurrent.current.yaw, 0, 'YXZ'); headQuaternion.current.setFromEuler(headEuler.current); camera.quaternion.copy(modeBaseQuaternion.current).multiply(headQuaternion.current); return
    }
    if (modeRef.current !== 'overview') return
    stepOrbit(currentOrbit.current, desiredOrbit.current, bounds, delta)
    const targetAlpha = dampingAlpha(13, delta); currentTarget.current.lerp(desiredTarget.current, targetAlpha); clampCameraTarget(bounds, currentTarget.current, currentTarget.current)
    offset.current.setFromSpherical(spherical.current.set(currentOrbit.current.radius, currentOrbit.current.phi, currentOrbit.current.theta)); proposed.current.copy(currentTarget.current).add(offset.current)
    constrainOverviewPosition(bounds, camera.position, proposed.current, constrained.current)
    const collided = constrained.current.distanceToSquared(proposed.current) > 1e-8
    camera.position.copy(constrained.current); camera.lookAt(currentTarget.current)
    perspective.fov = dampScalar(perspective.fov, 48, 10, delta); perspective.updateProjectionMatrix()
    if (collided) { spherical.current.setFromVector3(offset.current.copy(camera.position).sub(currentTarget.current)); currentOrbit.current = { theta: spherical.current.theta, phi: spherical.current.phi, radius: spherical.current.radius }; desiredOrbit.current = { ...currentOrbit.current } }
    if (![camera.position.x, camera.position.y, camera.position.z].every(Number.isFinite)) { camera.position.copy(resetPose.position); currentTarget.current.copy(resetPose.target); desiredTarget.current.copy(resetPose.target) }
  })
  return null
}
