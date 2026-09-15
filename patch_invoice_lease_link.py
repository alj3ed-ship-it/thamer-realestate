import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

# 1) add lease_id to emptyForm
old1 = """    customer_id_number: '',
    items: [emptyItem()],"""
new1 = """    customer_id_number: '',
    lease_id: '',
    items: [emptyItem()],"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) add leases + selectedTenantId state
old2 = "  const [tenantSearchText, setTenantSearchText] = useState('')"
new2 = """  const [tenantSearchText, setTenantSearchText] = useState('')
  const [leases, setLeases] = useState([])
  const [selectedTenantId, setSelectedTenantId] = useState('')"""
assert content.count(old2) == 1
content = content.replace(old2, new2)

# 3) fetch leases alongside everything else
old3 = """    const [org, inv, ten] = await Promise.all([
      supabase.from('organizations').select('id, name, vat_number, cr_number, address').order('name'),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('tenants').select('id, full_name, name, official_name, vat_number, cr_number, address, id_number').order('full_name'),
    ])
    setOrganizations(org.data || [])
    setInvoices(inv.data || [])
    setTenants(ten.data || [])"""
new3 = """    const [org, inv, ten, lea] = await Promise.all([
      supabase.from('organizations').select('id, name, vat_number, cr_number, address').order('name'),
      supabase.from('invoices').select('*').order('created_at', { ascending: false }).limit(20),
      supabase.from('tenants').select('id, full_name, name, official_name, vat_number, cr_number, address, id_number').order('full_name'),
      supabase.from('leases').select('id, tenant_id, lease_number, status'),
    ])
    setOrganizations(org.data || [])
    setInvoices(inv.data || [])
    setTenants(ten.data || [])
    setLeases(lea.data || [])"""
assert content.count(old3) == 1
content = content.replace(old3, new3)

# 4) track selected tenant + reset lease when tenant changes
old4 = """  function handleSelectTenant(tenantId) {
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
  }"""
new4 = """  function handleSelectTenant(tenantId) {
    if (!tenantId) return
    const t = tenants.find(x => x.id === tenantId)
    if (!t) return
    setSelectedTenantId(tenantId)
    setForm(f => ({
      ...f,
      customer_name: t.official_name || t.full_name || t.name || '',
      customer_vat_number: t.vat_number || '',
      customer_cr_number: t.cr_number || '',
      customer_address: t.address || '',
      customer_id_number: t.id_number || '',
      lease_id: '',
    }))
  }"""
assert content.count(old4) == 1
content = content.replace(old4, new4)

# 5) include lease_id in both save/update payloads
old5 = """      customer_id_number: form.customer_id_number || null,
      subtotal: Math.round(subtotal * 100) / 100,"""
new5 = """      customer_id_number: form.customer_id_number || null,
      lease_id: form.lease_id || null,
      subtotal: Math.round(subtotal * 100) / 100,"""
count5 = content.count(old5)
assert count5 == 2, f"expected 2 occurrences, found {count5}"
content = content.replace(old5, new5)

# 6) load lease_id (and matching tenant, for filtering) when editing a draft
old6 = """      customer_id_number: inv.customer_id_number || '',
      items: (items"""
new6 = """      customer_id_number: inv.customer_id_number || '',
      lease_id: inv.lease_id || '',
      items: (items"""
assert content.count(old6) == 1
content = content.replace(old6, new6)

old6b = """    setEditingInvoiceId(inv.id)
    setEditingInvoiceNumber(inv.invoice_number)
    setTenantSearchText('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }"""
new6b = """    const linkedLease = leases.find(l => l.id === inv.lease_id)
    setSelectedTenantId(linkedLease?.tenant_id || '')
    setEditingInvoiceId(inv.id)
    setEditingInvoiceNumber(inv.invoice_number)
    setTenantSearchText('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }"""
assert content.count(old6b) == 1
content = content.replace(old6b, new6b)

# 7) reset selectedTenantId on "new invoice"
old7 = """  function handleNewInvoice() {
    setFormError(''); setFormSuccess('')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
  }"""
new7 = """  function handleNewInvoice() {
    setFormError(''); setFormSuccess('')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
    setSelectedTenantId('')
  }"""
assert content.count(old7) == 1
content = content.replace(old7, new7)

# 8) add the "اختيار العقد" dropdown right after the tenant search field
old8 = """              <datalist id="tenant-options">
                {tenants.map(t => (
                  <option key={t.id} value={t.official_name || t.full_name || t.name || '(بدون اسم)'} />
                ))}
              </datalist>
            </div>"""
new8 = """              <datalist id="tenant-options">
                {tenants.map(t => (
                  <option key={t.id} value={t.official_name || t.full_name || t.name || '(بدون اسم)'} />
                ))}
              </datalist>
            </div>
            <div style={{ marginBottom: 14, maxWidth: 340 }}>
              <label style={labelStyle}>اختيار العقد (اختياري — لربط الفاتورة بربعها بصفحة الإقرارات)</label>
              <select
                value={form.lease_id}
                onChange={e => setForm(f => ({ ...f, lease_id: e.target.value }))}
                disabled={!selectedTenantId}
                style={inputStyle}>
                <option value="">{selectedTenantId ? '— بدون عقد —' : 'اختر مستأجر أولاً'}</option>
                {leases.filter(l => l.tenant_id === selectedTenantId).map(l => (
                  <option key={l.id} value={l.id}>{l.lease_number || '(بدون رقم عقد)'}</option>
                ))}
              </select>
            </div>"""
assert content.count(old8) == 1
content = content.replace(old8, new8)

path.write_text(content, encoding="utf-8")
print("Patched src/Invoices.jsx (lease link) successfully")