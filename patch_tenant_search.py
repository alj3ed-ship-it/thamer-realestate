import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

# 1) add tenantSearchText state right after tenants state
old1 = "  const [tenants, setTenants] = useState([])"
new1 = "  const [tenants, setTenants] = useState([])\n  const [tenantSearchText, setTenantSearchText] = useState('')"
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) replace the plain <select> dropdown with a searchable input + datalist
old2 = """            <div style={{ marginBottom: 14, maxWidth: 340 }}>
              <label style={labelStyle}>اختيار مستأجر (تعبئة تلقائية)</label>
              <select defaultValue="" onChange={e => handleSelectTenant(e.target.value)} style={inputStyle}>
                <option value="">— اختر مستأجر —</option>
                {tenants.map(t => (
                  <option key={t.id} value={t.id}>{t.official_name || t.full_name || t.name || '(بدون اسم)'}</option>
                ))}
              </select>
            </div>"""
new2 = """            <div style={{ marginBottom: 14, maxWidth: 340 }}>
              <label style={labelStyle}>اختيار مستأجر (اكتب للبحث)</label>
              <input
                type="text"
                list="tenant-options"
                value={tenantSearchText}
                onChange={e => {
                  const val = e.target.value
                  setTenantSearchText(val)
                  const match = tenants.find(t => (t.official_name || t.full_name || t.name || '') === val)
                  if (match) handleSelectTenant(match.id)
                }}
                placeholder="اكتب اسم المستأجر..."
                style={inputStyle}
              />
              <datalist id="tenant-options">
                {tenants.map(t => (
                  <option key={t.id} value={t.official_name || t.full_name || t.name || '(بدون اسم)'} />
                ))}
              </datalist>
            </div>"""
assert content.count(old2) == 1
content = content.replace(old2, new2)

# 3) reset the search text on "new invoice"
old3 = """  function handleNewInvoice() {
    setFormError(''); setFormSuccess('')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
  }"""
new3 = """  function handleNewInvoice() {
    setFormError(''); setFormSuccess('')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
  }"""
assert content.count(old3) == 1
content = content.replace(old3, new3)

# 4) reset search text after saving a new draft
old4 = """    setFormSuccess('تم حفظ الفاتورة كمسودة بنجاح')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    fetchAll()
  }"""
new4 = """    setFormSuccess('تم حفظ الفاتورة كمسودة بنجاح')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
    fetchAll()
  }"""
assert content.count(old4) == 1
content = content.replace(old4, new4)

# 5) reset search text after updating a draft
old5 = """    setFormSuccess('تم تحديث المسودة بنجاح')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    fetchAll()
  }"""
new5 = """    setFormSuccess('تم تحديث المسودة بنجاح')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
    fetchAll()
  }"""
assert content.count(old5) == 1
content = content.replace(old5, new5)

# 6) reset search text when opening an existing draft for editing (its customer data
# came from the saved invoice row, not necessarily a matching tenant record)
old6 = """    setEditingInvoiceId(inv.id)
    setEditingInvoiceNumber(inv.invoice_number)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }"""
new6 = """    setEditingInvoiceId(inv.id)
    setEditingInvoiceNumber(inv.invoice_number)
    setTenantSearchText('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }"""
assert content.count(old6) == 1
content = content.replace(old6, new6)

path.write_text(content, encoding="utf-8")
print("Patched src/Invoices.jsx (searchable tenant field) successfully")