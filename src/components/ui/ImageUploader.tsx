import { useRef, useState } from 'react'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ImageUploaderProps {
  value: string
  onChange: (url: string) => void
  bucket?: string
  folder?: string
  label?: string
  aspectRatio?: 'square' | 'portrait'
}

export function ImageUploader({
  value,
  onChange,
  bucket = 'jersey-images',
  folder = 'jersey',
  label,
  aspectRatio = 'square',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setUploading(true)

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${folder}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (err: any) {
      setError('Erro no upload: ' + (err.message || 'tente novamente'))
    } finally {
      setUploading(false)
    }
  }

  const previewHeight = aspectRatio === 'portrait' ? 'h-40' : 'h-28'
  const previewWidth = aspectRatio === 'portrait' ? 'w-28' : 'w-28'

  return (
    <div className="space-y-2" translate="no">
      {label && <label className="form-label">{label}</label>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        autoComplete="off"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      <div className="flex items-start gap-4">
        {/* Zona de clique */}
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className={`flex flex-col items-center justify-center gap-2 flex-1 border-2 border-dashed rounded-xl transition-all
            ${uploading
              ? 'border-primary/30 bg-primary/5 cursor-wait'
              : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-primary/40 cursor-pointer'
            } ${aspectRatio === 'portrait' ? 'h-40' : 'h-28'}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Enviando...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <span className="text-xs text-muted-foreground block">Clique para selecionar</span>
                <span className="text-[10px] text-muted-foreground opacity-60 block">JPG, PNG, WEBP</span>
              </div>
            </div>
          )}
        </button>

        {/* Preview */}
        <div className={`${previewWidth} ${previewHeight} shrink-0 rounded-xl border border-white/10 bg-white/5 overflow-hidden flex items-center justify-center relative`}>
          {value ? (
            <>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-destructive transition-colors"
                title="Remover imagem"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <ImageIcon className="h-7 w-7 text-white/20" />
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
