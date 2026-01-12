/**
 * Simplex Noise implementation
 * Based on Stefan Gustavson's implementation
 */

const F2 = 0.5 * (Math.sqrt(3) - 1)
const G2 = (3 - Math.sqrt(3)) / 6

const grad3 = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
]

function buildPermutationTable(seed: number): Uint8Array {
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) {
    p[i] = i
  }

  // Seed-based shuffle
  let n = seed
  for (let i = 255; i > 0; i--) {
    n = (n * 16807) % 2147483647
    const j = n % (i + 1)
    const tmp = p[i]
    p[i] = p[j]
    p[j] = tmp
  }

  // Duplicate for overflow handling
  const perm = new Uint8Array(512)
  const permMod12 = new Uint8Array(512)
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]
    permMod12[i] = perm[i] % 12
  }

  return perm
}

export class SimplexNoise {
  private perm: Uint8Array
  private permMod12: Uint8Array

  constructor(seed: number = Math.random() * 2147483647) {
    this.perm = buildPermutationTable(seed)
    this.permMod12 = new Uint8Array(512)
    for (let i = 0; i < 512; i++) {
      this.permMod12[i] = this.perm[i] % 12
    }
  }

  noise2D(x: number, y: number): number {
    const perm = this.perm
    const permMod12 = this.permMod12

    // Skew input space to determine simplex cell
    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)

    // Unskew back to (x, y) space
    const t = (i + j) * G2
    const X0 = i - t
    const Y0 = j - t
    const x0 = x - X0
    const y0 = y - Y0

    // Determine which simplex we're in
    let i1: number, j1: number
    if (x0 > y0) {
      i1 = 1
      j1 = 0
    } else {
      i1 = 0
      j1 = 1
    }

    // Offsets for corners
    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2

    // Hash coordinates of corners
    const ii = i & 255
    const jj = j & 255
    const gi0 = permMod12[ii + perm[jj]]
    const gi1 = permMod12[ii + i1 + perm[jj + j1]]
    const gi2 = permMod12[ii + 1 + perm[jj + 1]]

    // Calculate contributions from corners
    let n0 = 0, n1 = 0, n2 = 0

    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 >= 0) {
      t0 *= t0
      n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0)
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 >= 0) {
      t1 *= t1
      n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1)
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 >= 0) {
      t2 *= t2
      n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2)
    }

    // Scale to [-1, 1]
    return 70 * (n0 + n1 + n2)
  }
}
