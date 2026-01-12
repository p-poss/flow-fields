export const CONFIG = {
  // Particle settings
  particleCount: 20000,
  particleSpeed: 2,
  particleSpeedVariation: 0.5,

  // Flow field settings
  noiseScale: 0.003,
  noiseStrength: 1,

  // Rendering settings
  strokeAlpha: 0.05,
  lineWidth: 0.8,
  backgroundColor: '#000000',
  strokeColor: '255, 255, 255',

  // Canvas settings
  fullscreen: true,
  width: 1920,
  height: 1080,
} as const

export type Config = typeof CONFIG
