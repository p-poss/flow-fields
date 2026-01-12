export interface ControlsConfig {
  // Particles
  particleCount: number
  particleSpeed: number
  particleSpeedVariation: number

  // Flow field
  noiseScale: number
  noiseOctaves: number
  noiseEvolution: number

  // Rendering
  strokeAlpha: number
  lineWidth: number
  hue: number
  saturation: number
  lightness: number
  colorMode: 'solid' | 'rainbow' | 'gradient'
  fadeAmount: number

  // Animation
  paused: boolean
}

export type ControlChangeCallback = (config: ControlsConfig) => void

interface ControlDef {
  key: keyof ControlsConfig
  label: string
  min: number
  max: number
  step: number
  unit?: string
}

const PARTICLE_CONTROLS: ControlDef[] = [
  { key: 'particleCount', label: 'Particle Count', min: 1000, max: 100000, step: 1000 },
  { key: 'particleSpeed', label: 'Speed', min: 0.1, max: 10, step: 0.1 },
  { key: 'particleSpeedVariation', label: 'Speed Variation', min: 0, max: 5, step: 0.1 },
]

const FLOW_CONTROLS: ControlDef[] = [
  { key: 'noiseScale', label: 'Noise Scale', min: 0.0005, max: 0.02, step: 0.0005 },
  { key: 'noiseOctaves', label: 'Noise Octaves', min: 1, max: 6, step: 1 },
  { key: 'noiseEvolution', label: 'Evolution Speed', min: 0, max: 0.01, step: 0.0005 },
]

const RENDER_CONTROLS: ControlDef[] = [
  { key: 'strokeAlpha', label: 'Stroke Opacity', min: 0.01, max: 0.3, step: 0.01 },
  { key: 'lineWidth', label: 'Line Width', min: 0.1, max: 3, step: 0.1 },
  { key: 'fadeAmount', label: 'Trail Fade', min: 0, max: 0.1, step: 0.005 },
]

const COLOR_CONTROLS: ControlDef[] = [
  { key: 'hue', label: 'Hue', min: 0, max: 360, step: 1, unit: '°' },
  { key: 'saturation', label: 'Saturation', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'lightness', label: 'Lightness', min: 0, max: 100, step: 1, unit: '%' },
]

const PRESETS: Record<string, Partial<ControlsConfig>> = {
  'Classic Smoke': {
    particleCount: 20000,
    particleSpeed: 2,
    noiseScale: 0.003,
    noiseOctaves: 1,
    noiseEvolution: 0,
    strokeAlpha: 0.05,
    lineWidth: 0.8,
    hue: 0,
    saturation: 0,
    lightness: 100,
    colorMode: 'solid',
    fadeAmount: 0,
  },
  'Ocean Waves': {
    particleCount: 15000,
    particleSpeed: 1.5,
    noiseScale: 0.004,
    noiseOctaves: 2,
    noiseEvolution: 0.001,
    strokeAlpha: 0.06,
    lineWidth: 1,
    hue: 200,
    saturation: 70,
    lightness: 60,
    colorMode: 'solid',
    fadeAmount: 0.002,
  },
  'Fire Storm': {
    particleCount: 25000,
    particleSpeed: 3,
    noiseScale: 0.005,
    noiseOctaves: 3,
    noiseEvolution: 0.003,
    strokeAlpha: 0.04,
    lineWidth: 0.6,
    hue: 20,
    saturation: 100,
    lightness: 50,
    colorMode: 'gradient',
    fadeAmount: 0.005,
  },
  'Aurora': {
    particleCount: 12000,
    particleSpeed: 1,
    noiseScale: 0.002,
    noiseOctaves: 4,
    noiseEvolution: 0.0005,
    strokeAlpha: 0.08,
    lineWidth: 1.2,
    hue: 150,
    saturation: 80,
    lightness: 60,
    colorMode: 'rainbow',
    fadeAmount: 0.001,
  },
  'Silk Threads': {
    particleCount: 8000,
    particleSpeed: 0.5,
    noiseScale: 0.001,
    noiseOctaves: 2,
    noiseEvolution: 0,
    strokeAlpha: 0.15,
    lineWidth: 0.3,
    hue: 280,
    saturation: 40,
    lightness: 80,
    colorMode: 'solid',
    fadeAmount: 0,
  },
  'Chaos': {
    particleCount: 50000,
    particleSpeed: 5,
    noiseScale: 0.015,
    noiseOctaves: 6,
    noiseEvolution: 0.005,
    strokeAlpha: 0.02,
    lineWidth: 0.5,
    hue: 0,
    saturation: 0,
    lightness: 100,
    colorMode: 'rainbow',
    fadeAmount: 0.01,
  },
}

