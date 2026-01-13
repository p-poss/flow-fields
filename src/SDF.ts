export interface Vector {
  x: number
  y: number
}

export class SDF {
  private grid: Float32Array
  private gradientX: Float32Array
  private gradientY: Float32Array
  private gridWidth: number
  private gridHeight: number
  private resolution: number
  private loaded: boolean = false

  constructor(resolution: number = 4) {
    this.resolution = resolution
    this.grid = new Float32Array(0)
    this.gradientX = new Float32Array(0)
    this.gradientY = new Float32Array(0)
    this.gridWidth = 0
    this.gridHeight = 0
  }

  async fromSVG(svgString: string, canvasWidth: number, canvasHeight: number): Promise<void> {
    this.gridWidth = Math.ceil(canvasWidth / this.resolution)
    this.gridHeight = Math.ceil(canvasHeight / this.resolution)

    // Create offscreen canvas to rasterize SVG
    const canvas = document.createElement('canvas')
    canvas.width = this.gridWidth
    canvas.height = this.gridHeight
    const ctx = canvas.getContext('2d')!

    // Load and draw SVG
    const img = new Image()
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        // Clear with black (outside)
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, this.gridWidth, this.gridHeight)

        // Draw SVG scaled to grid size (white = inside)
        ctx.drawImage(img, 0, 0, this.gridWidth, this.gridHeight)
        URL.revokeObjectURL(url)
        resolve()
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load SVG'))
      }
      img.src = url
    })

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, this.gridWidth, this.gridHeight)
    const pixels = imageData.data

    // Create binary mask (true = inside shape)
    const inside = new Uint8Array(this.gridWidth * this.gridHeight)
    for (let i = 0; i < inside.length; i++) {
      // Check if pixel is bright (inside shape)
      const r = pixels[i * 4]
      const g = pixels[i * 4 + 1]
      const b = pixels[i * 4 + 2]
      inside[i] = (r + g + b) > 384 ? 1 : 0 // threshold ~50% brightness
    }

    // Compute signed distance field using two-pass algorithm
    this.grid = this.computeDistanceField(inside)

    // Compute gradients for flow deflection
    this.computeGradients()

    this.loaded = true
  }

  private computeDistanceField(inside: Uint8Array): Float32Array {
    const w = this.gridWidth
    const h = this.gridHeight
    const INF = w + h

    // Distance to nearest inside pixel (for outside pixels)
    const distOutside = new Float32Array(w * h).fill(INF)
    // Distance to nearest outside pixel (for inside pixels)
    const distInside = new Float32Array(w * h).fill(INF)

    // Initialize
    for (let i = 0; i < w * h; i++) {
      if (inside[i]) {
        distOutside[i] = 0 // Inside pixels have 0 distance to inside
      } else {
        distInside[i] = 0 // Outside pixels have 0 distance to outside
      }
    }

    // Apply 2D distance transform to both
    this.distanceTransform2D(distOutside, w, h)
    this.distanceTransform2D(distInside, w, h)

    // Combine into signed distance field
    // Negative = inside, Positive = outside
    const sdf = new Float32Array(w * h)
    for (let i = 0; i < w * h; i++) {
      const dOut = Math.sqrt(distOutside[i]) * this.resolution
      const dIn = Math.sqrt(distInside[i]) * this.resolution
      sdf[i] = inside[i] ? -dIn : dOut
    }

    return sdf
  }

  private distanceTransform2D(dist: Float32Array, w: number, h: number): void {
    // Meijster's algorithm - linear time distance transform
    const INF = (w + h) * (w + h)

    // Horizontal pass
    for (let y = 0; y < h; y++) {
      // Forward scan
      for (let x = 1; x < w; x++) {
        const idx = y * w + x
        const prev = y * w + x - 1
        if (dist[idx] > dist[prev] + 1) {
          dist[idx] = dist[prev] + 1
        }
      }
      // Backward scan
      for (let x = w - 2; x >= 0; x--) {
        const idx = y * w + x
        const next = y * w + x + 1
        if (dist[idx] > dist[next] + 1) {
          dist[idx] = dist[next] + 1
        }
      }
    }

    // Vertical pass with squared Euclidean distance
    const f = new Float32Array(h)
    const v = new Int32Array(h)
    const z = new Float32Array(h + 1)

    for (let x = 0; x < w; x++) {
      // Extract column
      for (let y = 0; y < h; y++) {
        f[y] = dist[y * w + x] * dist[y * w + x] // square the horizontal distances
      }

      // Compute lower envelope
      let k = 0
      v[0] = 0
      z[0] = -INF
      z[1] = INF

      for (let q = 1; q < h; q++) {
        let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        while (s <= z[k]) {
          k--
          s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
        }
        k++
        v[k] = q
        z[k] = s
        z[k + 1] = INF
      }

      // Fill in column with squared distances
      k = 0
      for (let y = 0; y < h; y++) {
        while (z[k + 1] < y) k++
        const dy = y - v[k]
        dist[y * w + x] = f[v[k]] + dy * dy
      }
    }
  }

  private computeGradients(): void {
    const w = this.gridWidth
    const h = this.gridHeight

    this.gradientX = new Float32Array(w * h)
    this.gradientY = new Float32Array(w * h)

    // Central differences for gradient
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x

        // X gradient
        const x0 = Math.max(0, x - 1)
        const x1 = Math.min(w - 1, x + 1)
        this.gradientX[idx] = (this.grid[y * w + x1] - this.grid[y * w + x0]) / ((x1 - x0) * this.resolution)

        // Y gradient
        const y0 = Math.max(0, y - 1)
        const y1 = Math.min(h - 1, y + 1)
        this.gradientY[idx] = (this.grid[y1 * w + x] - this.grid[y0 * w + x]) / ((y1 - y0) * this.resolution)
      }
    }
  }

  getDistance(x: number, y: number): number {
    if (!this.loaded) return Infinity

    // Convert to grid coordinates
    const gx = x / this.resolution
    const gy = y / this.resolution

    // Bilinear interpolation
    return this.sampleBilinear(this.grid, gx, gy)
  }

  getGradient(x: number, y: number): Vector {
    if (!this.loaded) return { x: 0, y: 0 }

    const gx = x / this.resolution
    const gy = y / this.resolution

    const gradX = this.sampleBilinear(this.gradientX, gx, gy)
    const gradY = this.sampleBilinear(this.gradientY, gx, gy)

    // Normalize gradient
    const len = Math.sqrt(gradX * gradX + gradY * gradY)
    if (len < 0.0001) return { x: 0, y: 0 }

    return { x: gradX / len, y: gradY / len }
  }

  private sampleBilinear(grid: Float32Array, gx: number, gy: number): number {
    const x0 = Math.floor(gx)
    const y0 = Math.floor(gy)
    const x1 = Math.min(x0 + 1, this.gridWidth - 1)
    const y1 = Math.min(y0 + 1, this.gridHeight - 1)

    const fx = gx - x0
    const fy = gy - y0

    const v00 = this.getGridValue(grid, x0, y0)
    const v10 = this.getGridValue(grid, x1, y0)
    const v01 = this.getGridValue(grid, x0, y1)
    const v11 = this.getGridValue(grid, x1, y1)

    // Bilinear interpolation
    const v0 = v00 * (1 - fx) + v10 * fx
    const v1 = v01 * (1 - fx) + v11 * fx

    return v0 * (1 - fy) + v1 * fy
  }

  private getGridValue(grid: Float32Array, x: number, y: number): number {
    if (x < 0 || x >= this.gridWidth || y < 0 || y >= this.gridHeight) {
      return Infinity
    }
    return grid[y * this.gridWidth + x]
  }

  isLoaded(): boolean {
    return this.loaded
  }

  clear(): void {
    this.grid = new Float32Array(0)
    this.gradientX = new Float32Array(0)
    this.gradientY = new Float32Array(0)
    this.loaded = false
  }

  getGridWidth(): number {
    return this.gridWidth
  }

  getGridHeight(): number {
    return this.gridHeight
  }
}
