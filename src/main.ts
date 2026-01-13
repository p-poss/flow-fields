import { FlowField } from './FlowField'
import { Particle } from './Particle'
import { Controls, ControlsConfig } from './Controls'
import { SDF } from './SDF'

class FlowFieldVisualization {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private flowField: FlowField
  private particles: Particle[]
  private controls: Controls
  private config: ControlsConfig
  private sdf: SDF | null = null
  private animationId: number | null = null
  private width: number
  private height: number
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private fpsUpdateTime: number = 0

  constructor() {
    // Create canvas
    this.canvas = document.createElement('canvas')
    this.ctx = this.canvas.getContext('2d', { alpha: false })!

    // Set dimensions
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height
    document.body.appendChild(this.canvas)

    // Default configuration
    this.config = {
      particleCount: 20000,
      particleSpeed: 0.5,
      particleSpeedVariation: 0.5,
      noiseScale: 0.003,
      noiseOctaves: 1,
      noiseEvolution: 0,
      sdfStrength: 1.0,
      sdfFalloff: 50,
      strokeAlpha: 0.05,
      lineWidth: 0.8,
      hue: 0,
      saturation: 0,
      lightness: 100,
      colorMode: 'solid',
      fadeAmount: 0,
      paused: false,
    }

    // Initialize flow field
    this.flowField = new FlowField(this.config.noiseScale)
    this.flowField.setOctaves(this.config.noiseOctaves)
    this.flowField.setSDFStrength(this.config.sdfStrength)
    this.flowField.setSDFFalloff(this.config.sdfFalloff)

    // Initialize particles
    this.particles = this.createParticles(this.config.particleCount)

    // Initialize controls
    this.controls = new Controls(this.config, this.handleConfigChange.bind(this))

    // Set up rendering context
    this.setupContext()

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this))

    // Handle custom events from controls
    window.addEventListener('flowfield:regenerate', this.regenerate.bind(this))
    window.addEventListener('flowfield:clear', this.clearCanvas.bind(this))
    window.addEventListener('flowfield:save', this.saveImage.bind(this))
    window.addEventListener('flowfield:svg-upload', ((e: Event) => this.handleSVGUpload(e as CustomEvent<{ file: File }>)) as EventListener)
    window.addEventListener('flowfield:svg-clear', this.handleSVGClear.bind(this))
  }

  private createParticles(count: number): Particle[] {
    const particles: Particle[] = []
    for (let i = 0; i < count; i++) {
      particles.push(
        new Particle(
          this.width,
          this.height,
          this.config.particleSpeed,
          this.config.particleSpeedVariation
        )
      )
    }
    return particles
  }

  private setupContext(): void {
    // Fill background
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Set stroke style
    this.updateStrokeStyle()
    this.ctx.lineCap = 'round'
  }

  private updateStrokeStyle(): void {
    const { hue, saturation, lightness, strokeAlpha, lineWidth } = this.config
    this.ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${strokeAlpha})`
    this.ctx.lineWidth = lineWidth
  }

  private handleConfigChange(newConfig: ControlsConfig): void {
    const oldConfig = this.config
    this.config = newConfig

    // Update flow field if noise settings changed
    if (newConfig.noiseScale !== oldConfig.noiseScale) {
      this.flowField.setScale(newConfig.noiseScale)
    }
    if (newConfig.noiseOctaves !== oldConfig.noiseOctaves) {
      this.flowField.setOctaves(newConfig.noiseOctaves)
    }

    // Update SDF settings
    if (newConfig.sdfStrength !== oldConfig.sdfStrength) {
      this.flowField.setSDFStrength(newConfig.sdfStrength)
    }
    if (newConfig.sdfFalloff !== oldConfig.sdfFalloff) {
      this.flowField.setSDFFalloff(newConfig.sdfFalloff)
    }

    // Update particles if count changed
    if (newConfig.particleCount !== oldConfig.particleCount) {
      this.adjustParticleCount(newConfig.particleCount)
    }

    // Update particle speeds
    if (
      newConfig.particleSpeed !== oldConfig.particleSpeed ||
      newConfig.particleSpeedVariation !== oldConfig.particleSpeedVariation
    ) {
      this.particles.forEach(p => {
        p.setSpeed(newConfig.particleSpeed, newConfig.particleSpeedVariation)
      })
    }

    // Update stroke style
    this.updateStrokeStyle()
  }

  private adjustParticleCount(targetCount: number): void {
    const currentCount = this.particles.length

    if (targetCount > currentCount) {
      // Add more particles
      for (let i = currentCount; i < targetCount; i++) {
        this.particles.push(
          new Particle(
            this.width,
            this.height,
            this.config.particleSpeed,
            this.config.particleSpeedVariation
          )
        )
      }
    } else if (targetCount < currentCount) {
      // Remove excess particles
      this.particles.length = targetCount
    }
  }

  private handleResize(): void {
    // Store the current image data
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height)

    // Update dimensions
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.canvas.width = this.width
    this.canvas.height = this.height

    // Restore context settings and background
    this.setupContext()

    // Put back the image data (it will be clipped to new size)
    this.ctx.putImageData(imageData, 0, 0)

    // Update particle bounds
    this.particles.forEach(p => p.setBounds(this.width, this.height))

    // Regenerate SDF if loaded (needs new dimensions)
    // Note: This would require re-uploading the SVG, which we don't store
    // For now, clear SDF on resize
    if (this.sdf) {
      this.handleSVGClear()
    }
  }

  private regenerate(): void {
    // Create new flow field with new seed
    this.flowField.regenerate()
    this.flowField.setScale(this.config.noiseScale)
    this.flowField.setOctaves(this.config.noiseOctaves)

    // Re-attach SDF if present
    if (this.sdf) {
      this.flowField.setSDF(this.sdf)
    }

    // Reset all particles
    this.particles.forEach(p => p.reset())

    // Clear canvas
    this.clearCanvas()
  }

  private clearCanvas(): void {
    this.ctx.fillStyle = '#000000'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.updateStrokeStyle()
  }

  private saveImage(): void {
    const link = document.createElement('a')
    link.download = `flow-field-${Date.now()}.png`
    link.href = this.canvas.toDataURL('image/png')
    link.click()
  }

  private async handleSVGUpload(event: CustomEvent<{ file: File }>): Promise<void> {
    const file = event.detail.file
    if (!file) return

    try {
      const svgString = await file.text()

      // Create and generate SDF
      this.sdf = new SDF(4) // 4px resolution
      await this.sdf.fromSVG(svgString, this.width, this.height)

      // Attach to flow field
      this.flowField.setSDF(this.sdf)

      // Update UI status
      this.controls.updateSVGStatus(file.name)

      // Reset particles and clear canvas to see effect
      this.particles.forEach(p => p.reset())
      this.clearCanvas()

    } catch (error) {
      console.error('Failed to load SVG:', error)
      this.controls.updateSVGStatus(null)
    }
  }

  private handleSVGClear(): void {
    if (this.sdf) {
      this.sdf.clear()
      this.sdf = null
    }
    this.flowField.setSDF(null)
    this.controls.updateSVGStatus(null)
  }

  private getParticleColor(particle: Particle, index: number): string {
    const { hue, saturation, lightness, strokeAlpha, colorMode } = this.config

    switch (colorMode) {
      case 'rainbow': {
        // Color based on particle angle/position
        const angle = Math.atan2(particle.y - this.height / 2, particle.x - this.width / 2)
        const h = ((angle + Math.PI) / (2 * Math.PI)) * 360
        return `hsla(${h}, ${saturation || 70}%, ${lightness || 60}%, ${strokeAlpha})`
      }
      case 'gradient': {
        // Color based on particle index for gradient effect
        const h = (hue + (index / this.particles.length) * 60) % 360
        return `hsla(${h}, ${saturation}%, ${lightness}%, ${strokeAlpha})`
      }
      default:
        return `hsla(${hue}, ${saturation}%, ${lightness}%, ${strokeAlpha})`
    }
  }

  private update(timestamp: number): void {
    // FPS calculation
    this.frameCount++
    if (timestamp - this.fpsUpdateTime >= 1000) {
      this.controls.updateFPS(this.frameCount)
      this.frameCount = 0
      this.fpsUpdateTime = timestamp
    }

    if (this.config.paused) return

    // Apply fade effect if enabled
    if (this.config.fadeAmount > 0) {
      this.ctx.fillStyle = `rgba(0, 0, 0, ${this.config.fadeAmount})`
      this.ctx.fillRect(0, 0, this.width, this.height)
    }

    // Evolve flow field if enabled
    if (this.config.noiseEvolution > 0) {
      this.flowField.evolve(this.config.noiseEvolution)
    }

    // Update and draw particles
    const useDynamicColor = this.config.colorMode !== 'solid'

    if (!useDynamicColor) {
      // Batch all particles with same color
      this.ctx.beginPath()
      for (const particle of this.particles) {
        particle.update(this.flowField)
        this.ctx.moveTo(particle.prevX, particle.prevY)
        this.ctx.lineTo(particle.x, particle.y)
      }
      this.ctx.stroke()
    } else {
      // Individual colors per particle
      for (let i = 0; i < this.particles.length; i++) {
        const particle = this.particles[i]
        particle.update(this.flowField)
        this.ctx.strokeStyle = this.getParticleColor(particle, i)
        particle.draw(this.ctx)
      }
    }

    this.lastFrameTime = timestamp
  }

  private animate(timestamp: number): void {
    this.update(timestamp)
    this.animationId = requestAnimationFrame(this.animate.bind(this))
  }

  start(): void {
    if (this.animationId !== null) return
    this.lastFrameTime = performance.now()
    this.fpsUpdateTime = this.lastFrameTime
    this.animate(this.lastFrameTime)
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
  }
}

// Initialize and start
const visualization = new FlowFieldVisualization()
visualization.start()
