import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cuysmgukyikxdwsladeo.supabase.co'
const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY
const BUCKET = 'jersey-images'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const FILES_TO_DELETE = [
  'jersey/1778965219178.png',
  'jersey/1779039183928.webp',
]

const { error } = await supabase.storage.from(BUCKET).remove(FILES_TO_DELETE)
if (error) console.error('Erro:', error.message)
else console.log('Arquivos soltos deletados:', FILES_TO_DELETE)
