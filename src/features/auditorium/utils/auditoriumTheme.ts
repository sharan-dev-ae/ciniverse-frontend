import * as THREE from 'three'

export const CLASSIC_RED_THEME = {
  carpet: '#7A0E0E', carpetDark: '#520909', carpetGold: '#B7791F', amber: '#F59E0B',
  wall: '#2B080D', wallLuxury: '#360B12', ceiling: '#080708', frame: '#241012',
  seats: { standard: '#8F1824', premium: '#B42332', vip: '#73121F' },
} as const

export function carpetRepeat(width: number, depth: number) { return { x: Math.max(6, width / 1.8), y: Math.max(8, depth / 1.8) } }

export function createClassicCarpetTexture(width: number, depth: number) {
  const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128
  const context = canvas.getContext('2d')!; context.fillStyle = CLASSIC_RED_THEME.carpet; context.fillRect(0, 0, 128, 128)
  context.strokeStyle = 'rgba(183,121,31,.24)'; context.lineWidth = 2
  for (let offset = -64; offset < 192; offset += 32) { context.beginPath(); context.moveTo(offset, 0); context.lineTo(offset + 64, 64); context.lineTo(offset, 128); context.stroke() }
  context.fillStyle = 'rgba(244,180,74,.18)'
  for (let y = 16; y < 128; y += 32) for (let x = 16; x < 128; x += 32) { context.save(); context.translate(x, y); context.rotate(Math.PI / 4); context.fillRect(-3, -3, 6, 6); context.restore() }
  context.fillStyle = 'rgba(45,4,8,.18)'
  for (let y = 0; y < 128; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 128; x += 8) context.fillRect(x, y, 1, 1)
  const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  const repeat = carpetRepeat(width, depth); texture.repeat.set(repeat.x, repeat.y); texture.colorSpace = THREE.SRGBColorSpace; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter
  return texture
}
