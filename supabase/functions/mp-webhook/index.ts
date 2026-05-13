import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

serve(async (req) => {
  try {
    const body = await req.json()
    console.log('Webhook received:', JSON.stringify(body))

    const { type, data } = body

    // Mercado Pago envia diferentes tipos de notificação
    if (type === 'payment' || type === 'merchant_order') {
      const paymentId = type === 'payment' ? data.id : data.id
      
      // Buscar detalhes do pagamento na API do MP
      const mpToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || ''
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${mpToken}` },
      })

      if (!mpRes.ok) {
        console.error('Failed to fetch payment details from MP')
        return new Response('OK', { status: 200 })
      }

      const payment = await mpRes.json()
      const orderId = payment.external_reference

      if (!orderId) {
        console.error('No external_reference found')
        return new Response('OK', { status: 200 })
      }

      // Atualizar status do pedido baseado no status do pagamento
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

      let orderStatus = 'aguardando_pagamento'
      if (payment.status === 'approved') {
        orderStatus = 'pago'
      } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
        orderStatus = 'cancelado'
      } else if (payment.status === 'refunded') {
        orderStatus = 'cancelado'
      }

      const { error } = await supabase
        .from('orders')
        .update({
          status: orderStatus,
          payment_id: paymentId.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)

      if (error) {
        console.error('Failed to update order:', error)
      } else {
        console.log(`Order ${orderId} updated to ${orderStatus}`)

        // Registrar no log
        await supabase.from('activity_logs').insert({
          action: `payment_${payment.status}`,
          entity_type: 'order',
          entity_id: orderId,
          details: { payment_id: paymentId, mp_status: payment.status },
        })

        // Atualizar payment_records
        await supabase.from('payment_records').upsert({
          order_id: orderId,
          mp_payment_id: paymentId.toString(),
          mp_status: payment.status,
          mp_status_detail: payment.status_detail,
          payment_method: payment.payment_method_id,
        })
      }
    }

    return new Response('OK', { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response('OK', { status: 200 })
  }
})
