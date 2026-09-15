-- Permanent audit trail of every REAL invoice submission attempt to ZATCA
-- (Reporting or Clearance API), across every environment. Never deleted by
-- the app — this is the compliance record of what was actually sent to the
-- tax authority and when.
--
-- Already applied directly to the Supabase project via MCP; this file is
-- the local record of that migration (same convention as
-- zatca_compliance_columns_migration.sql).

create table if not exists public.zatca_submission_log (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id),
  submission_type text not null check (submission_type in ('reporting', 'clearance')),
  environment text not null check (environment in ('sandbox', 'simulation', 'production')),
  submitted_at timestamptz not null default now(),
  status text not null check (status in ('success', 'failed')),
  response_summary jsonb,
  submitted_by text,
  created_at timestamptz not null default now()
);

comment on table public.zatca_submission_log is 'سجل تدقيق دائم لكل محاولة إرسال فعلي (Reporting/Clearance) لفاتورة لهيئة الزكاة والضريبة — لا يُحذف، يوثّق البيئة (sandbox/simulation/production) لكل عملية.';

create index if not exists zatca_submission_log_invoice_id_idx on public.zatca_submission_log (invoice_id);

alter table public.zatca_submission_log enable row level security;

-- Same admin pattern as every other table in this project (see letters,
-- payment_installments_history): the app has no per-user auth, only a
-- shared "authenticated" role for the admin UI.
create policy zatca_submission_log_admin_read on public.zatca_submission_log
  for select to public
  using (auth.role() = 'authenticated');

-- This project's default privileges do NOT grant service_role basic DML on
-- new tables (confirmed: service_role had only REFERENCES/TRIGGER/TRUNCATE
-- on existing tables) — RLS alone is not enough here, matching the same
-- gap fixed before by grant_letters_table_permissions and
-- grant_privileges_payment_installments_history. No UPDATE/DELETE grant to
-- any role anywhere, by design: this log is append-only.
grant select, insert on public.zatca_submission_log to service_role;
grant select on public.zatca_submission_log to authenticated;
