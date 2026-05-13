import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://cuysmgukyikxdwsladeo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eXNtZ3VreWlreGR3c2xhZGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4MjU5ODAsImV4cCI6MjA5MTQwMTk4MH0.GbYBCpLxWmUpleH-sPQ2Gh4dAjyobG2Kxq5J-ci8yps'
)

async function run() {
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false }).limit(1)
  if (error) console.error(error)
  else console.log(data[0])
}
run()
