import { SimplexNoise } from './noise'
import { SDF } from './SDF'

export interface Vector {
  x: number
  y: number
}

export class FlowField {
  private noise: SimplexNoise
  private scale: number
  private octaves: number
  private zOffset: number
  private sdf: SDF | null = null
  private sdfStrength: number = 1.0
  private sdfFalloff: number = 50

  constructor(scale: number, seed?: number) {
    this.noise = new SimplexNoise(seed)
    this.scale = scale
    this.octaves = 1
    this.zOffset = 0
  }

  /**
   * Get the flow vector at a given position
   * Returns a unit vector pointing in the flow direction
   */
  getVector(x: number, y: number): Vector {
    // Get base Perlin flow vector
    const angle = this.getAngle(x, y)
    let vx = Math.cos(angle)
    let vy = Math.sin(angle)

    // Blend with SDF if present
    if (this.sdf && this.sdf.isLoaded()) {
      const distance = this.sdf.getDistance(x, y)
      const gradient = this.sdf.getGradient(x, y)

      // Only influence near boundaries (within falloff distance)
      const absDistance = Math.abs(distance)
      if (absDistance < this.sdfFalloff && (gradient.x !== 0 || gradient.y !== 0)) {
        // Influence strength: 1 at boundary, 0 at falloff distance
        const t = absDistance / this.sdfFalloff
        const influence = (1 - t * t) * this.sdfStrength // Quadratic falloff

        // Calculate tangent direction (perpendicular to gradient)
        // Flow should go around the shape, not into it
        let tangentX: number
        let tangentY: number

        if (distance < 0) {
          // Inside shape: flow towards nearest exit (along gradient)
          tangentX = gradient.x
          tangentY = gradient.y
        } else {
          // Outside shape: flow tangent to boundary
          // Choose tangent direction that aligns with current flow
          const dot = vx * (-gradient.y) + vy * gradient.x
          if (dot >= 0) {
            tangentX = -gradient.y
            tangentY = gradient.x
          } else {
            tangentX = gradient.y
            tangentY = -gradient.x
          }
        }

        // Blend flow with tangent
        vx = vx * (1 - influence) + tangentX * influence
        vy = vy * (1 - influence) + tangentY * influence
      }
    }

    // Normalize result
    const len = Math.sqrt(vx * vx + vy * vy)
    if (len > 0.0001) {
      vx /= len
      vy /= len
    }

    return { x: vx, y: vy }
  }

  /**
   * Get the flow angle at a given position using fractal noise
   * Returns angle in radians [0, 2π]
   */
  getAngle(x: number, y: number): number {
    let noiseValue = 0
    let amplitude = 1
    let frequency = this.scale
    let maxValue = 0

    // Fractal Brownian Motion (fBm) for more detailed noise
    for (let i = 0; i < this.octaves; i++) {
      // Use 3D noise with z offset for time evolution
      noiseValue += amplitude * this.noise3D(
        x * frequency,
        y * frequency,
        this.zOffset
      )
      maxValue += amplitude
      amplitude *= 0.5
      frequency *= 2
    }

    // Normalize to [-1, 1]
    noiseValue /= maxValue

    // Map noise value [-1, 1] to angle [0, 2π]
    return (noiseValue + 1) * Math.PI
  }

  /**
   * Simple 3D noise approximation using 2D noise
   */
  private noise3D(x: number, y: number, z: number): number {
    // Create pseudo-3D noise by combining 2D samples
    const xy = this.noise.noise2D(x, y)
    const xz = this.noise.noise2D(x + 1000, z)
    const yz = this.noise.noise2D(y + 2000, z)
    return (xy + xz + yz) / 3
  }

  /**
   * Update scale
   */
  setScale(scale: number): void {
    this.scale = scale
  }

  /**
   * Set number of octaves for fractal noise
   */
  setOctaves(octaves: number): void {
    this.octaves = Math.max(1, Math.min(8, octaves))
  }

  /**
   * Evolve the flow field over time
   */
  evolve(amount: number): void {
    this.zOffset += amount
  }

  /**
   * Reset evolution
   */
  resetEvolution(): void {
    this.zOffset = 0
  }

  /**
   * Regenerate with new seed
   */
  regenerate(seed?: number): void {
    this.noise = new SimplexNoise(seed ?? Math.random() * 2147483647)
    this.zOffset = 0
  }

  /**
   * Set SDF for boundary influence
   */
  setSDF(sdf: SDF | null): void {
    this.sdf = sdf
  }

  /**
   * Set SDF influence strength (0-2)
   */
  setSDFStrength(strength: number): void {
    this.sdfStrength = Math.max(0, Math.min(2, strength))
  }

  /**
   * Set SDF falloff distance (how far from boundary influence extends)
   */
  setSDFFalloff(falloff: number): void {
    this.sdfFalloff = Math.max(1, falloff)
  }
}
