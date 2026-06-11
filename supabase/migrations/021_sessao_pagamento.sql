-- Pagamento de sessões (Pix / registro manual)
ALTER TABLE public.sessoes
  ADD COLUMN IF NOT EXISTS status_pagamento text DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS pago_em timestamptz,
  ADD COLUMN IF NOT EXISTS pagamento_referencia text,
  ADD COLUMN IF NOT EXISTS pagamento_pix_copia_cola text,
  ADD COLUMN IF NOT EXISTS pagamento_link text;

COMMENT ON COLUMN public.sessoes.status_pagamento IS 'pendente | pago | cancelado';
COMMENT ON COLUMN public.sessoes.forma_pagamento IS 'pix | dinheiro | cartao | transferencia | outro';
COMMENT ON COLUMN public.sessoes.pagamento_referencia IS 'ID externo (ex.: Mercado Pago payment id)';
