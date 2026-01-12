import { FlowField } from './FlowField'

export class Particle {
  x: number
  y: number
  prevX: number
  prevY: number
  speed: number
  baseSpeed: number
  width: number
  height: number

  constructor(width: number, height: number, speed: number, speedVariation: number) {
    this.width = width
    this.height = height
    this.baseSpeed = speed
    this.speed = speed + (Math.random() - 0.5) * 2 * speedVariation

    // Initialize at random position
    this.x = Math.random() * width
    this.y = Math.random() * height
    this.prevX = this.x
    this.prevY = this.y
  }

  update(flowField: FlowField): void {
    // Store previous position for drawing
    this.prevX = this.x
    this.prevY = this.y

    // Get flow vector at current position
    const vector = flowField.getVector(this.x, this.y)

    // Apply velocity
    this.x += vector.x * this.speed
    this.y += vector.y * this.speed

    // Wrap around edges (respawn at opposite side)
    if (this.x < 0) this.x = this.width
    if (this.x > this.width) this.x = 0
    if (this.y < 0) this.y = this.height
    if (this.y > this.height) this.y = 0

    // If we wrapped, don't draw a line across the screen
    if (Math.abs(this.x - this.prevX) > this.width / 2) {
      this.prevX = this.x
    }
    if (Math.abs(this.y - this.prevY) > this.height / 2) {
      this.prevY = this.y
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath()
    ctx.moveTo(this.prevX, this.prevY)
    ctx.lineTo(this.x, this.y)
    ctx.stroke()
  }

  /**
   * Reset particle to a random position
   */
  reset(): void {
    this.x = Math.random() * this.width
    this.y = Math.random() * this.height
    this.prevX = this.x
    this.prevY = this.y
  }

  /**
   * Update bounds (for window resize)
   */
  setBounds(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  /**
   * Update speed with variation
   */
  setSpeed(speed: number, variation: number): void {
    this.baseSpeed = speed
    this.speed = speed + (Math.random() - 0.5) * 2 * variation
  }
}
