import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
        style={{ maxWidth: 'min(380px, calc(100vw - 3rem))' }}
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
                t.type === 'success'
                  ? 'border-[#25D366]/30 bg-[#0a0a0a]/95 text-[#25D366]'
                  : t.type === 'error'
                  ? 'border-red-500/30 bg-[#0a0a0a]/95 text-red-400'
                  : t.type === 'warning'
                  ? 'border-orange-500/30 bg-[#0a0a0a]/95 text-orange-400'
                  : 'border-primary/30 bg-[#0a0a0a]/95 text-primary'
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {t.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {t.type === 'error' && <XCircle className="h-4 w-4" />}
                {t.type === 'warning' && <AlertTriangle className="h-4 w-4" />}
                {t.type === 'info' && <Info className="h-4 w-4" />}
              </span>
              <p className="flex-1 text-sm font-medium leading-snug text-white/90">{t.message}</p>
              <button
                onClick={() => remove(t.id)}
                className="shrink-0 mt-0.5 opacity-50 hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
