-- Tabela de feedback de pedidos
CREATE TABLE IF NOT EXISTS public.order_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id)
);

-- RLS
ALTER TABLE public.order_feedback ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver e criar feedback (sem login)
CREATE POLICY "feedback_select" ON public.order_feedback
  FOR SELECT USING (true);

CREATE POLICY "feedback_insert" ON public.order_feedback
  FOR INSERT WITH CHECK (true);