export class Controls {
  private container: HTMLElement
  private config: ControlsConfig
  private onChange: ControlChangeCallback
  private isCollapsed = false

  constructor(initialConfig: ControlsConfig, onChange: ControlChangeCallback) {
    this.config = { ...initialConfig }
    this.onChange = onChange
    this.container = this.createContainer()
    this.render()
    document.body.appendChild(this.container)
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div')
    container.id = 'controls-panel'
    container.innerHTML = `
      <style>
        #controls-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 320px;
          max-height: calc(100vh - 40px);
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          overflow: hidden;
          transition: transform 0.3s ease, opacity 0.3s ease;
          z-index: 1000;
        }

        #controls-panel.collapsed {
          transform: translateX(calc(100% + 10px));
        }

        #controls-panel.collapsed .toggle-btn {
          transform: translateX(calc(-100% - 30px));
        }

        .controls-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
        }

        .controls-header h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }

        .toggle-btn {
          position: absolute;
          left: -44px;
          top: 20px;
          width: 32px;
          height: 32px;
          background: rgba(0, 0, 0, 0.85);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, transform 0.3s ease;
        }

        .toggle-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .controls-body {
          padding: 8px 0;
          max-height: calc(100vh - 140px);
          overflow-y: auto;
        }

        .controls-body::-webkit-scrollbar {
          width: 6px;
        }

        .controls-body::-webkit-scrollbar-track {
          background: transparent;
        }

        .controls-body::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }

        .control-section {
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .control-section:last-child {
          border-bottom: none;
        }

        .section-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 12px;
        }

        .control-row {
          margin-bottom: 12px;
        }

        .control-row:last-child {
          margin-bottom: 0;
        }

        .control-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .control-label span {
          color: rgba(255, 255, 255, 0.8);
        }

        .control-value {
          color: rgba(255, 255, 255, 0.5);
          font-size: 12px;
          font-family: 'SF Mono', Monaco, monospace;
        }

        input[type="range"] {
          width: 100%;
          height: 4px;
          -webkit-appearance: none;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          outline: none;
        }

        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: #fff;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.1s;
        }

        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        input[type="range"]::-webkit-slider-thumb:active {
          transform: scale(1.1);
        }

        .button-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .button-group.single {
          grid-template-columns: 1fr;
        }

        .ctrl-btn {
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .ctrl-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .ctrl-btn:active {
          background: rgba(255, 255, 255, 0.2);
        }

        .ctrl-btn.primary {
          background: rgba(59, 130, 246, 0.5);
        }

        .ctrl-btn.primary:hover {
          background: rgba(59, 130, 246, 0.7);
        }

        .ctrl-btn.danger {
          background: rgba(239, 68, 68, 0.4);
        }

        .ctrl-btn.danger:hover {
          background: rgba(239, 68, 68, 0.6);
        }

        select {
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
          cursor: pointer;
          outline: none;
        }

        select:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        select option {
          background: #1a1a1a;
          color: #fff;
        }

        .color-mode-group {
          display: flex;
          gap: 6px;
        }

        .color-mode-btn {
          flex: 1;
          padding: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .color-mode-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .color-mode-btn.active {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          color: #fff;
        }

        .stats {
          display: flex;
          justify-content: space-between;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.03);
          font-size: 11px;
          color: rgba(255, 255, 255, 0.4);
        }

        .keyboard-hint {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.3);
          text-align: center;
          padding: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        kbd {
          display: inline-block;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          font-family: inherit;
          font-size: 10px;
        }
      </style>
    `
    return container
  }

