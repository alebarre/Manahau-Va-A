import { Jimp } from 'jimp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const input  = path.resolve(__dirname, '../web/public/logo.png')
const output = path.resolve(__dirname, '../web/public/logo-transparent.png')

const image = await Jimp.read(input)
const { width, height } = image.bitmap
const data = image.bitmap.data

const cx = Math.floor(width / 2)
const cy = Math.floor(height / 2)

function isOrange(r, g, b) {
  return r > 170 && g > 60 && g < 175 && b < 70
}
function pixelIdx(x, y) { return (y * width + x) * 4 }

// Detecta o raio varrendo da borda ESQUERDA → primeiro pixel laranja
let leftEdge = 0
for (let x = 0; x < cx; x++) {
  const i = pixelIdx(x, cy)
  if (isOrange(data[i], data[i+1], data[i+2])) { leftEdge = x; break }
}
let rightEdge = width - 1
for (let x = width - 1; x > cx; x--) {
  const i = pixelIdx(x, cy)
  if (isOrange(data[i], data[i+1], data[i+2])) { rightEdge = x; break }
}

const logoRadius = Math.floor((rightEdge - leftEdge) / 2)
console.log(`Raio do círculo: ${logoRadius}px`)

// Remove borda branca e fundo laranja do círculo
image.scan(0, 0, width, height, (x, y, idx) => {
  const dx = x - cx, dy = y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > logoRadius) {
    data[idx + 3] = 0 // fora do círculo → transparente
    return
  }
  const r = data[idx], g = data[idx + 1], b = data[idx + 2]
  if (isOrange(r, g, b)) data[idx + 3] = 0 // laranja interno → transparente
})

// Proporções do aro: 3mm gap + 5mm espessura (relativo ao raio)
const gap  = Math.round(logoRadius * 0.04)  // ~3mm
const ring = Math.round(logoRadius * 0.07)  // ~5mm

const pad    = gap + ring
const newW   = width  + pad * 2
const newH   = height + pad * 2
const newCx  = cx + pad
const newCy  = cy + pad

console.log(`Gap: ${gap}px | Aro: ${ring}px | Nova tela: ${newW}×${newH}`)

// Cria nova tela transparente
const canvas = new Jimp({ width: newW, height: newH, color: 0x00000000 })

// Desenha o aro branco
const outerR = logoRadius + gap + ring
const innerR = logoRadius + gap

canvas.scan(0, 0, newW, newH, (x, y, idx) => {
  const dx = x - newCx, dy = y - newCy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist >= innerR && dist <= outerR) {
    canvas.bitmap.data[idx]     = 255 // R
    canvas.bitmap.data[idx + 1] = 255 // G
    canvas.bitmap.data[idx + 2] = 255 // B
    canvas.bitmap.data[idx + 3] = 255 // A
  }
})

// Compõe a logo processada sobre o aro
canvas.composite(image, pad, pad)

await canvas.write(output)
console.log('✅ logo-transparent.png gerada com aro branco!')
