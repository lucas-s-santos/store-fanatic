const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || ''
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

interface PaymentItem {
  title: string
  quantity: number
  unit_price: number
}

interface PayerInfo {
  email: string
  first_name?: string
  last_name?: string
}

export async function createPixPayment(
  items: PaymentItem[],
  payer: PayerInfo,
  orderId: string
) {
  try {
    const { data, error } = await supabaseCall('create-payment', {
      items,
      payer,
      payment_method: 'pix',
      order_id: orderId,
    })
    if (error) throw new Error(error)
    return data
  } catch (err) {
    console.error('Erro ao criar pagamento PIX:', err)
    return null
  }
}

export async function createCardPayment(
  items: PaymentItem[],
  payer: PayerInfo,
  orderId: string,
  token: string,
  transactionAmount: number,
  installments: number = 1,
  paymentMethodId: string = 'master'
) {
  try {
    const { data, error } = await supabaseCall('create-payment', {
      items,
      payer,
      payment_method: 'credit_card',
      order_id: orderId,
      token,
      transaction_amount: transactionAmount,
      installments,
      payment_method_id: paymentMethodId,
    })
    if (error) throw new Error(error)
    return data
  } catch (err) {
    console.error('Erro ao criar pagamento cartão:', err)
    return null
  }
}

async function supabaseCall(functionName: string, body: any) {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
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

export function getMpPublicKey() {
  return MP_PUBLIC_KEY
}
