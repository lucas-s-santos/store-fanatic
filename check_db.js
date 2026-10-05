import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cuysmgukyikxdwsladeo.supabase.co',
  process.env.SUPABASE_ANON_KEY
)

async function run() {
  const { data, error } = await supabase.from('products').select('*').limit(1)
  if (error) console.error(error)
  else console.log(Object.keys(data[0]))
}
run()
