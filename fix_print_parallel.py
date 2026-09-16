import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

old = """  async function handlePrintInvoice(inv, mode = 'print') {
    const { data: items } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('sort_order')
    let qrDataUrl = null
    if (inv.qr_code) {
      try { qrDataUrl = await QRCode.toDataURL(inv.qr_code, { width: 160 }) } catch {}
    }
    const organization = organizations.find(o => o.id === inv.organization_id) || null
    const { data: settingsRow } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', inv.organization_id)
      .maybeSingle()
    setPrintingInvoice({ invoice: inv, items: items || [], qrDataUrl, organization, orgSettings: settingsRow || null, mode })
  }"""

new = """  async function handlePrintInvoice(inv, mode = 'print') {
    const organization = organizations.find(o => o.id === inv.organization_id) || null
    const [itemsResult, qrDataUrl, settingsResult] = await Promise.all([
      supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('sort_order'),
      inv.qr_code ? QRCode.toDataURL(inv.qr_code, { width: 160 }).catch(() => null) : Promise.resolve(null),
      supabase.from('organization_settings').select('*').eq('organization_id', inv.organization_id).maybeSingle(),
    ])
    const items = itemsResult.data
    const settingsRow = settingsResult.data
    setPrintingInvoice({ invoice: inv, items: items || [], qrDataUrl, organization, orgSettings: settingsRow || null, mode })
  }"""

assert content.count(old) == 1, f"expected 1 match, found {content.count(old)}"
content = content.replace(old, new)
path.write_text(content, encoding="utf-8")
print("Patched successfully.")
