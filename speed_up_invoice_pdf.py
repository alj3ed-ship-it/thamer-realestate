# -*- coding: utf-8 -*-
import io

path = r"api\generate-invoice-pdf.js"

with io.open(path, "r", encoding="utf-8") as f:
    content = f.read()

# --- التعديل الأول: توازي الاستعلامات الأربعة بدل التسلسل ---
old_queries = """  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()
  const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('sort_order')
  const { data: organization } = await supabase.from('organizations').select('*').eq('id', invoice.organization_id).maybeSingle()
  const { data: orgSettings } = await supabase.from('organization_settings').select('*').eq('organization_id', invoice.organization_id).maybeSingle()"""

assert content.count(old_queries) == 1, f"عدد تطابقات الاستعلامات: {content.count(old_queries)}"

new_queries = """  const { data: invoice } = await supabase.from('invoices').select('*').eq('id', invoiceId).single()

  const [itemsRes, organizationRes, orgSettingsRes] = await Promise.all([
    supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('sort_order'),
    supabase.from('organizations').select('*').eq('id', invoice.organization_id).maybeSingle(),
    supabase.from('organization_settings').select('*').eq('organization_id', invoice.organization_id).maybeSingle(),
  ])
  const { data: items } = itemsRes
  const { data: organization } = organizationRes
  const { data: orgSettings } = orgSettingsRes"""

content = content.replace(old_queries, new_queries)

# --- التعديل الثاني: تسريع انتظار Puppeteer ---
old_wait = "await page.setContent(html, { waitUntil: 'networkidle0' })"
assert content.count(old_wait) == 1, f"عدد تطابقات waitUntil: {content.count(old_wait)}"

new_wait = "await page.setContent(html, { waitUntil: 'domcontentloaded' })"
content = content.replace(old_wait, new_wait)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("تم تسريع توليد PDF الفواتير بنجاح ✅ (توازي الاستعلامات + تقليل زمن الانتظار)")
