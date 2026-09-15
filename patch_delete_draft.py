import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

# 1) add handleDeleteDraft function right after handleNewInvoice
old1 = """  function handleNewInvoice() {
    setFormError(''); setFormSuccess('')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
  }"""
new1 = """  function handleNewInvoice() {
    setFormError(''); setFormSuccess('')
    setEditingInvoiceId(null)
    setEditingInvoiceNumber('')
    setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
    setTenantSearchText('')
  }

  async function handleDeleteDraft(inv) {
    if (inv.status !== 'draft' || isReadOnly) return
    const confirmed = window.confirm(`هل أنت متأكد من حذف المسودة رقم ${inv.invoice_number}؟ هذا الإجراء لا يمكن التراجع عنه.`)
    if (!confirmed) return

    setFormError(''); setFormSuccess('')
    const { error: itemsError } = await supabase.from('invoice_items').delete().eq('invoice_id', inv.id)
    if (itemsError) { setFormError(itemsError.message); return }

    const { error: invError } = await supabase.from('invoices').delete().eq('id', inv.id)
    if (invError) { setFormError(invError.message); return }

    if (editingInvoiceId === inv.id) {
      setEditingInvoiceId(null)
      setEditingInvoiceNumber('')
      setForm(f => ({ ...emptyForm(), organization_id: f.organization_id }))
      setTenantSearchText('')
    }
    setFormSuccess('تم حذف المسودة بنجاح')
    fetchAll()
  }"""
assert content.count(old1) == 1
content = content.replace(old1, new1)

# 2) add a delete button next to the ZATCA check button, for draft rows only
old2 = """                            {zatcaChecks[inv.id]?.loading ? 'جاري الفحص...' : '🔍 فحص/توليد QR (تجريبي)'}
                          </button>

                          {zatcaChecks[inv.id]?.error && ("""
new2 = """                            {zatcaChecks[inv.id]?.loading ? 'جاري الفحص...' : '🔍 فحص/توليد QR (تجريبي)'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(inv)}
                            style={{
                              padding: '6px 12px', fontSize: 12, whiteSpace: 'nowrap',
                              cursor: 'pointer', borderRadius: 6, border: '1px solid #e74c3c',
                              background: '#fff', color: '#e74c3c', fontWeight: 700,
                            }}>
                            🗑 حذف المسودة
                          </button>

                          {zatcaChecks[inv.id]?.error && ("""
assert content.count(old2) == 1
content = content.replace(old2, new2)

path.write_text(content, encoding="utf-8")
print("Patched src/Invoices.jsx (delete draft) successfully")