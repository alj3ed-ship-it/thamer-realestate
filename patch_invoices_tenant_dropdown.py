import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

old1 = """    customer_cr_number: '',
    customer_city: '',
    customer_address: '',
    items: [emptyItem()],"""
new1 = """    customer_cr_number: '',
    customer_city: '',
    customer_address: '',
    customer_id_number: '',
    items: [emptyItem()],"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

old2 = "  const [organizations, setOrganizations] = useState([])"
new2 = "  const [organizations, setOrganizations] = useState([])\n  const [tenants, setTenants] = useState([])"
assert content.count(old2) == 1
content = content.replace(old2, new2)

old3 = """    const [org, inv] = await Promise.all([
      supabase.from('organizations').select('id, name, vat_number, cr_number, address').order('name'),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(20),
    ])
    setOrganizations(org.data || [])
    setInvoices(inv.data || [])"""
new3 = """    const [org, inv, ten] = await Promise.all([
      supabase.from('organizations').select('id, name, vat_number, cr_number, address').order('name'),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('tenants').select('id, full_name, name, official_name, vat_number, cr_number, address, id_number').order('full_name'),
    ])
    setOrganizations(org.data || [])
    setInvoices(inv.data || [])
    setTenants(ten.data || [])"""
assert content.count(old3) == 1
content = content.replace(old3, new3)

old4 = "  const subtotal = form.items.reduce((s, it) => s + lineAmounts(it).lineTotal, 0)"
new4 = """  function handleSelectTenant(tenantId) {
    if (!tenantId) return
    const t = tenants.find(x => x.id === tenantId)
    if (!t) return
    setForm(f => ({
      ...f,
      customer_name: t.official_name || t.full_name || t.name || '',
      customer_vat_number: t.vat_number || '',
      customer_cr_number: t.cr_number || '',
      customer_address: t.address || '',
      customer_id_number: t.id_number || '',
    }))
  }

  const subtotal = form.items.reduce((s, it) => s + lineAmounts(it).lineTotal, 0)"""
assert content.count(old4) == 1
content = content.replace(old4, new4)

old5 = """      customer_cr_number: form.customer_cr_number || null,
      customer_city: form.customer_city || null,
      customer_address: form.customer_address || null,
      subtotal: Math.round(subtotal * 100) / 100,"""
new5 = """      customer_cr_number: form.customer_cr_number || null,
      customer_city: form.customer_city || null,
      customer_address: form.customer_address || null,
      customer_id_number: form.customer_id_number || null,
      subtotal: Math.round(subtotal * 100) / 100,"""
count5 = content.count(old5)
assert count5 == 2, f"expected 2 occurrences, found {count5}"
content = content.replace(old5, new5)

old6 = """      customer_cr_number: inv.customer_cr_number || '',
      customer_city: inv.customer_city || '',
      customer_address: inv.customer_address || '',
      items: (items"""
new6 = """      customer_cr_number: inv.customer_cr_number || '',
      customer_city: inv.customer_city || '',
      customer_address: inv.customer_address || '',
      customer_id_number: inv.customer_id_number || '',
      items: (items"""
assert content.count(old6) == 1
content = content.replace(old6, new6)

old7 = """            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
              <div>
                <label style={labelStyle}>اسم العميل *</label>"""
new7 = """            <div style={{ marginBottom: 14, maxWidth: 340 }}>
              <label style={labelStyle}>اختيار مستأجر (تعبئة تلقائية)</label>
              <select defaultValue="" onChange={e => handleSelectTenant(e.target.value)} style={inputStyle}>
                <option value="">— اختر مستأجر —</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.official_name || t.full_name || t.name || '(بدون اسم)'}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 22 }}>
              <div>
                <label style={labelStyle}>اسم العميل *</label>"""
assert content.count(old7) == 1
content = content.replace(old7, new7)

old8 = """              <div>
                <label style={labelStyle}>عنوان العميل</label>
                <input type="text" value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} style={inputStyle} />
              </div>
            </div>"""
new8 = """              <div>
                <label style={labelStyle}>عنوان العميل</label>
                <input type="text" value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>رقم الهوية / السجل المدني</label>
                <input type="text" value={form.customer_id_number} onChange={e => setForm(f => ({ ...f, customer_id_number: e.target.value }))} style={inputStyle} />
              </div>
            </div>"""
assert content.count(old8) == 1
content = content.replace(old8, new8)

path.write_text(content, encoding="utf-8")
print("Patched src/Invoices.jsx successfully")