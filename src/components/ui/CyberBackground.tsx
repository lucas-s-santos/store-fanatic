import { motion } from 'framer-motion'

export function CyberBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#1f1a12_0%,#090909_45%,#030303_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/8 to-black/35" />

      <div className="hero-grid absolute inset-0 opacity-45" />
      <div className="noise-mask absolute inset-0 opacity-40" />

      <motion.div
        animate={{
          x: [0, 24, -14, 0],
          y: [0, -20, 12, 0],
          scale: [1, 1.06, 0.96, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-[-6%] top-[8%] h-[420px] w-[420px] rounded-full bg-primary/10 blur-[120px]"
      />

      <motion.div
        animate={{
          x: [0, -32, 18, 0],
          y: [0, 22, -12, 0],
          scale: [1, 0.94, 1.04, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute bottom-[6%] right-[-8%] h-[480px] w-[480px] rounded-full bg-primary/9 blur-[150px]"
      />

      <div className="absolute left-1/2 top-[32%] h-[320px] w-[720px] -translate-x-1/2 rounded-full bg-primary/6 blur-[130px]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/28 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
