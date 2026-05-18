import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const MERCADO_PAGO_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || ''
const MP_API = 'https://api.mercadopago.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CreatePreferenceBody {
  order_id: string
  grand_total: number
  payer: {
    email: string
    first_name?: string
    last_name?: string
    cpf?: string
  }
  back_urls: {
    success: string
    failure: string
    pending: string
  }
  items_description?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body: CreatePreferenceBody = await req.json()

    if (!MERCADO_PAGO_ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Mercado Pago access token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const notificationUrl = `https://cuysmgukyikxdwsladeo.supabase.co/functions/v1/mp-webhook`

    const preference = {
      items: [
        {
          id: body.order_id,
          title: body.items_description || `Pedido Store Fanatic #${body.order_id.slice(0, 8)}`,
          quantity: 1,
          unit_price: Number(body.grand_total.toFixed(2)),
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: body.payer.first_name || 'Cliente',
        surname: body.payer.last_name || '',
        email: body.payer.email,
        ...(body.payer.cpf
          ? { identification: { type: 'CPF', number: body.payer.cpf.replace(/\D/g, '') } }
          : {}),
      },
      back_urls: body.back_urls,
      // auto_return só funciona com back_urls HTTPS — omitir para compatibilidade local/produção
      external_reference: body.order_id,
      notification_url: notificationUrl,
      statement_descriptor: 'Store Fanatic',
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }

    const res = await fetch(`${MP_API}/checkout/preferences`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MERCADO_PAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('MP preference error:', errText)
      return new Response(
        JSON.stringify({ error: 'Failed to create preference', details: errText }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({
        preference_id: data.id,
        init_point: data.init_point,
        sandbox_init_point: data.sandbox_init_point,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('create-payment error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