  private render(): void {
    const content = document.createElement('div')
    content.innerHTML = `
      <button class="toggle-btn" title="Toggle Controls">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v18M3 12h18"/>
        </svg>
      </button>

      <div class="controls-header">
        <h2>Flow Field</h2>
        <button class="ctrl-btn" id="pause-btn" style="padding: 6px 12px; font-size: 12px;">
          ${this.config.paused ? 'Play' : 'Pause'}
        </button>
      </div>

      <div class="controls-body">
        <div class="control-section">
          <div class="section-title">Presets</div>
          <select id="preset-select">
            <option value="">Select a preset...</option>
            ${Object.keys(PRESETS).map(name => `<option value="${name}">${name}</option>`).join('')}
          </select>
        </div>

        <div class="control-section">
          <div class="section-title">Particles</div>
          ${this.renderSliders(PARTICLE_CONTROLS)}
        </div>

        <div class="control-section">
          <div class="section-title">Flow Field</div>
          ${this.renderSliders(FLOW_CONTROLS)}
        </div>

        <div class="control-section">
          <div class="section-title">Rendering</div>
          ${this.renderSliders(RENDER_CONTROLS)}
        </div>

        <div class="control-section">
          <div class="section-title">Color</div>
          <div class="control-row">
            <div class="color-mode-group">
              <button class="color-mode-btn ${this.config.colorMode === 'solid' ? 'active' : ''}" data-mode="solid">Solid</button>
              <button class="color-mode-btn ${this.config.colorMode === 'rainbow' ? 'active' : ''}" data-mode="rainbow">Rainbow</button>
              <button class="color-mode-btn ${this.config.colorMode === 'gradient' ? 'active' : ''}" data-mode="gradient">Gradient</button>
            </div>
          </div>
          ${this.renderSliders(COLOR_CONTROLS)}
        </div>

        <div class="control-section">
          <div class="section-title">Actions</div>
          <div class="button-group">
            <button class="ctrl-btn primary" id="regenerate-btn">Regenerate</button>
            <button class="ctrl-btn danger" id="clear-btn">Clear Canvas</button>
          </div>
          <div class="button-group single" style="margin-top: 8px;">
            <button class="ctrl-btn" id="save-btn">Save Image</button>
          </div>
        </div>
      </div>

      <div class="stats">
        <span id="fps-display">FPS: --</span>
        <span id="particle-display">Particles: ${this.config.particleCount.toLocaleString()}</span>
      </div>

      <div class="keyboard-hint">
        <kbd>Space</kbd> Pause &nbsp; <kbd>R</kbd> Regenerate &nbsp; <kbd>H</kbd> Hide
      </div>
    `

    this.container.appendChild(content)
    this.attachEventListeners()
  }

  private renderSliders(controls: ControlDef[]): string {
    return controls.map(ctrl => {
      const value = this.config[ctrl.key] as number
      const displayValue = ctrl.step < 1 ? value.toFixed(ctrl.step < 0.01 ? 4 : 2) : value
      return `
        <div class="control-row">
          <div class="control-label">
            <span>${ctrl.label}</span>
            <span class="control-value" data-value-for="${ctrl.key}">${displayValue}${ctrl.unit || ''}</span>
          </div>
          <input
            type="range"
            data-key="${ctrl.key}"
            min="${ctrl.min}"
            max="${ctrl.max}"
            step="${ctrl.step}"
            value="${value}"
          />
        </div>
      `
    }).join('')
  }

