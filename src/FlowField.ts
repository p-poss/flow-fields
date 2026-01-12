import { SimplexNoise } from './noise'

export interface Vector {
  x: number
  y: number
}

export class FlowField {
  private noise: SimplexNoise
  private scale: number
  private octaves: number
  private zOffset: number

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
    const angle = this.getAngle(x, y)
    return {
      x: Math.cos(angle),
      y: Math.sin(angle)
    }
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
}
