import { motion } from 'framer-motion'

/**
 * Subtle ambient background with warm gold light orbs
 * and a faint grid overlay — gives depth without distraction.
 */
export function CyberBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080c14] via-[#0a0f1a] to-[#060a12]" />

      {/* Gold ambient blob — top left */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -20, 15, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-[10%] -left-[5%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,170,0,0.07)_0%,transparent_70%)]"
      />

      {/* Gold ambient blob — bottom right */}
      <motion.div
        animate={{
          x: [0, -25, 20, 0],
          y: [0, 25, -15, 0],
          scale: [1, 0.9, 1.05, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-[8%] -right-[8%] h-[450px] w-[450px] rounded-full bg-[radial-gradient(circle,rgba(255,170,0,0.05)_0%,transparent_70%)]"
      />

      {/* Subtle center glow */}
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 h-[600px] w-[800px] bg-[radial-gradient(ellipse,rgba(255,170,0,0.03)_0%,transparent_60%)]" />

      {/* Grid pattern */}
      <div className="absolute inset-0 grid-overlay opacity-40" />

      {/* Noise */}
      <div className="absolute inset-0 noise-mask" />

      {/* Top vignette */}
      <div className="absolute inset-x-0 top-0 h-[200px] bg-gradient-to-b from-background to-transparent" />
    </div>
  )
}