  private attachEventListeners(): void {
    // Toggle panel
    const toggleBtn = this.container.querySelector('.toggle-btn') as HTMLButtonElement
    toggleBtn.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed
      this.container.classList.toggle('collapsed', this.isCollapsed)
      const icon = this.isCollapsed
        ? '<path d="M9 18l6-6-6-6"/>'
        : '<path d="M12 3v18M3 12h18"/>'
      toggleBtn.querySelector('svg')!.innerHTML = icon
    })

    // Sliders
    this.container.querySelectorAll('input[type="range"]').forEach(input => {
      input.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement
        const key = target.dataset.key as keyof ControlsConfig
        const value = parseFloat(target.value)

        ;(this.config as any)[key] = value

        // Update display value
        const valueDisplay = this.container.querySelector(`[data-value-for="${key}"]`)
        if (valueDisplay) {
          const ctrl = [...PARTICLE_CONTROLS, ...FLOW_CONTROLS, ...RENDER_CONTROLS, ...COLOR_CONTROLS]
            .find(c => c.key === key)
          if (ctrl) {
            const displayValue = ctrl.step < 1 ? value.toFixed(ctrl.step < 0.01 ? 4 : 2) : value
            valueDisplay.textContent = `${displayValue}${ctrl.unit || ''}`
          }
        }

        // Update particle count display
        if (key === 'particleCount') {
          const particleDisplay = this.container.querySelector('#particle-display')
          if (particleDisplay) {
            particleDisplay.textContent = `Particles: ${value.toLocaleString()}`
          }
        }

        this.onChange(this.config)
      })
    })

    // Color mode buttons
    this.container.querySelectorAll('.color-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement
        const mode = target.dataset.mode as ControlsConfig['colorMode']
        this.config.colorMode = mode

        this.container.querySelectorAll('.color-mode-btn').forEach(b => b.classList.remove('active'))
        target.classList.add('active')

        this.onChange(this.config)
      })
    })

    // Pause button
    const pauseBtn = this.container.querySelector('#pause-btn') as HTMLButtonElement
    pauseBtn.addEventListener('click', () => {
      this.config.paused = !this.config.paused
      pauseBtn.textContent = this.config.paused ? 'Play' : 'Pause'
      this.onChange(this.config)
    })

    // Preset select
    const presetSelect = this.container.querySelector('#preset-select') as HTMLSelectElement
    presetSelect.addEventListener('change', () => {
      const presetName = presetSelect.value
      if (presetName && PRESETS[presetName]) {
        this.applyPreset(PRESETS[presetName])
        presetSelect.value = ''
      }
    })

    // Action buttons - dispatch custom events
    this.container.querySelector('#regenerate-btn')!.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('flowfield:regenerate'))
    })

    this.container.querySelector('#clear-btn')!.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('flowfield:clear'))
    })

    this.container.querySelector('#save-btn')!.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('flowfield:save'))
    })

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          pauseBtn.click()
          break
        case 'r':
          window.dispatchEvent(new CustomEvent('flowfield:regenerate'))
          break
        case 'h':
          toggleBtn.click()
          break
        case 's':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault()
            window.dispatchEvent(new CustomEvent('flowfield:save'))
          }
          break
      }
    })
  }

  private applyPreset(preset: Partial<ControlsConfig>): void {
    Object.assign(this.config, preset)
    this.updateAllSliders()
    this.updateColorModeButtons()
    this.onChange(this.config)

    // Trigger regenerate to apply new flow field settings
    window.dispatchEvent(new CustomEvent('flowfield:regenerate'))
  }

  private updateAllSliders(): void {
    this.container.querySelectorAll('input[type="range"]').forEach(input => {
      const el = input as HTMLInputElement
      const key = el.dataset.key as keyof ControlsConfig
      const value = this.config[key] as number
      el.value = String(value)

      const valueDisplay = this.container.querySelector(`[data-value-for="${key}"]`)
      if (valueDisplay) {
        const ctrl = [...PARTICLE_CONTROLS, ...FLOW_CONTROLS, ...RENDER_CONTROLS, ...COLOR_CONTROLS]
          .find(c => c.key === key)
        if (ctrl) {
          const displayValue = ctrl.step < 1 ? value.toFixed(ctrl.step < 0.01 ? 4 : 2) : value
          valueDisplay.textContent = `${displayValue}${ctrl.unit || ''}`
        }
      }
    })

    // Update particle count display
    const particleDisplay = this.container.querySelector('#particle-display')
    if (particleDisplay) {
      particleDisplay.textContent = `Particles: ${this.config.particleCount.toLocaleString()}`
    }
  }

  private updateColorModeButtons(): void {
    this.container.querySelectorAll('.color-mode-btn').forEach(btn => {
      const el = btn as HTMLButtonElement
      el.classList.toggle('active', el.dataset.mode === this.config.colorMode)
    })
  }

  updateFPS(fps: number): void {
    const fpsDisplay = this.container.querySelector('#fps-display')
    if (fpsDisplay) {
      fpsDisplay.textContent = `FPS: ${fps.toFixed(0)}`
    }
  }

  getConfig(): ControlsConfig {
    return { ...this.config }
  }
}
