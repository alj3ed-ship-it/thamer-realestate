-- Adds columns needed by the ZATCA sandbox compliance-check feature on the
-- Invoices page. qr_code already exists on public.invoices (used to store
-- the base64 TLV QR payload) — only compliance_status and invoice_hash are
-- new. The pre-existing zatca_hash/zatca_uuid columns are left untouched;
-- they are unused elsewhere in the app and out of scope for this change.

alter table public.invoices
  add column if not exists compliance_status text,
  add column if not exists invoice_hash text;

comment on column public.invoices.compliance_status is 'ZATCA sandbox compliance-check result status (e.g. PASS, WARNING, ERROR)';
comment on column public.invoices.invoice_hash is 'SHA-256 hash of the signed ZATCA invoice XML returned by the sandbox compliance check';
