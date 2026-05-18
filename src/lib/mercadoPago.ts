const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

interface PayerInfo {
  email: string
  first_name?: string
  last_name?: string
  cpf?: string
}

interface BackUrls {
  success: string
  failure: string
  pending: string
}

export async function createCheckoutPreference(
  grandTotal: number,
  payer: PayerInfo,
  orderId: string,
  backUrls: BackUrls,
  itemsDescription?: string,
) {
  const { data, error } = await supabaseCall('create-payment', {
    grand_total: grandTotal,
    payer,
    order_id: orderId,
    back_urls: backUrls,
    items_description: itemsDescription,
  })
  if (error) throw new Error(error)
  return data as { preference_id: string; init_point: string; sandbox_init_point: string }
}

async function supabaseCall(functionName: string, body: unknown) {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errBody = await res.text()
    return { data: null, error: `HTTP ${res.status}: ${errBody}` }
  }

  const data = await res.json()
  return { data, error: null }
}
