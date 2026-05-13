import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || ''
const MP_API = 'https://api.mercadopago.com'

interface Item {
  title: string
  quantity: number
  unit_price: number
  description?: string
}

interface CreatePaymentBody {
  items: Item[]
  payer: {
    email: string
    first_name?: string
    last_name?: string
  }
  payment_method: 'pix' | 'credit_card'
  order_id: string
  transaction_amount?: number
  token?: string
  installments?: number
  payment_method_id?: string
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  try {
    const body: CreatePaymentBody = await req.json()

    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago access token not configured' }),
        { status: 500 }
      )
    }

    if (body.payment_method === 'pix') {
      // Criar preferência para PIX
      const preferenceBody = {
        items: body.items.map((item) => ({
          title: item.title,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: 'BRL',
        })),
        payer: {
          email: body.payer.email,
          name: body.payer.first_name || 'Cliente',
          surname: body.payer.last_name || '',
        },
        payment_methods: {
          excluded_payment_types: [{ id: 'credit_card' }, { id: 'debit_card' }, { id: 'ticket' }],
          installments: 1,
        },
        date_of_expiration: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        external_reference: body.order_id,
        notification_url: `${req.headers.get('origin') || 'https://cuysmgukyikxdwsladeo.supabase.co'}/functions/v1/mp-webhook`,
      }

      const prefRes = await fetch(`${MP_API}/checkout/preferences`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(preferenceBody),
      })

      if (!prefRes.ok) {
        const errText = await prefRes.text()
        return new Response(
          JSON.stringify({ error: 'Failed to create preference', details: errText }),
          { status: prefRes.status }
        )
      }

      const preference = await prefRes.json()

      // Para PIX, criar pagamento diretamente
      const paymentBody = {
        transaction_amount: body.items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0),
        description: `Pedido #${body.order_id.slice(0, 8)}`,
        payment_method_id: 'pix',
        payer: { email: body.payer.email },
        external_reference: body.order_id,
        notification_url: `${req.headers.get('origin') || 'https://cuysmgukyikxdwsladeo.supabase.co'}/functions/v1/mp-webhook`,
      }

      const paymentRes = await fetch(`${MP_API}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
          'X-Idempotency-Key': body.order_id,
        },
        body: JSON.stringify(paymentBody),
      })

      if (!paymentRes.ok) {
        const errText = await paymentRes.text()
        return new Response(
          JSON.stringify({ error: 'Failed to create payment', details: errText }),
          { status: paymentRes.status }
        )
      }

      const payment = await paymentRes.json()

      return new Response(
        JSON.stringify({
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
          qr_code: payment.point_of_interaction?.transaction_data?.qr_code || '',
          qr_code_base64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || '',
          ticket_url: payment.point_of_interaction?.transaction_data?.ticket_url || '',
          preference_id: preference.id,
          init_point: preference.init_point,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } else {
      // Cartão de crédito - usar transaction_amount e token
      const paymentBody = {
        transaction_amount: body.transaction_amount || body.items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0),
        token: body.token,
        description: `Pedido #${body.order_id.slice(0, 8)}`,
        installments: body.installments || 1,
        payment_method_id: body.payment_method_id || 'master',
        issuer_id: '',
        payer: {
          email: body.payer.email,
          identification: { type: 'CPF', number: '' },
        },
        external_reference: body.order_id,
        notification_url: `${req.headers.get('origin') || 'https://cuysmgukyikxdwsladeo.supabase.co'}/functions/v1/mp-webhook`,
      }

      const paymentRes = await fetch(`${MP_API}/v1/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
          'X-Idempotency-Key': `${body.order_id}-card`,
        },
        body: JSON.stringify(paymentBody),
      })

      if (!paymentRes.ok) {
        const errText = await paymentRes.text()
        return new Response(
          JSON.stringify({ error: 'Failed to process card payment', details: errText }),
          { status: paymentRes.status }
        )
      }

      const payment = await paymentRes.json()

      return new Response(
        JSON.stringify({
          id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', details: err.message }),
      { status: 500 }
    )
  }
})
