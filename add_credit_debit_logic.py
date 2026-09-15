import pathlib

path = pathlib.Path("src/Invoices.jsx")
content = path.read_text(encoding="utf-8")

# 1) إضافة state جديد لنموذج الإشعار
old_state = "const [zatcaChecks, setZatcaChecks] = useState({})\n"
new_state = (
    "const [zatcaChecks, setZatcaChecks] = useState({})\n"
    "  const [noteForm, setNoteForm] = useState(null) // { invoice, noteType, reason, items }\n"
    "  const [noteSaving, setNoteSaving] = useState(false)\n"
    "  const [noteError, setNoteError] = useState('')\n"
    "  const [noteResult, setNoteResult] = useState(null)\n"
)
assert content.count(old_state) == 1
content = content.replace(old_state, new_state)

# 2) دالة فتح النموذج (تعبّي البنود من الفاتورة الأصلية) + دالة الإرسال
old_handler = "  async function handleZatcaCheck(inv) {"
new_handler = '''  async function handleOpenNoteForm(inv, noteType) {
    setNoteError(''); setNoteResult(null)
    const { data: items, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('sort_order')
    if (error) { setNoteError(error.message); return }
    setNoteForm({
      invoice: inv,
      noteType,
      reason: '',
      items: (items || []).map(it => ({
        key: Math.random().toString(36).slice(2),
        description: it.description || '',
        quantity: String(it.quantity ?? '1'),
        unit_price: String(it.unit_price ?? ''),
      })),
    })
  }

  function updateNoteItem(key, field, value) {
    setNoteForm(f => ({
      ...f,
      items: f.items.map(it => it.key === key ? { ...it, [field]: value } : it)
    }))
  }

  function removeNoteItem(key) {
    setNoteForm(f => ({ ...f, items: f.items.length > 1 ? f.items.filter(it => it.key !== key) : f.items }))
  }

  async function handleSubmitNote() {
    if (!noteForm) return
    setNoteError(''); setNoteResult(null)
    const validItems = noteForm.items.filter(it => it.description.trim() && Number(it.unit_price) > 0)
    if (validItems.length === 0) { setNoteError('يرجى إبقاء بند واحد على الأقل ببيان وسعر صحيحين'); return }
    if (!noteForm.reason.trim()) { setNoteError('يرجى كتابة سبب الإشعار'); return }

    setNoteSaving(true)
    try {
      const inv = noteForm.invoice
      const organization = organizations.find(o => o.id === inv.organization_id) || null
      const response = await fetch('/api/zatca-credit-debit-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization,
          originalInvoice: {
            invoice_number: inv.invoice_number,
            customer_name: inv.customer_name,
            customer_vat_number: inv.customer_vat_number,
            customer_cr_number: inv.customer_cr_number,
            customer_city: inv.customer_city,
            customer_address: inv.customer_address,
          },
          noteType: noteForm.noteType,
          reason: noteForm.reason,
          items: validItems.map(it => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            vat_rate: VAT_RATE,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'فشل إصدار الإشعار')

      const qrDataUrl = await QRCode.toDataURL(data.qr, { width: 220 })
      setNoteResult({ ...data, qrDataUrl })

      if (data.compliance.passed) {
        const subtotal = validItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0)
        const vatAmount = subtotal * (VAT_RATE / 100)
        await supabase.from('invoices').insert([{
          organization_id: inv.organization_id || null,
          invoice_number: `${noteForm.noteType === 'debit_note' ? 'DN' : 'CN'}-${Date.now()}`,
          invoice_type: inv.invoice_type,
          document_type: noteForm.noteType,
          parent_invoice_id: inv.id,
          status: 'cleared',
          compliance_status: data.compliance.status,
          qr_code: data.qr,
          invoice_hash: data.invoice_hash,
          issue_date: new Date().toISOString().slice(0, 10),
          customer_name: inv.customer_name,
          customer_vat_number: inv.customer_vat_number,
          customer_cr_number: inv.customer_cr_number,
          customer_city: inv.customer_city,
          customer_address: inv.customer_address,
          customer_id_number: inv.customer_id_number,
          subtotal: Math.round(subtotal * 100) / 100,
          vat_amount: Math.round(vatAmount * 100) / 100,
          total_amount: Math.round((subtotal + vatAmount) * 100) / 100,
        }])
        fetchAll()
      }
    } catch (err) {
      setNoteError(err.message)
    } finally {
      setNoteSaving(false)
    }
  }

  async function handleZatcaCheck(inv) {'''
assert content.count(old_handler) == 1
content = content.replace(old_handler, new_handler)

path.write_text(content, encoding="utf-8")
print("تم تعديل الجزء المنطقي (state + دوال) بنجاح ✅")