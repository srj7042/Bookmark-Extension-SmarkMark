/**
 * Generates the PNG icons into public/icons with zero dependencies
 * (node:zlib + a hand-rolled PNG encoder). Run via `npm run icons`,
 * which `npm run build` already calls.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../public/icons/', import.meta.url))
const SIZES = [16, 32, 48, 128]

const IVORY = [242, 239, 231]
const BLUE = [51, 104, 160]
const SAGE = [200, 223, 219]

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, pixels) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Rounded ivory tile with a blue bookmark ribbon and a sage notch. */
function render(size) {
  const pixels = Buffer.alloc(size * size * 4)
  const radius = size * 0.22
  const ribbonHalf = size * 0.19
  const top = size * 0.22
  const bottom = size * 0.78
  const notch = size * 0.15
  const cx = size / 2
  const SS = 3 // supersample factor for smooth edges

  const inRounded = (x, y) => {
    const rx = Math.min(Math.max(x, radius), size - radius)
    const ry = Math.min(Math.max(y, radius), size - radius)
    return (x - rx) ** 2 + (y - ry) ** 2 <= radius ** 2
  }

  const inRibbon = (x, y) => {
    if (Math.abs(x - cx) > ribbonHalf || y < top || y > bottom) return false
    if (y > bottom - notch && Math.abs(x - cx) < ((y - (bottom - notch)) / notch) * ribbonHalf) return false
    return true
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS
          if (!inRounded(px, py)) continue
          const color = inRibbon(px, py) ? BLUE : y > size * 0.72 ? SAGE : IVORY
          r += color[0]
          g += color[1]
          b += color[2]
          a += 255
        }
      }
      const samples = SS * SS
      const i = (y * size + x) * 4
      if (a === 0) continue
      // premultiplied-ish average keeps the edges clean against any background
      pixels[i] = Math.round(r / (a / 255))
      pixels[i + 1] = Math.round(g / (a / 255))
      pixels[i + 2] = Math.round(b / (a / 255))
      pixels[i + 3] = Math.round(a / samples)
    }
  }
  return encodePng(size, pixels)
}

mkdirSync(OUT, { recursive: true })
for (const size of SIZES) {
  writeFileSync(`${OUT}icon${size}.png`, render(size))
  console.log(`icons/icon${size}.png`)
}
